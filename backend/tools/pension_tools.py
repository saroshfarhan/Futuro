"""
Deterministic pension calculation tools — pure Python math.
No LLM involved in any calculation. LangChain agents call these tools.

Irish pension rules applied:
- Tax relief: 20% for income ≤ €40,000; 40% for income > €40,000
- Growth rates: conservative=4%, moderate=6%, aggressive=8%
- State pension (full contributory, 2025): €13,172/year = €1,097.67/month
- PRSI contributions needed for full state pension: 520 weeks
"""
from langchain_core.tools import tool

GROWTH_RATES = {"conservative": 0.04, "moderate": 0.06, "aggressive": 0.08}
STATE_PENSION_ANNUAL = 13172  # €/year (2025 full Irish state pension)

LIFESTYLE_BUCKETS = [
    {
        "min_monthly": 0,
        "max_monthly": 1200,
        "title": "Back to Basics",
        "description": "State pension only — tight budget, mostly home-based lifestyle",
        "activities": ["Gardening", "Local walks", "Free community events"],
        "location": "Rural Ireland",
        "emoji": "🏡",
    },
    {
        "min_monthly": 1200,
        "max_monthly": 2000,
        "title": "Comfortable Retiree",
        "description": "State pension + modest private pot — steady comfort",
        "activities": ["Weekly dining out", "1 holiday/year", "Golf or gym membership"],
        "location": "Irish town or suburb",
        "emoji": "☕",
    },
    {
        "min_monthly": 2000,
        "max_monthly": 3000,
        "title": "Active Explorer",
        "description": "Good income — travel, hobbies, and family time",
        "activities": ["2-3 holidays/year", "Regular dining out", "Hobby classes"],
        "location": "West Cork or Galway coast",
        "emoji": "✈️",
    },
    {
        "min_monthly": 3000,
        "max_monthly": 4500,
        "title": "Mediterranean Retiree",
        "description": "Strong income — warm weather winters, quality lifestyle",
        "activities": ["Winter in Portugal/Spain", "4+ holidays/year", "Golf, sailing"],
        "location": "Algarve or Costa del Sol winters",
        "emoji": "🌞",
    },
    {
        "min_monthly": 4500,
        "max_monthly": float("inf"),
        "title": "Golden Years",
        "description": "Excellent pension — full freedom, no compromises",
        "activities": ["Long-haul travel", "Luxury experiences", "Second home"],
        "location": "Anywhere you want",
        "emoji": "🏆",
    },
]

# Irish age-related pension contribution limits (% of gross earnings)
AGE_CONTRIBUTION_LIMITS = {
    (0, 29): 15,
    (30, 39): 20,
    (40, 49): 25,
    (50, 54): 30,
    (55, 59): 35,
    (60, 74): 40,
}


def _get_tax_relief_rate(salary: int) -> float:
    return 0.40 if salary > 40000 else 0.20


def _get_age_limit(age: int) -> int:
    for (low, high), limit in AGE_CONTRIBUTION_LIMITS.items():
        if low <= age <= high:
            return limit
    return 15


@tool
def calculate_pension(
    age: int,
    salary: int,
    contribution_rate: float,
    retirement_age: int,
    risk: str = "moderate",
) -> dict:
    """
    Calculate projected pension pot using Irish pension rules and compound growth.
    Returns exact figures — no LLM estimation.

    Args:
        age: Current age in years
        salary: Annual gross salary in euros
        contribution_rate: Personal contribution as percentage of salary (e.g., 5.0 for 5%)
        retirement_age: Target retirement age (e.g., 65)
        risk: Investment risk profile — 'conservative', 'moderate', or 'aggressive'
    """
    years = max(0, retirement_age - age)
    growth_rate = GROWTH_RATES.get(risk, GROWTH_RATES["moderate"])
    tax_relief_rate = _get_tax_relief_rate(salary)
    age_limit = _get_age_limit(age)

    # Cap contribution at Revenue age-related limit
    effective_rate = min(contribution_rate, age_limit) / 100
    annual_contribution = salary * effective_rate

    # Net cost to employee after tax relief
    annual_net_cost = annual_contribution * (1 - tax_relief_rate)
    monthly_net_cost = annual_net_cost / 12

    # Compound growth of contributions (future value of annuity)
    if growth_rate > 0 and years > 0:
        future_value = annual_contribution * (((1 + growth_rate) ** years - 1) / growth_rate)
    else:
        future_value = annual_contribution * years

    projected_pot = round(future_value)

    # Monthly drawdown at 4% safe withdrawal rate over 25-year retirement
    monthly_from_pot = round((projected_pot * 0.04) / 12)
    monthly_state_pension = round(STATE_PENSION_ANNUAL / 12)
    total_monthly_income = monthly_from_pot + monthly_state_pension

    # Pot value at each decade for chart
    pot_at_decade = {}
    for y in range(1, years + 1):
        if (age + y) % 5 == 0 or y == years:
            val = annual_contribution * (((1 + growth_rate) ** y - 1) / growth_rate) if growth_rate > 0 else annual_contribution * y
            pot_at_decade[age + y] = round(val)

    return {
        "projected_pot": projected_pot,
        "monthly_from_pot": monthly_from_pot,
        "monthly_state_pension": monthly_state_pension,
        "total_monthly_income": total_monthly_income,
        "years_to_retire": years,
        "annual_contribution": round(annual_contribution),
        "monthly_net_cost": round(monthly_net_cost),
        "tax_relief_rate_pct": round(tax_relief_rate * 100),
        "effective_rate_pct": round(effective_rate * 100, 1),
        "age_contribution_limit_pct": age_limit,
        "growth_rate_pct": round(growth_rate * 100),
        "pot_at_decade": pot_at_decade,
        "risk": risk,
    }


