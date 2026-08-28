"""
store.py — in-memory data "database".

Deliberate choice: no SQLite/Postgres. Data lives in memory and
resets when the server restarts. Fine for this assignment's scope
(documented as an acceptable option in the brief) and keeps the
submission dependency-free. Swapping this for a real DB later would
mean replacing the functions in this file only — routes in main.py
don't know or care how data is stored.
"""

from __future__ import annotations

from datetime import date, timedelta
from typing import List, Optional

from emi import (
    ANNUAL_RATE_PERCENT,
    TOPUP_MIN_REPAID_PERCENT,
    calculate_repaid_percent,
    generate_emi_schedule,
)

members: List[dict] = []
loans: List[dict] = []
_next_member_id = 1
_next_loan_id = 1


def add_member(name: str, member_code: str, monthly_salary: float) -> dict:
    global _next_member_id
    member = {
        "id": _next_member_id,
        "name": name,
        "memberCode": member_code,
        "monthlySalary": monthly_salary,
    }
    _next_member_id += 1
    members.append(member)
    return member


def get_members() -> List[dict]:
    return members


def get_member_by_id(member_id: int) -> Optional[dict]:
    return next((m for m in members if m["id"] == int(member_id)), None)


def add_loan(member_id: int, principal: float, tenure_months: int) -> dict:
    global _next_loan_id

    member = get_member_by_id(member_id)
    if member is None:
        raise ValueError("Member not found")

    # Bonus: top-up gating. If this member already has an active loan,
    # that loan must be at least 33% repaid (by schedule) before we
    # let them take another one.
    active_loans = [
        l for l in loans if l["memberId"] == member["id"] and l["status"] == "Active"
    ]
    for existing_loan in active_loans:
        repaid_percent = calculate_repaid_percent(
            existing_loan["principal"], existing_loan["schedule"]
        )
        if repaid_percent < TOPUP_MIN_REPAID_PERCENT:
            raise ValueError(
                f"Cannot create a top-up loan yet — loan #{existing_loan['id']} "
                f"for this member is only {repaid_percent:.1f}% repaid "
                f"(needs at least {TOPUP_MIN_REPAID_PERCENT}%)."
            )

    result = generate_emi_schedule(principal, tenure_months)

    loan = {
        "id": _next_loan_id,
        "memberId": member["id"],
        "principal": principal,
        "tenureMonths": tenure_months,
        "annualRatePercent": ANNUAL_RATE_PERCENT,
        "emi": result["emi"],
        "schedule": result["schedule"],
        "status": "Active",
        "createdAt": date.today().isoformat(),
    }
    _next_loan_id += 1
    loans.append(loan)
    return loan


def get_loans() -> List[dict]:
    return loans


def get_loan_by_id(loan_id: int) -> Optional[dict]:
    return next((l for l in loans if l["id"] == int(loan_id)), None)


def get_outstanding_for_loan(loan: dict) -> int:
    """
    Outstanding balance (assumption documented in README): there's no
    "mark this EMI as paid" flow in the core requirements, so we read
    "repaid so far" off the loan's own schedule — any row whose due
    date has already passed counts as repaid. This is also what the
    top-up gating check above uses, so "outstanding" and "eligible for
    a top-up" always agree with each other.
    """
    if loan["status"] == "Closed":
        return 0
    repaid_percent = calculate_repaid_percent(loan["principal"], loan["schedule"])
    repaid_principal = (repaid_percent / 100) * loan["principal"]
    return max(0, round(loan["principal"] - repaid_principal))


def close_loan_by_foreclosure(loan_id: int) -> dict:
    loan = get_loan_by_id(loan_id)
    if loan is None:
        raise ValueError("Loan not found")
    loan["status"] = "Closed"
    loan["closedAt"] = date.today().isoformat()
    return loan


def get_member_wise_outstanding() -> List[dict]:
    result = []
    for member in members:
        member_loans = [l for l in loans if l["memberId"] == member["id"]]
        total_outstanding = sum(get_outstanding_for_loan(l) for l in member_loans)
        result.append(
            {
                "memberId": member["id"],
                "memberName": member["name"],
                "memberCode": member["memberCode"],
                "loanCount": len(member_loans),
                "totalOutstanding": total_outstanding,
            }
        )
    return result


def seed() -> None:
    rahul = add_member("Rahul Kadam", "EMP-101", 45000)
    priya = add_member("Priya Sharma", "EMP-102", 60000)
    add_member("Sagar Jadhav", "EMP-103", 38000)

    add_loan(rahul["id"], 100000, 12)
    add_loan(priya["id"], 250000, 24)


seed()
