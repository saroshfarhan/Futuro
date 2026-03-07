"""
Deterministic plan tools — all pure Python, no LLM math.
LangChain agents call these tools to look up and score plans.
"""
import json
from langchain_core.tools import tool
from backend.data.plans import get_benefit, get_all_plans_summary, search_benefits, load_plans

# Scoring weights per health priority
PRIORITY_WEIGHTS: dict[str, dict] = {
    "physio": {
        "plans": {1: 30, 2: 30, 3: 40, 4: 40, 5: 60},
        "label": "Physiotherapy cover",
    },
    "maternity": {
        "plans": {1: 30, 2: 40, 3: 50, 4: 50, 5: 60},
        "label": "Maternity benefits",
    },
    "dental": {
        "plans": {1: 20, 2: 20, 3: 30, 4: 30, 5: 40},
        "label": "Dental cover",
    },
    "gp": {
        "plans": {1: 20, 2: 40, 3: 40, 4: 60, 5: 60},
        "label": "GP visit cover",
    },
    "mental_health": {
        "plans": {1: 30, 2: 30, 3: 40, 4: 40, 5: 50},
        "label": "Mental health support",
    },
    "consultant": {
        "plans": {1: 20, 2: 50, 3: 50, 4: 75, 5: 75},
        "label": "Consultant fees",
    },
    "hospital": {
        "plans": {1: 50, 2: 60, 3: 70, 4: 80, 5: 90},
        "label": "Private hospital cover",
    },
    "cancer": {
        "plans": {1: 50, 2: 50, 3: 60, 4: 70, 5: 80},
        "label": "Cancer treatment",
    },
    "international": {
        "plans": {1: 80, 2: 80, 3: 80, 4: 80, 5: 80},
        "label": "International emergency cover",
    },
}

# Hospital excess per plan (lower = better for frequent users)
HOSPITAL_EXCESS: dict[int, int] = {1: 200, 2: 150, 3: 75, 4: 50, 5: 50}

# Budget-friendliness score (higher tier = more expensive)
BUDGET_SCORE: dict[int, int] = {1: 100, 2: 80, 3: 60, 4: 40, 5: 20}


@tool
def lookup_benefit(plan_id: int, benefit_key: str) -> str:
    """
    Look up the exact coverage details for a specific benefit in a health insurance plan.
    Returns the coverage description from the policy document.

    Args:
        plan_id: Plan number 1-5 (1=Basic, 5=Premium)
        benefit_key: Benefit category to look up (e.g., 'gp', 'physio', 'maternity',
                     'hospital', 'consultant', 'dental', 'mental_health', 'cancer',
                     'international', 'day_case', 'screening', 'digital_doctor',
                     'allied_health', 'orthopaedic', 'excess')
    """
    rows = get_benefit(plan_id, benefit_key)
    if not rows:
        return f"No specific coverage found for '{benefit_key}' in Plan {plan_id}."
    lines = [f"**{r['benefit']}**: {r['coverage']}" for r in rows[:5]]
    return f"Plan {plan_id} — {benefit_key.title()} coverage:\n" + "\n".join(lines)


