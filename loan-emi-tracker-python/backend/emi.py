"""
emi.py — Reducing-balance EMI calculation.

WHY REDUCING BALANCE (read this before you touch anything):
Interest each month is charged only on what's still OUTSTANDING,
not on the original principal. So as you repay principal every
month, next month's interest is smaller — even though the EMI
(total monthly payment) stays the same. That's why month-1 interest
is high and month-n interest is tiny: the EMI amount never changes,
but the split between "interest part" and "principal part" shifts
every month as the balance shrinks.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import List, Optional, TypedDict


ANNUAL_RATE_PERCENT = 8  # fixed by the assignment spec

# Bonus: top-up gating threshold — a member's existing loan must be
# at least this % repaid (by schedule) before they can take another.
TOPUP_MIN_REPAID_PERCENT = 33


class ScheduleRow(TypedDict):
    emiNumber: int
    dueDate: str
    emiAmount: int
    principalComponent: int
    interestComponent: int
    outstandingBalance: int


def _add_months(d: date, months: int) -> date:
    """Add `months` calendar months to a date (day-of-month clamped,
    same behaviour as JS's Date.setMonth used in the original app)."""
    month_index = d.month - 1 + months
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    # Clamp day to the last valid day of the target month.
    if month == 12:
        next_month_first = date(year + 1, 1, 1)
    else:
        next_month_first = date(year, month + 1, 1)
    last_day = (next_month_first - timedelta(days=1)).day
    day = min(d.day, last_day)
    return date(year, month, day)


def calculate_emi_amount(
    principal: float,
    tenure_months: int,
    annual_rate_percent: float = ANNUAL_RATE_PERCENT,
) -> int:
    """
    Standard reducing-balance EMI formula:
        EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    where r = monthly rate (decimal), n = tenure in months.

    Special-cased r == 0 to avoid divide-by-zero (not used here since
    rate is fixed at 8%, but keeps the function correct/reusable).
    """
    r = annual_rate_percent / 12 / 100
    if r == 0:
        return round(principal / tenure_months)
    factor = (1 + r) ** tenure_months
    raw_emi = (principal * r * factor) / (factor - 1)
    return round(raw_emi)  # whole rupees — no paise per spec


def generate_emi_schedule(
    principal: float,
    tenure_months: int,
    annual_rate_percent: float = ANNUAL_RATE_PERCENT,
    start_date: Optional[date] = None,
) -> dict:
    """
    Builds the full month-by-month schedule.

    Each row: interest is computed on the CURRENT outstanding balance,
    principal component = emi - interest, and the balance drops by that
    principal component. On the FINAL row we don't trust the rounded
    EMI to land exactly on zero (rounding drift), so we force the
    principal component to equal whatever balance remains, and adjust
    that row's EMI to match. That's what "clears to zero" means.
    """
    if not isinstance(principal, (int, float)) or principal <= 0:
        raise ValueError("Principal must be a positive number")
    if not isinstance(tenure_months, int) or tenure_months <= 0:
        raise ValueError("Tenure must be a positive whole number of months")

    if start_date is None:
        start_date = date.today()

    r = annual_rate_percent / 12 / 100
    emi = calculate_emi_amount(principal, tenure_months, annual_rate_percent)

    schedule: List[ScheduleRow] = []
    outstanding = principal

    for month in range(1, tenure_months + 1):
        interest_component = round(outstanding * r)
        principal_component = emi - interest_component
        emi_this_month = emi

        is_last_row = month == tenure_months
        if is_last_row:
            # Force exact closure: whatever is left becomes this month's
            # principal component, and the EMI adjusts to match. This is
            # what soaks up the rounding drift from round() above.
            principal_component = outstanding
            emi_this_month = principal_component + interest_component

        outstanding = max(0, outstanding - principal_component)

        due_date = _add_months(start_date, month)

        schedule.append(
            {
                "emiNumber": month,
                "dueDate": due_date.isoformat(),
                "emiAmount": round(emi_this_month),
                "principalComponent": round(principal_component),
                "interestComponent": round(interest_component),
                "outstandingBalance": round(outstanding),
            }
        )

    return {"emi": emi, "schedule": schedule}


def calculate_foreclosure_amount(
    outstanding_principal: float,
    annual_rate_percent: float = ANNUAL_RATE_PERCENT,
) -> int:
    """
    Foreclosure settlement (bonus feature):
    outstanding principal + only the CURRENT month's interest.
    All remaining future interest is waived — that's the whole point
    of foreclosing early.
    """
    r = annual_rate_percent / 12 / 100
    current_month_interest = round(outstanding_principal * r)
    return round(outstanding_principal + current_month_interest)


def calculate_repaid_percent(
    principal: float,
    schedule: List[ScheduleRow],
    as_of_date: Optional[date] = None,
) -> float:
    """
    % of principal repaid so far, based on the schedule alone (no
    separate "payments" ledger exists in this app — see store.py).
    Any row whose due date has already passed (<= as_of_date) counts
    as repaid; we sum those rows' principal components and express
    that as a % of the original principal.
    """
    if not principal or principal <= 0:
        return 0.0

    if as_of_date is None:
        as_of_date = date.today()

    repaid_principal = sum(
        row["principalComponent"]
        for row in schedule
        if date.fromisoformat(row["dueDate"]) <= as_of_date
    )

    return (repaid_principal / principal) * 100
