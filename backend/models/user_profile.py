from typing import Optional
from pydantic import BaseModel


class UserProfile(BaseModel):
    age: Optional[int] = None
    salary: Optional[int] = None
    family_size: Optional[int] = None  # 1=single, 2=couple, 3+=family
    health_priorities: list[str] = []  # ["physio", "maternity", "dental"]
    has_gp_visit_card: Optional[bool] = None
    retirement_age: Optional[int] = None
    risk_tolerance: Optional[str] = None  # "conservative" | "moderate" | "aggressive"
    current_plan: Optional[int] = None  # 1-5 if known
    location: Optional[str] = None
    is_pregnant: Optional[bool] = None
    is_student: Optional[bool] = None
    occupation: Optional[str] = None

    def merge(self, delta: "UserProfileDelta") -> "UserProfile":
        """Return a new UserProfile with non-None fields from delta applied."""
        data = self.model_dump()
        delta_data = delta.model_dump(exclude_none=True)
        # Special handling for health_priorities — append, don't overwrite
        if "health_priorities" in delta_data:
            existing = set(data.get("health_priorities", []))
            new_priorities = set(delta_data.pop("health_priorities"))
            delta_data["health_priorities"] = list(existing | new_priorities)
        data.update(delta_data)
        return UserProfile(**data)


class UserProfileDelta(BaseModel):
    """Partial update — only fields the extractor found in a single message."""
    age: Optional[int] = None
    salary: Optional[int] = None
    family_size: Optional[int] = None
    health_priorities: Optional[list[str]] = None
    has_gp_visit_card: Optional[bool] = None
    retirement_age: Optional[int] = None
    risk_tolerance: Optional[str] = None
    current_plan: Optional[int] = None
    location: Optional[str] = None
    is_pregnant: Optional[bool] = None
    is_student: Optional[bool] = None
    occupation: Optional[str] = None
