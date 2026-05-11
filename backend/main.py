"""
Futuro FastAPI backend — entry point.
Run with: uvicorn backend.main:app --reload --port 8000
"""
import os
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from backend.models.user_profile import UserProfile
from backend.agents.orchestrator import process_chat
from backend.agents.pension_agent import calculate_pension_direct
from backend.tools.plan_tools import recommend_plan
from backend.tools.action_tools import (
    submit_claim_internal,
    submit_appointment_internal,
    cancel_pending_action,
    get_pending_action,
)
from backend.data.plans import get_all_plans_summary, get_plan_summary
from backend.mlflow_logger import log_pension_calculation, log_plan_recommendation

app = FastAPI(title="Futuro API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)


# ─── Request / Response Models ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    user_id: str
    profile: Optional[dict] = None
    chat_history: Optional[list[dict]] = []


class ChatResponse(BaseModel):
    response: str
    updated_profile: dict
    profile_delta: dict
    pending_action: Optional[dict] = None
    intent: str
    latency_ms: int


class ActionConfirmRequest(BaseModel):
    action_id: str
    user_id: str
    confirmed: bool


class PensionRequest(BaseModel):
    age: int
    salary: int
    contribution_rate: float
    retirement_age: int
    risk: str = "moderate"
    user_id: Optional[str] = None


class PlanRecommendRequest(BaseModel):
    health_priorities: list[str]
    budget_sensitive: bool = False
    low_healthcare_user: bool = False
    user_id: Optional[str] = None


# ─── Chat Endpoint ────────────────────────────────────────────────────────────

@app.post("/api/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    profile = UserProfile(**(req.profile or {}))
    result = process_chat(
        message=req.message,
        user_id=req.user_id,
        current_profile=profile,
        chat_history=req.chat_history or [],
    )

    # Optionally persist profile + chat history to Supabase if env vars set
    if os.environ.get("SUPABASE_URL") and req.user_id:
        try:
            from backend.db import upsert_profile, save_chat_message
            upsert_profile(req.user_id, result["updated_profile"])
            save_chat_message(req.user_id, "user", req.message)
            save_chat_message(req.user_id, "assistant", result["response"])
        except Exception:
            pass  # Don't fail chat if DB is unavailable

    return ChatResponse(**result)


# ─── HITL Action Confirmation ─────────────────────────────────────────────────

@app.post("/api/actions/confirm")
async def confirm_action(req: ActionConfirmRequest):
    if not req.confirmed:
        cancelled = cancel_pending_action(req.action_id)
        return {"status": "cancelled", "action_id": req.action_id}

    pending = get_pending_action(req.action_id)
    if not pending:
        raise HTTPException(status_code=404, detail="Action not found or already processed")

    if pending["user_id"] != req.user_id:
        raise HTTPException(status_code=403, detail="Action does not belong to this user")

    if pending["type"] == "claim":
        result = submit_claim_internal(req.action_id)
    elif pending["type"] == "appointment":
        result = submit_appointment_internal(req.action_id)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown action type: {pending['type']}")

    return result


# ─── Plans Endpoints ──────────────────────────────────────────────────────────

@app.get("/api/plans")
async def get_plans():
    return {"plans": get_all_plans_summary()}


@app.get("/api/plans/{plan_id}")
async def get_plan(plan_id: int):
    if plan_id < 1 or plan_id > 5:
        raise HTTPException(status_code=404, detail="Plan not found")
    return get_plan_summary(plan_id)


@app.post("/api/plans/recommend")
async def recommend_plans(req: PlanRecommendRequest):
    result = recommend_plan.func(
        req.health_priorities,
        req.budget_sensitive,
        req.low_healthcare_user,
    )
    if req.user_id:
        log_plan_recommendation(
            req.user_id,
            result["recommended_plan"]["plan_id"],
            req.health_priorities,
            result["recommended_plan"]["score"],
        )
    return result


# ─── Pension Endpoints ────────────────────────────────────────────────────────

@app.post("/api/pension/calculate")
async def pension_calculate(req: PensionRequest):
    result = calculate_pension_direct(
        age=req.age,
        salary=req.salary,
        contribution_rate=req.contribution_rate,
        retirement_age=req.retirement_age,
        risk=req.risk,
    )
    if req.user_id:
        log_pension_calculation(req.user_id, req.model_dump(), result)
    return result


# ─── Claims & Appointments History ───────────────────────────────────────────

@app.get("/api/claims/{user_id}")
async def get_claims(user_id: str):
    if not os.environ.get("SUPABASE_URL"):
        return {"claims": []}
    from backend.db import get_claims
    return {"claims": get_claims(user_id)}


@app.get("/api/appointments/{user_id}")
async def get_appointments(user_id: str):
    if not os.environ.get("SUPABASE_URL"):
        return {"appointments": []}
    from backend.db import get_appointments
    return {"appointments": get_appointments(user_id)}


@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str):
    if not os.environ.get("SUPABASE_URL"):
        return {"profile": {}}
    from backend.db import get_profile
    profile = get_profile(user_id)
    return {"profile": profile or {}}


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0.0"}