@tool
def score_plan(plan_id: int, health_priorities: list[str],
               budget_sensitive: bool = False,
               low_healthcare_user: bool = False) -> dict:
    """
    Deterministically score a health insurance plan based on a user's health priorities.
    Returns a score out of 100 with matched benefits and bullet-point reasoning.

    Args:
        plan_id: Plan number 1-5
        health_priorities: List of priority keys (e.g., ['physio', 'maternity', 'gp'])
        budget_sensitive: True if user has mentioned budget concerns
        low_healthcare_user: True if user rarely uses healthcare
    """
    if not health_priorities:
        health_priorities = ["gp", "hospital"]

    total_weight = 0
    total_score = 0
    matched_benefits = []
    reasoning = []

    for priority in health_priorities:
        if priority in PRIORITY_WEIGHTS:
            weight_data = PRIORITY_WEIGHTS[priority]
            score = weight_data["plans"].get(plan_id, 50)
            total_score += score
            total_weight += 100
            matched_benefits.append(weight_data["label"])
            reasoning.append(f"{weight_data['label']}: {score}/100")

    # Budget adjustment
    if budget_sensitive:
        budget_bonus = BUDGET_SCORE[plan_id]
        total_score += budget_bonus
        total_weight += 100
        reasoning.append(f"Budget friendliness: {budget_bonus}/100")

    # Low healthcare user prefers lower excess
    if low_healthcare_user:
        excess = HOSPITAL_EXCESS[plan_id]
        excess_score = max(0, 100 - excess // 2)
        total_score += excess_score
        total_weight += 100
        reasoning.append(f"Hospital excess (€{excess}): {excess_score}/100")

    final_score = round((total_score / total_weight) * 100) if total_weight > 0 else 50

    return {
        "plan_id": plan_id,
        "plan_name": f"Plan {plan_id}",
        "score": final_score,
        "matched_benefits": matched_benefits,
        "reasoning": reasoning,
        "hospital_excess": HOSPITAL_EXCESS[plan_id],
    }


@tool
def recommend_plan(health_priorities: list[str],
                   budget_sensitive: bool = False,
                   low_healthcare_user: bool = False) -> dict:
    """
    Score all 5 plans and return the top recommendation with comparison data.

    Args:
        health_priorities: List of priority keys (e.g., ['physio', 'maternity'])
        budget_sensitive: True if user has budget constraints
        low_healthcare_user: True if user rarely uses healthcare services
    """
    scores = []
    for plan_id in range(1, 6):
        result = score_plan.func(plan_id, health_priorities, budget_sensitive, low_healthcare_user)
        scores.append(result)

    scores.sort(key=lambda x: x["score"], reverse=True)
    best = scores[0]
    runner_up = scores[1]

    return {
        "recommended_plan": best,
        "runner_up": runner_up,
        "all_scores": scores,
        "recommendation_reason": (
            f"Plan {best['plan_id']} scores highest for your priorities: "
            + ", ".join(best["matched_benefits"])
        ),
    }


@tool
def compare_two_plans(plan_a: int, plan_b: int, benefit_keys: list[str]) -> str:
    """
    Side-by-side comparison of two plans for specific benefits.

    Args:
        plan_a: First plan number (1-5)
        plan_b: Second plan number (1-5)
        benefit_keys: List of benefits to compare (e.g., ['maternity', 'physio', 'gp'])
    """
    lines = [f"**Plan {plan_a} vs Plan {plan_b}**\n"]
    for key in benefit_keys:
        rows_a = get_benefit(plan_a, key)
        rows_b = get_benefit(plan_b, key)
        cov_a = rows_a[0]["coverage"] if rows_a else "Not covered"
        cov_b = rows_b[0]["coverage"] if rows_b else "Not covered"
        lines.append(f"**{key.title()}**")
        lines.append(f"  Plan {plan_a}: {cov_a}")
        lines.append(f"  Plan {plan_b}: {cov_b}")
        lines.append("")
    return "\n".join(lines)


@tool
def search_plan_benefits(plan_id: int, query: str) -> str:
    """
    Search for any benefit by free-text query within a plan's policy document.

    Args:
        plan_id: Plan number 1-5
        query: Free-text search term (e.g., 'acupuncture', 'genetic testing')
    """
    results = search_benefits(plan_id, query)
    if not results:
        return f"No benefits matching '{query}' found in Plan {plan_id}."
    lines = [f"**{r['benefit']}** ({r['category']}): {r['coverage']}" for r in results[:8]]
    return f"Plan {plan_id} — results for '{query}':\n" + "\n".join(lines)


@tool
def get_plans_overview() -> str:
    """
    Get a structured overview of all 5 health insurance plans with key benefits.
    Use this when a user asks to see or compare all available plans.
    """
    summaries = get_all_plans_summary()
    lines = ["**Health Insurance Plans Overview**\n"]
    for s in summaries:
        lines.append(f"### {s['name']} ({s['tier']})")
        for key, val in s["key_benefits"].items():
            lines.append(f"  - {key.replace('_', ' ').title()}: {val}")
        lines.append("")
    return "\n".join(lines)
