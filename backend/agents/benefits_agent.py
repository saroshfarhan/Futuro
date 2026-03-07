"""
Benefits Agent — answers health insurance questions using plan data tools.
Uses LangGraph ReAct agent with Gemini. All benefit lookups are deterministic tool calls.
"""
import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from langchain_core.messages import HumanMessage, AIMessage
from backend.tools.plan_tools import (
    lookup_benefit,
    score_plan,
    recommend_plan,
    compare_two_plans,
    search_plan_benefits,
    get_plans_overview,
)
from backend.tools.action_tools import draft_claim, draft_appointment

BENEFITS_SYSTEM = """You are Futuro, a friendly and knowledgeable health insurance assistant for an Irish Life Health platform.
You help employees understand their health insurance cover through natural, warm conversation.

You have access to 5 health insurance plans (Plan 1=Basic through Plan 5=Premium) with Irish Life Health.
Always use your tools to look up accurate benefit information — never guess coverage details.

Your personality:
- Warm, clear, and jargon-free
- Proactive: weave in natural questions to learn about the user's needs
- Helpful: suggest next steps (view plans, check pension) when relevant

When answering questions:
1. Use lookup_benefit or search_plan_benefits to get exact coverage details
2. If the user mentions wanting to file a claim, use draft_claim to prepare it for their review
3. If they want to book an appointment, use draft_appointment
4. If they ask which plan is best, use recommend_plan with their stated priorities
5. If they want to compare plans, use compare_two_plans

Sneak-in questions (weave these naturally, one at a time):
- If they ask about maternity: "Are you currently pregnant, or planning ahead?"
- If they ask about physio: "Do you have an existing condition, or is this preventive?"
- If they mention budget: "Would budget be a key factor in choosing your plan?"
- If they ask about retirement/pension: "At what age are you hoping to retire?"
- If they ask about international cover: "Do you travel frequently for work?"

Always end responses with a gentle nudge toward the Plan Picker or Pension Calculator when relevant."""


TOOLS = [
    lookup_benefit,
    score_plan,
    recommend_plan,
    compare_two_plans,
    search_plan_benefits,
    get_plans_overview,
    draft_claim,
    draft_appointment,
]


def run_benefits_agent(
    message: str,
    user_profile: dict,
    chat_history: list[dict],
    user_id: str,
) -> dict:
    """
    Run the benefits agent for a user message.
    Returns response text and any pending action (for HITL).
    """
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash",
        google_api_key=os.environ.get("GOOGLE_API_KEY"),
        temperature=0.3,
    )

    agent = create_react_agent(llm, TOOLS, prompt=BENEFITS_SYSTEM)

    # Build messages: history + context + current message
    history_text = "\n".join(
        f"{m['role'].title()}: {m['content']}" for m in chat_history[-6:]
    ) or "No prior conversation."

    full_message = f"User profile context: {user_profile}\nConversation so far:\n{history_text}\n\nUser: {message}"

    result = agent.invoke({"messages": [HumanMessage(content=full_message)]})

    # Last AIMessage with content is the final response
    import json
    messages = result.get("messages", [])
    response_text = "I'm sorry, I couldn't process that request."
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

    # Check ToolMessages for pending actions (draft_claim / draft_appointment)
    pending_action = None
    for msg in messages:
        if hasattr(msg, "content") and isinstance(msg.content, str):
            try:
                data = json.loads(msg.content)
                if isinstance(data, dict) and data.get("status") == "pending_review":
                    pending_action = data
                    break
            except Exception:
                pass

    return {
        "response": response_text,
        "pending_action": pending_action,
    }


# Alias used in tests
def get_benefits_response(message: str, user_profile, chat_history: list) -> dict:
    return run_benefits_agent(message, user_profile.model_dump(exclude_none=True), chat_history, "test")
