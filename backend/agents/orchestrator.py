"""
Orchestrator — routes chat messages to the right agent.
Also runs the profile extractor in parallel on every message.
Wraps everything in MLflow tracking.
"""
import os
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor
from backend.models.user_profile import UserProfile
from backend.agents.profile_extractor import update_profile_from_message
from backend.agents.benefits_agent import run_benefits_agent
from backend.agents.pension_agent import run_pension_agent
from backend.mlflow_logger import log_chat_turn

PENSION_KEYWORDS = [
    "pension", "retire", "retirement", "savings", "pot", "prsa", "prsa",
    "contribute", "contribution", "invest", "drawdown", "annuity", "lump sum",
    "how much will i have", "when can i retire", "state pension",
]

BENEFITS_KEYWORDS = [
    "cover", "covered", "claim", "plan", "physio", "gp", "doctor", "hospital",
    "maternity", "dental", "mental health", "consultant", "excess", "benefit",
    "insurance", "appointment", "book", "file", "reimburs",
]


def _detect_intent(message: str) -> str:
    """Simple keyword-based intent routing — no LLM needed."""
    msg_lower = message.lower()
    pension_hits = sum(1 for kw in PENSION_KEYWORDS if kw in msg_lower)
    benefits_hits = sum(1 for kw in BENEFITS_KEYWORDS if kw in msg_lower)

    if pension_hits > benefits_hits:
        return "pension"
    return "benefits"  # default


def process_chat(
    message: str,
    user_id: str,
    current_profile: UserProfile,
    chat_history: list[dict],
) -> dict:
    """
    Main chat processing function.
    1. Extracts profile delta in parallel with routing
    2. Routes to benefits or pension agent
    3. Logs everything to MLflow
    Returns: {response, updated_profile, profile_delta, pending_action, intent}
    """
    start_time = time.time()

    # Run profile extraction and intent detection in parallel
    with ThreadPoolExecutor(max_workers=2) as executor:
        profile_future = executor.submit(
            update_profile_from_message, message, current_profile
        )
        intent = _detect_intent(message)
        updated_profile, delta, profile_was_updated = profile_future.result()

    # Route to correct agent
    pending_action = None
    if intent == "pension":
        result = run_pension_agent(message, updated_profile.model_dump(exclude_none=True))
        response = result["response"]
    else:
        result = run_benefits_agent(
            message,
            updated_profile.model_dump(exclude_none=True),
            chat_history,
            user_id,
        )
        response = result["response"]
        pending_action = result.get("pending_action")

    latency_ms = round((time.time() - start_time) * 1000)

    # Log to MLflow
    log_chat_turn(
        user_id=user_id,
        agent=intent,
        message=message,
        response=response,
        profile_delta=delta.model_dump(exclude_none=True),
        latency_ms=latency_ms,
        tools_called=0,  # extended tracking available in verbose logs
    )

    return {
        "response": response,
        "updated_profile": updated_profile.model_dump(),
        "profile_delta": delta.model_dump(exclude_none=True),
        "pending_action": pending_action,
        "intent": intent,
        "latency_ms": latency_ms,
    }
