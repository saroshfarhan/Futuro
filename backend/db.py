import os
from supabase import create_client, Client

_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_KEY"]
        _client = create_client(url, key)
    return _client


def upsert_profile(user_id: str, profile_data: dict) -> dict:
    client = get_supabase()
    data = {"user_id": user_id, **profile_data}
    result = client.table("user_profiles").upsert(data, on_conflict="user_id").execute()
    return result.data[0] if result.data else data


def get_profile(user_id: str) -> dict | None:
    client = get_supabase()
    result = client.table("user_profiles").select("*").eq("user_id", user_id).execute()
    return result.data[0] if result.data else None


def save_chat_message(user_id: str, role: str, content: str) -> None:
    client = get_supabase()
    client.table("chat_history").insert({
        "user_id": user_id,
        "role": role,
        "content": content,
    }).execute()


def get_chat_history(user_id: str, limit: int = 20) -> list[dict]:
    client = get_supabase()
    result = (
        client.table("chat_history")
        .select("role, content, created_at")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return list(reversed(result.data or []))


def get_claims(user_id: str) -> list[dict]:
    client = get_supabase()
    result = (
        client.table("claims")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def get_appointments(user_id: str) -> list[dict]:
    client = get_supabase()
    result = (
        client.table("appointments")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []
