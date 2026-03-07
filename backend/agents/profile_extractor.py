"""
Profile Extractor Agent — runs silently on every chat message.
Uses Gemini structured output to extract user profile fields from natural conversation.
Never overwrites existing profile fields with None — only updates new info.
"""
import os
from functools import lru_cache
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import HumanMessage, SystemMessage
from backend.models.user_profile import UserProfile, UserProfileDelta


@lru_cache(maxsize=1)
def _get_extractor_llm() -> ChatVertexAI:
    """Cached LLM instance — created once, reused for every extraction call."""
    return ChatVertexAI(
        model="gemini-2.0-flash-lite",
        project=os.environ.get("GOOGLE_CLOUD_PROJECT"),
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
        temperature=0,
    )

EXTRACTOR_SYSTEM_PROMPT = """You are a silent profile extraction system for a health insurance platform.
Your job is to extract personal, financial, and health information from user messages.

Extract ONLY information that is explicitly stated or very clearly implied. Do NOT guess.
Return a JSON object with only the fields you found. Omit fields you couldn't determine.

Fields to extract:
- age: integer (years)
- salary: integer (annual euros — infer from job title if reasonable: e.g. "senior engineer" → 70000-80000)
- family_size: integer (1=single, 2=couple, 3=couple+1child, 4=couple+2children, etc.)
- health_priorities: list of strings from: ["gp", "physio", "maternity", "dental", "mental_health",
  "consultant", "hospital", "cancer", "international", "screening", "digital_doctor", "allied_health",
  "orthopaedic", "cardiac", "day_case"] — only if user mentions needing these
- has_gp_visit_card: boolean
- retirement_age: integer (when they plan to retire)
- risk_tolerance: one of "conservative", "moderate", "aggressive"
- current_plan: integer 1-5 (if user mentions their current plan)
- location: string (city/country mentioned)
- is_pregnant: boolean (true only if clearly stated)
- is_student: boolean
- occupation: string (job title as stated)

Return pure JSON only. No explanation. Example:
{"age": 32, "is_pregnant": true, "health_priorities": ["maternity"]}

If nothing can be extracted, return: {}"""


def extract_profile_delta(message: str, current_profile: UserProfile) -> UserProfileDelta:
    """
    Extract any profile information from a user message.
    Returns a UserProfileDelta with only newly found fields.
    """
    llm = _get_extractor_llm()

    context = f"Current known profile: {current_profile.model_dump(exclude_none=True)}"
    messages = [
        SystemMessage(content=EXTRACTOR_SYSTEM_PROMPT),
        HumanMessage(content=f"{context}\n\nNew user message: {message}"),
    ]

    response = llm.invoke(messages)
    raw = response.content.strip()

    # Strip markdown code blocks if present
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    raw = raw.strip()

    import json
    try:
        data = json.loads(raw) if raw and raw != "{}" else {}
        return UserProfileDelta(**data)
    except Exception:
        return UserProfileDelta()


def update_profile_from_message(message: str, current_profile: UserProfile) -> tuple[UserProfile, UserProfileDelta, bool]:
    """
    Extract profile delta from message and merge into current profile.
    Returns (updated_profile, delta, was_updated).
    """
    delta = extract_profile_delta(message, current_profile)
    delta_data = delta.model_dump(exclude_none=True)

    if not delta_data:
        return current_profile, delta, False

    updated = current_profile.merge(delta)
    return updated, delta, True
