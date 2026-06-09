"""
validation.py — /api/validation endpoints.

Pre-computed validation results for instant loading.
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.api.demo_data import VALIDATION_CASES, CITIES
from backend.validation.reproduce import reproduce

router = APIRouter()


@router.get("/validation")
async def get_all_validations():
    """Get all validation cases."""
    return {
        "cases": VALIDATION_CASES,
        "methodology": (
            "Hindcast validation reproduces historical outcomes using only pre-event data. "
            "The model runs with historical input conditions and compares outputs to known results. "
            "This is the same methodology used by IPCC climate models and Basel III financial stress tests."
        ),
        "confidence_grades": {
            "A": "Error <8% — validated on 2+ historical anchors. Delhi, Mumbai qualify.",
            "B": "Error 8-15% — validated on 1 historical anchor or thin data city.",
            "C": ">15% or unvalidated — disclosed explicitly. User warned before relying.",
        },
        "forward_roadmap": (
            "Forward prediction validation will be conducted by partnering with a government "
            "body to run a simulation before a planned policy implementation and publishing "
            "the prediction before the outcome is known. We are actively seeking this partnership "
            "with NITI Aayog and IIT research groups."
        ),
        "disclosure": (
            "The bundled benchmark rows reproduce the reported arithmetic but do not "
            "include independently licensed third-party raw data. Replace them before "
            "external scientific publication."
        ),
    }


@router.get("/validation-reproduction")
async def reproduce_validations():
    """Return calculations generated from the bundled frozen benchmark rows."""
    return {"cases": reproduce()}


@router.get("/validation/{city_id}/{scenario_id}")
async def get_validation_case(city_id: str, scenario_id: str):
    """Get a specific validation case."""
    for case in VALIDATION_CASES:
        if case["id"] == scenario_id:
            return {"case": case}

    return {"error": f"Validation case '{scenario_id}' not found"}
