from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class Zone:
    """Represents a geographic zone inside a city."""

    zone_id: str
    zone_name: str
    city_id: str
    state_id: str
    centroid_lat: float
    centroid_lng: float
    population: int
    demographics: dict[str, Any] = field(default_factory=dict)
    income_profile: dict[str, Any] = field(default_factory=dict)
    commute_profile: dict[str, Any] = field(default_factory=dict)


@dataclass
class ZoneMetrics:
    """Simulated metrics for a single zone on a specific day."""

    zone_id: str
    zone_name: str
    centroid_lat: float
    centroid_lng: float
    sentiment: float
    protest_probability: float
    modal_shift_pct: float
    total_agents: int
