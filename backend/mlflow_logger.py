"""
MLflow tracking — wraps every agent run with visibility metrics.
Run `mlflow ui` to view all traces at http://localhost:5000
"""
import os
import mlflow
from datetime import datetime

EXPERIMENT_NAME = "futuro-ai-platform"

_initialized = False


def _init():
    global _initialized
    if not _initialized:
        tracking_uri = os.environ.get("MLFLOW_TRACKING_URI", "./mlruns")
        mlflow.set_tracking_uri(tracking_uri)
        mlflow.set_experiment(EXPERIMENT_NAME)
        _initialized = True


def log_chat_turn(
    user_id: str,
    agent: str,
    message: str,
    response: str,
    profile_delta: dict,
    latency_ms: int,
    tools_called: int = 0,
) -> None:
    """Log a single chat turn to MLflow."""
    _init()
    try:
        with mlflow.start_run(run_name=f"chat_{agent}_{datetime.now().strftime('%H%M%S')}"):
            mlflow.log_params({
                "user_id": user_id[:8] + "..." if len(user_id) > 8 else user_id,
                "agent": agent,
            })
            mlflow.log_metrics({
                "latency_ms": latency_ms,
                "tools_called": tools_called,
                "profile_fields_extracted": len(profile_delta),
                "message_length": len(message),
                "response_length": len(response),
            })
            if profile_delta:
                mlflow.log_dict(profile_delta, "profile_delta.json")
            mlflow.log_text(message[:500], "user_message.txt")
            mlflow.log_text(response[:500], "agent_response.txt")
    except Exception:
        pass  # MLflow errors should never break the main flow


def log_pension_calculation(
    user_id: str,
    inputs: dict,
    outputs: dict,
) -> None:
    """Log a pension calculation to MLflow."""
    _init()
    try:
        with mlflow.start_run(run_name=f"pension_calc_{datetime.now().strftime('%H%M%S')}"):
            mlflow.log_params({
                "user_id": user_id[:8] + "..." if len(user_id) > 8 else user_id,
                "age": inputs.get("age"),
                "risk": inputs.get("risk"),
            })
            mlflow.log_metrics({
                "salary": inputs.get("salary", 0),
                "contribution_rate": inputs.get("contribution_rate", 0),
                "projected_pot": outputs.get("projected_pot", 0),
                "total_monthly_income": outputs.get("total_monthly_income", 0),
                "years_to_retire": outputs.get("years_to_retire", 0),
            })
    except Exception:
        pass


def log_plan_recommendation(
    user_id: str,
    recommended_plan: int,
    priorities: list[str],
    score: int,
) -> None:
    """Log a plan recommendation to MLflow."""
    _init()
    try:
        with mlflow.start_run(run_name=f"plan_rec_{datetime.now().strftime('%H%M%S')}"):
            mlflow.log_params({
                "user_id": user_id[:8] + "..." if len(user_id) > 8 else user_id,
                "recommended_plan": recommended_plan,
                "priorities": ",".join(priorities),
            })
            mlflow.log_metric("recommendation_score", score)
    except Exception:
        pass
