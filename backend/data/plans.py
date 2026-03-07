"""
Plan data loader — loads all 5 health insurance JSON files into an indexed structure.
All lookups are deterministic Python dict operations, no LLM involved.
"""
import json
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).parent.parent.parent / "data"

# Benefit keyword → JSON search terms mapping
BENEFIT_KEYWORDS: dict[str, list[str]] = {
    "gp": ["GP Visit", "General Practitioner"],
    "dental": ["Dental"],
    "physio": ["Physio", "Physiotherapy"],
    "maternity": ["Maternity", "Obstetric"],
    "hospital": ["Hospital", "Inpatient", "Accommodation"],
    "consultant": ["Consultant", "Specialist"],
    "mental_health": ["Mental Health", "Psychiatric", "Psychotherapy", "Counselling"],
    "cancer": ["Cancer", "Oncology"],
    "international": ["Emergency", "Abroad", "Repatriation"],
    "day_case": ["Day Case", "Day Patient"],
    "prescriptions": ["Prescription"],
    "minor_injury": ["Minor Injury", "A&E", "Emergency"],
    "screening": ["Health Screen", "Mammogram", "Screening"],
    "digital_doctor": ["Digital Doctor", "Online Doctor", "Nurse"],
    "allied_health": ["Acupuncture", "Chiropody", "Massage", "Reflexology"],
    "orthopaedic": ["Orthopaedic", "Orthopedic"],
    "cardiac": ["Cardiac", "Heart"],
    "excess": ["Excess", "Co-payment"],
}

_plans_cache: Optional[dict] = None


def load_plans() -> dict:
    """Load all 5 plan JSON files and build a flat indexed structure."""
    global _plans_cache
    if _plans_cache is not None:
        return _plans_cache

    plans = {}
    for i in range(1, 6):
        path = DATA_DIR / f"4d_health_{i}.json"
        with open(path, "r") as f:
            raw = json.load(f)

        # Flatten TableOfCover into a list of benefit dicts
        benefits = []
        for category in raw.get("TableOfCover", []):
            cat_name = category.get("Name", "")
            for section in category.get("Sections", []):
                sec_name = section.get("Name", "")
                for sub in section.get("SubSections", []):
                    benefits.append({
                        "category": cat_name,
                        "section": sec_name,
                        "benefit": sub.get("Benefit", ""),
                        "coverage": sub.get("Coverage", ""),
                    })

        plans[i] = {
            "id": i,
            "name": f"Plan {i}",
            "tier": _get_tier(i),
            "benefits": benefits,
            "raw": raw,
        }

    _plans_cache = plans
    return plans


def _get_tier(plan_id: int) -> str:
    tiers = {1: "Basic", 2: "Essential", 3: "Standard", 4: "Plus", 5: "Premium"}
    return tiers.get(plan_id, "Unknown")


def get_benefit(plan_id: int, benefit_key: str) -> list[dict]:
    """Return all matching benefit rows for a plan and benefit keyword."""
    plans = load_plans()
    plan = plans.get(plan_id, {})
    keywords = BENEFIT_KEYWORDS.get(benefit_key.lower(), [benefit_key])

    matches = []
    for b in plan.get("benefits", []):
        benefit_text = f"{b['benefit']} {b['coverage']}".lower()
        if any(kw.lower() in benefit_text for kw in keywords):
            matches.append(b)
    return matches


def get_plan_summary(plan_id: int) -> dict:
    """Return a clean summary of a plan for frontend display."""
    plans = load_plans()
    plan = plans.get(plan_id, {})

    key_benefits = {}
    for key in ["gp", "physio", "maternity", "hospital", "consultant", "dental", "excess"]:
        rows = get_benefit(plan_id, key)
        key_benefits[key] = rows[0]["coverage"] if rows else "Not covered"

    return {
        "id": plan_id,
        "name": plan["name"],
        "tier": plan["tier"],
        "key_benefits": key_benefits,
        "total_benefits": len(plan.get("benefits", [])),
    }


def get_all_plans_summary() -> list[dict]:
    """Return summaries of all 5 plans."""
    return [get_plan_summary(i) for i in range(1, 6)]


def search_benefits(plan_id: int, query: str) -> list[dict]:
    """Full-text search across all benefit rows for a plan."""
    plans = load_plans()
    plan = plans.get(plan_id, {})
    query_lower = query.lower()

    return [
        b for b in plan.get("benefits", [])
        if query_lower in b["benefit"].lower() or query_lower in b["coverage"].lower()
    ]