@tool
def get_lifestyle_bucket(monthly_income: int) -> dict:
    """
    Map a monthly retirement income to a lifestyle comparison card.
    Returns a human-friendly description of what that income buys in retirement.

    Args:
        monthly_income: Total monthly retirement income in euros
    """
    for bucket in LIFESTYLE_BUCKETS:
        if bucket["min_monthly"] <= monthly_income < bucket["max_monthly"]:
            return {**bucket, "monthly_income": monthly_income}
    return {**LIFESTYLE_BUCKETS[-1], "monthly_income": monthly_income}


@tool
def latte_factor(salary: int, extra_contribution_pct: float) -> dict:
    """
    Calculate the real daily/weekly cost of contributing more to your pension,
    after Irish tax relief is applied. Makes the cost feel tangible.

    Args:
        salary: Annual gross salary in euros
        extra_contribution_pct: Additional contribution percentage (e.g., 1.0 for 1% extra)
    """
    tax_relief = _get_tax_relief_rate(salary)
    annual_gross_extra = salary * (extra_contribution_pct / 100)
    annual_net_extra = annual_gross_extra * (1 - tax_relief)
    daily_cost = annual_net_extra / 365
    weekly_cost = annual_net_extra / 52

    return {
        "extra_pct": extra_contribution_pct,
        "annual_gross_extra": round(annual_gross_extra),
        "annual_net_extra": round(annual_net_extra),
        "daily_cost": round(daily_cost, 2),
        "weekly_cost": round(weekly_cost, 2),
        "tax_relief_pct": round(tax_relief * 100),
        "comparison": _get_cost_comparison(daily_cost),
    }


def _get_cost_comparison(daily_cost: float) -> str:
    if daily_cost < 2:
        return f"Less than a bus fare (€{daily_cost:.2f}/day)"
    elif daily_cost < 4:
        return f"About the price of a coffee (€{daily_cost:.2f}/day)"
    elif daily_cost < 8:
        return f"About a takeaway lunch (€{daily_cost:.2f}/day)"
    elif daily_cost < 15:
        return f"About a cinema ticket (€{daily_cost:.2f}/day)"
    else:
        return f"€{daily_cost:.2f}/day — a meaningful contribution"


@tool
def peer_benchmark(age: int, salary: int, contribution_rate: float) -> dict:
    """
    Compare a user's pension contribution to Irish peer averages by age group.
    Uses CSO/Mercer data approximations.

    Args:
        age: Current age
        salary: Annual gross salary in euros
        contribution_rate: Current contribution percentage
    """
    # Approximate Irish average contribution rates by age (CSO/Mercer data)
    avg_rates = {
        (20, 29): 4.2,
        (30, 39): 5.8,
        (40, 49): 7.4,
        (50, 59): 9.1,
        (60, 70): 10.5,
    }

    peer_rate = 5.0
    for (low, high), rate in avg_rates.items():
        if low <= age <= high:
            peer_rate = rate
            break

    percentile = _estimate_percentile(contribution_rate, peer_rate)

    return {
        "your_rate": contribution_rate,
        "peer_average_rate": peer_rate,
        "percentile": percentile,
        "message": _percentile_message(percentile, contribution_rate, peer_rate),
        "age_group": f"{(age // 10) * 10}s",
    }


def _estimate_percentile(your_rate: float, avg_rate: float) -> int:
    ratio = your_rate / max(avg_rate, 0.1)
    if ratio >= 2.0:
        return 90
    elif ratio >= 1.5:
        return 80
    elif ratio >= 1.2:
        return 70
    elif ratio >= 1.0:
        return 55
    elif ratio >= 0.8:
        return 40
    elif ratio >= 0.5:
        return 25
    else:
        return 10


def _percentile_message(percentile: int, your_rate: float, peer_rate: float) -> str:
    if percentile >= 75:
        return f"You're in the top {100 - percentile}% of savers your age. Great work!"
    elif percentile >= 50:
        return f"You're saving slightly above average ({your_rate}% vs {peer_rate}% peer average)."
    else:
        return f"You're saving {peer_rate - your_rate:.1f}% less than your peers. Small increases make a big difference."
