"""
policy.py — /api/parse-policy endpoint.

Parses natural language policy input into structured parameters.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()
logger = logging.getLogger(__name__)


class PolicyInput(BaseModel):
    policy_text: str = Field(min_length=10, max_length=2_000)
    city_id: str = Field(default="DEL", pattern="^(DEL|MUM|BLR|CHN|HYD|KOL)$")


@router.post("/parse-policy")
async def parse_policy(request: PolicyInput):
    """Parse natural language policy text into structured parameters."""
    try:
        from backend.simulation.policy_parser import PolicyParser
        parser = PolicyParser(openai_api_key=None)  # Rule-based for speed
        result = await parser.parse(request.policy_text)

        return {
            "success": True,
            "parsed": {
                "policy_type": result.policy_type,
                "affected_modes": result.affected_modes,
                "magnitude": result.magnitude,
                "timeline_days": result.timeline_days,
                "affected_population_segments": result.affected_population_segments,
                "geographic_scope": result.geographic_scope or [request.city_id],
                "affected_routes": result.affected_routes,
            },
            "interpretation": _build_interpretation(result, request.city_id),
        }
    except Exception as exc:
        logger.exception("Policy parsing failed: %s", exc)
        raise HTTPException(status_code=422, detail="Policy text could not be parsed") from exc


def _build_interpretation(result, city_id: str) -> str:
    """Build human-readable interpretation of parsed policy."""
    parts = []
    parts.append("We understood: ")

    # Direction
    if result.magnitude > 0:
        parts.append(f"{result.magnitude:.0f}% fare increase")
    elif result.magnitude < 0:
        parts.append(f"{abs(result.magnitude):.0f}% fare decrease")
    else:
        parts.append(f"{result.policy_type.replace('_', ' ')} policy change")

    # Modes
    if result.affected_modes:
        modes_str = ", ".join(m.replace("_", " ") for m in result.affected_modes)
        parts.append(f" on {modes_str}")

    # Timeline
    parts.append(f", effective {result.timeline_days} days from now")

    # Segments
    if result.affected_population_segments:
        segs = ", ".join(s.replace("_", " ") for s in result.affected_population_segments)
        parts.append(f", primarily affecting {segs}")
    else:
        parts.append(", affecting all passenger classes")

    return "".join(parts)
