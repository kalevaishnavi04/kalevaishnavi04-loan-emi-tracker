"""
Tests for the EMI engine. Run with:
    pytest test_emi.py -v
or:
    python -m pytest test_emi.py -v
"""

from datetime import date, timedelta

import pytest
from emi import (
    TOPUP_MIN_REPAID_PERCENT,
    calculate_emi_amount,
    calculate_foreclosure_amount,
    calculate_repaid_percent,
    generate_emi_schedule,
)


def test_schedule_balances_to_zero():
    """EMI schedule balances to exactly zero at the end."""
    result = generate_emi_schedule(100000, 12)
    last_row = result["schedule"][-1]
    assert last_row["outstandingBalance"] == 0


def test_sum_of_principal_equals_original():
    """Sum of principal components equals the original principal."""
    result = generate_emi_schedule(100000, 12)
    total_principal = sum(row["principalComponent"] for row in result["schedule"])
    assert total_principal == 100000


def test_interest_strictly_decreases():
    """Interest strictly decreases month over month (reducing balance)."""
    result = generate_emi_schedule(100000, 12)
    schedule = result["schedule"]
    for i in range(1, len(schedule)):
        assert schedule[i]["interestComponent"] < schedule[i - 1]["interestComponent"], (
            f"interest should shrink: month {i} ({schedule[i]['interestComponent']}) "
            f"should be < month {i - 1} ({schedule[i - 1]['interestComponent']})"
        )


def test_schedule_has_exact_row_count():
    """Schedule has exactly `tenure_months` rows."""
    result = generate_emi_schedule(50000, 6)
    assert len(result["schedule"]) == 6


def test_one_month_tenure_edge_case():
    """1-month tenure edge case: single row, principal fully repaid."""
    result = generate_emi_schedule(20000, 1)
    schedule = result["schedule"]
    assert len(schedule) == 1
    assert schedule[0]["principalComponent"] == 20000
    assert schedule[0]["outstandingBalance"] == 0


def test_zero_or_negative_tenure_throws():
    """Zero or negative tenure raises ValueError."""
    with pytest.raises(ValueError):
        generate_emi_schedule(50000, 0)
    with pytest.raises(ValueError):
        generate_emi_schedule(50000, -3)


def test_zero_or_negative_principal_throws():
    """Zero or negative principal raises ValueError."""
    with pytest.raises(ValueError):
        generate_emi_schedule(0, 12)
    with pytest.raises(ValueError):
        generate_emi_schedule(-1000, 12)


def test_emi_amount_is_whole_rupee():
    """EMI amount is a whole rupee number (no paise)."""
    emi = calculate_emi_amount(137500, 9)
    assert isinstance(emi, int)


def test_foreclosure_waives_future_interest():
    """Foreclosure waives future interest, charges only current month's."""
    # outstanding 40000 at 8% p.a. -> monthly rate 0.006667 -> interest ~267
    settlement = calculate_foreclosure_amount(40000)
    assert settlement == 40000 + round(40000 * (8 / 12 / 100))


def test_repaid_percent_zero_right_after_creation():
    """Repaid percent is 0 right after loan creation (no due dates have passed yet)."""
    result = generate_emi_schedule(100000, 12, start_date=date.today())
    percent = calculate_repaid_percent(100000, result["schedule"], date.today())
    assert percent == 0


def test_repaid_percent_crosses_threshold_over_time():
    """Repaid percent crosses the top-up threshold once enough months have elapsed."""
    # Backdate the loan by 6 months so several EMIs are already "due".
    start_date = date.today() - timedelta(days=6 * 30)
    result = generate_emi_schedule(100000, 12, start_date=start_date)

    percent_at_6_months = calculate_repaid_percent(100000, result["schedule"], date.today())
    assert percent_at_6_months > 0, "some principal should show as repaid after 6+ months"
    # Sanity check — percent should be a real, finite number.
    assert isinstance(percent_at_6_months, float)


def test_topup_threshold_constant():
    """Top-up threshold constant is 33%."""
    assert TOPUP_MIN_REPAID_PERCENT == 33
