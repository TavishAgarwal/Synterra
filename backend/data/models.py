"""
models.py — SQLAlchemy database models for Synthetic Nation.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, DateTime
from backend.data.database import Base


class SimulationRun(Base):
    """Stores all configuration parameters, running logs, results and causal traces

    for a complete simulation run.
    """

    __tablename__ = "simulation_runs"

    simulation_id = Column(String(64), primary_key=True, index=True)
    city_id = Column(String(10), nullable=False)
    policy_text = Column(Text, nullable=False)
    time_horizon_days = Column(Integer, default=30)
    population_size = Column(Integer, default=1000)
    seed = Column(Integer, default=42)

    status = Column(String(20), default="running")  # running, complete, error
    score = Column(Integer, nullable=True)
    verdict = Column(String(100), nullable=True)

    # Store serialized JSON data
    metrics_history_json = Column(Text, default="[]")  # list of day metrics
    alerts_json = Column(Text, default="[]")  # list of alert dicts
    agent_feed_json = Column(Text, default="[]")  # sample agent feed logs
    summary_json = Column(Text, nullable=True)  # full final summary report
    causal_trace_json = Column(Text, default="{}")  # recursive causal trace dict

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    def to_dict(self) -> dict:
        """Convert the model into a dictionary for JSON response serializer."""
        try:
            metrics_history = json.loads(self.metrics_history_json or "[]")
        except Exception:
            metrics_history = []

        try:
            alerts = json.loads(self.alerts_json or "[]")
        except Exception:
            alerts = []

        try:
            agent_feed = json.loads(self.agent_feed_json or "[]")
        except Exception:
            agent_feed = []

        try:
            summary = json.loads(self.summary_json or "{}") if self.summary_json else None
        except Exception:
            summary = None

        try:
            causal_trace = json.loads(self.causal_trace_json or "{}")
        except Exception:
            causal_trace = {}

        return {
            "simulation_id": self.simulation_id,
            "city_id": self.city_id,
            "policy_text": self.policy_text,
            "time_horizon_days": self.time_horizon_days,
            "population_size": self.population_size,
            "seed": self.seed,
            "status": self.status,
            "score": self.score,
            "verdict": self.verdict,
            "metrics_history": metrics_history,
            "alerts": alerts,
            "agent_feed": agent_feed,
            "summary": summary,
            "causal_trace": causal_trace,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
