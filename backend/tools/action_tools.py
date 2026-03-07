"""
Action tools for filing claims and booking appointments.
These tools implement the Human-in-the-Loop (HITL) pattern:
  - draft_* functions build a pending action (no DB write)
  - submit_* functions persist to Supabase ONLY after user_confirmed=True
"""
import uuid
from datetime import datetime, date
from langchain_core.tools import tool

# In-memory pending actions store (keyed by action_id)
# In production this would be Redis or a DB pending_actions table
_pending_actions: dict[str, dict] = {}


def _generate_claim_id() -> str:
    now = datetime.now()
    return f"CLM-{now.year}-{now.strftime('%m%d')}-{str(uuid.uuid4())[:4].upper()}"


def _generate_appt_id() -> str:
    now = datetime.now()
    return f"APPT-{now.year}-{now.strftime('%m%d')}-{str(uuid.uuid4())[:4].upper()}"


@tool
def draft_claim(
    claim_type: str,
    claim_date: str,
    amount: float,
    plan_id: int,
    user_id: str,
    description: str = "",
) -> dict:
    """
    Build a structured insurance claim draft for user review.
    Does NOT persist to the database — returns a pending action for HITL confirmation.

    Args:
        claim_type: Type of claim (e.g., 'physiotherapy', 'gp_visit', 'consultant', 'dental')
        claim_date: Date of service in ISO format (YYYY-MM-DD) or natural language like '2026-03-01'
        amount: Amount being claimed in euros (e.g., 60.0)
        plan_id: User's current plan number 1-5
        user_id: User's Supabase user ID
        description: Optional additional description of the claim
    """
    action_id = str(uuid.uuid4())
    draft = {
        "action_id": action_id,
        "type": "claim",
        "status": "pending_review",
        "claim_type": claim_type,
        "claim_date": claim_date,
        "amount": round(amount, 2),
        "plan_id": plan_id,
        "user_id": user_id,
        "description": description,
        "created_at": datetime.now().isoformat(),
    }
    _pending_actions[action_id] = draft
    return {
        **draft,
        "message": (
            f"I've prepared a {claim_type} claim for €{amount:.2f} on {claim_date}. "
            "Please review the details and confirm to submit."
        ),
    }


@tool
def draft_appointment(
    appointment_type: str,
    preferred_date: str,
    user_id: str,
    notes: str = "",
) -> dict:
    """
    Build a structured appointment booking draft for user review.
    Does NOT persist to the database — returns a pending action for HITL confirmation.

    Args:
        appointment_type: Type of appointment (e.g., 'GP visit', 'physiotherapy', 'health screening', 'consultant')
        preferred_date: Preferred appointment date (YYYY-MM-DD or natural language)
        user_id: User's Supabase user ID
        notes: Any additional notes or preferences for the appointment
    """
    action_id = str(uuid.uuid4())
    draft = {
        "action_id": action_id,
        "type": "appointment",
        "status": "pending_review",
        "appointment_type": appointment_type,
        "preferred_date": preferred_date,
        "user_id": user_id,
        "notes": notes,
        "created_at": datetime.now().isoformat(),
    }
    _pending_actions[action_id] = draft
    return {
        **draft,
        "message": (
            f"I've prepared a {appointment_type} appointment request for {preferred_date}. "
            "Please review and confirm to book."
        ),
    }


def submit_claim_internal(action_id: str) -> dict:
    """
    Internal function — called by the API endpoint after user confirms.
    Persists claim to Supabase and returns confirmation.
    """
    from backend.db import get_supabase

    draft = _pending_actions.get(action_id)
    if not draft or draft["type"] != "claim":
        raise ValueError(f"No pending claim found with action_id: {action_id}")

    claim_id = _generate_claim_id()
    client = get_supabase()
    record = {
        "id": claim_id,
        "user_id": draft["user_id"],
        "claim_type": draft["claim_type"],
        "claim_date": draft["claim_date"],
        "amount": draft["amount"],
        "plan_id": draft["plan_id"],
        "description": draft.get("description", ""),
        "status": "submitted",
        "created_at": datetime.now().isoformat(),
    }
    client.table("claims").insert(record).execute()
    del _pending_actions[action_id]

    return {
        "claim_id": claim_id,
        "status": "submitted",
        "message": f"Your claim has been submitted. Reference: {claim_id}",
    }


def submit_appointment_internal(action_id: str) -> dict:
    """
    Internal function — called by the API endpoint after user confirms.
    Persists appointment to Supabase and returns confirmation number.
    """
    from backend.db import get_supabase

    draft = _pending_actions.get(action_id)
    if not draft or draft["type"] != "appointment":
        raise ValueError(f"No pending appointment found with action_id: {action_id}")

    appt_id = _generate_appt_id()
    confirmation = f"CONF-{str(uuid.uuid4())[:6].upper()}"
    client = get_supabase()
    record = {
        "id": appt_id,
        "user_id": draft["user_id"],
        "appointment_type": draft["appointment_type"],
        "preferred_date": draft["preferred_date"],
        "notes": draft.get("notes", ""),
        "confirmation_number": confirmation,
        "status": "booked",
        "created_at": datetime.now().isoformat(),
    }
    client.table("appointments").insert(record).execute()
    del _pending_actions[action_id]

    return {
        "appointment_id": appt_id,
        "confirmation_number": confirmation,
        "status": "booked",
        "message": f"Appointment booked! Confirmation: {confirmation}",
    }


def get_pending_action(action_id: str) -> dict | None:
    return _pending_actions.get(action_id)


def cancel_pending_action(action_id: str) -> bool:
    if action_id in _pending_actions:
        del _pending_actions[action_id]
        return True
    return False
