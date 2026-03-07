"""
Pension Agent — handles pension questions using deterministic calculation tools.
LLM only handles conversation; all numbers come from pure Python tools.
"""
import os
from functools import lru_cache
from langchain_google_vertexai import ChatVertexAI
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, AIMessage
from backend.tools.pension_tools import (
    calculate_pension,
    get_lifestyle_bucket,
    latte_factor,
    peer_benchmark,
)

PENSION_SYSTEM = """You are Futuro's pension advisor — warm, clear, and encouraging.
You help users understand their retirement outlook using real Irish pension rules.

Key facts you know:
- Irish state pension (2025): €13,172/year (€1,097/month) for full contributory
- Tax relief on contributions: 20% if income ≤ €40k, 40% if above — this is a BIG benefit
- PRSC age-related contribution limits: 20s=15%, 30s=20%, 40s=25%, 50s=30%, 55-59=35%, 60+=40%
- Always use calculate_pension tool for any numbers — never estimate in your head

Your style:
- Make retirement feel real and achievable, not abstract
- Use lifestyle comparisons (what does €2,400/month buy you in retirement?)
- Highlight the power of starting early or small increases
- Be encouraging without being pushy

When a user asks about pension:
1. Call calculate_pension with their details
2. Call get_lifestyle_bucket to translate income into a lifestyle description
3. Call peer_benchmark to compare them to peers
4. Optionally call latte_factor to show the cost of small contribution increases"""

TOOLS = [calculate_pension, get_lifestyle_bucket, latte_factor, peer_benchmark]


@lru_cache(maxsize=1)
def _get_pension_agent():
    """Cached ReAct agent — built once, reused across requests."""
    llm = ChatVertexAI(
        model="gemini-2.0-flash",
        project=os.environ.get("GOOGLE_CLOUD_PROJECT"),
        location=os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
        temperature=0.3,
    )
    return create_react_agent(llm, TOOLS, prompt=PENSION_SYSTEM)


def run_pension_agent(message: str, user_profile: dict) -> dict:
    """Run the pension agent and return structured response."""
    agent = _get_pension_agent()

    full_message = f"User profile: {user_profile}\n\nUser: {message}"
    result = agent.invoke({"messages": [HumanMessage(content=full_message)]})

    messages = result.get("messages", [])
    response_text = "I couldn't calculate that. Please try again."
    for msg in reversed(messages):
        if isinstance(msg, AIMessage) and msg.content:
            content = msg.content
            # Gemini 2.5 returns list of content blocks; extract text
            if isinstance(content, list):
                texts = [b["text"] for b in content if isinstance(b, dict) and b.get("type") == "text"]
                content = "\n".join(texts)
            if content.strip():
                response_text = content
                break

    return {"response": response_text}


def calculate_pension_direct(
    age: int,
    salary: int,
    contribution_rate: float,
    retirement_age: int,
    risk: str = "moderate",
) -> dict:
    """
    Direct pension calculation (no LLM) — called by the /api/pension/calculate endpoint.
    Returns full calculation + lifestyle bucket + peer comparison.
    """
    from backend.tools.pension_tools import (
        calculate_pension as calc_fn,
        get_lifestyle_bucket as bucket_fn,
        peer_benchmark as peer_fn,
    )

    pension_data = calc_fn.func(age, salary, contribution_rate, retirement_age, risk)
    lifestyle = bucket_fn.func(pension_data["total_monthly_income"])
    peer = peer_fn.func(age, salary, contribution_rate)
    latte = latte_factor.func(salary, 1.0)  # What does 1% more cost?

    return {
        **pension_data,
        "lifestyle_bucket": lifestyle,
        "peer_comparison": peer,
        "latte_factor_1pct": latte,
    }
