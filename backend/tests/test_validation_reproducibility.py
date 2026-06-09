import pytest

from backend.validation.reproduce import reproduce


def test_validation_calculations_are_reproducible():
    cases = {case["case_id"]: case for case in reproduce()}

    assert round(cases["delhi_metro_phase4"]["absolute_percentage_error"], 1) == 6.9
    assert cases["delhi_metro_phase4"]["absolute_error"] < cases["delhi_metro_phase4"]["naive_baseline_absolute_error"]
    assert cases["neet_2024_trust"]["absolute_error"] == pytest.approx(1.6)
    assert cases["neet_2024_trust"]["reported_error_unit"] == "percentage points"
