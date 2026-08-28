"""
main.py — FastAPI app, all REST routes.

Mirrors the original Express version route-for-route so the existing
React frontend (frontend/src/api.js) works against this backend
without any changes — same paths, same request/response shapes.
"""

from __future__ import annotations

from typing import Optional

import store
from emi import calculate_foreclosure_amount
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Loan EMI Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # fine for this assignment's scope; lock down for prod
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---- Mock auth (hardcoded credentials, per assignment spec) ----
STAFF_USER = {"username": "staff", "password": "staff123"}


class LoginRequest(BaseModel):
    username: str
    password: str


class MemberCreateRequest(BaseModel):
    name: str
    memberCode: str
    monthlySalary: float


class LoanCreateRequest(BaseModel):
    memberId: int
    principal: float
    tenureMonths: int


@app.post("/api/login")
def login(body: LoginRequest):
    if body.username == STAFF_USER["username"] and body.password == STAFF_USER["password"]:
        # No real JWT/session needed for this assignment's scope — a fixed
        # token is enough to gate the frontend routes.
        return {"token": "mock-staff-token", "username": body.username}
    raise HTTPException(status_code=401, detail="Invalid username or password")


# ---- Members ----
@app.get("/api/members")
def list_members():
    return store.get_members()


@app.post("/api/members", status_code=201)
def create_member(body: MemberCreateRequest):
    name = body.name.strip()
    member_code = body.memberCode.strip()

    if not name or not member_code or not body.monthlySalary:
        raise HTTPException(
            status_code=400,
            detail="Name, member ID, and monthly salary are all required",
        )
    if body.monthlySalary <= 0:
        raise HTTPException(status_code=400, detail="Monthly salary must be a positive number")

    member = store.add_member(name, member_code, body.monthlySalary)
    return member


# ---- Loans ----
@app.get("/api/loans")
def list_loans():
    result = []
    for loan in store.get_loans():
        member = store.get_member_by_id(loan["memberId"])
        result.append(
            {
                "id": loan["id"],
                "memberId": loan["memberId"],
                "memberName": member["name"] if member else "Unknown",
                "principal": loan["principal"],
                "tenureMonths": loan["tenureMonths"],
                "emi": loan["emi"],
                "status": loan["status"],
                "outstanding": store.get_outstanding_for_loan(loan),
            }
        )
    return result


@app.post("/api/loans", status_code=201)
def create_loan(body: LoanCreateRequest):
    if not body.memberId or not body.principal or not body.tenureMonths:
        raise HTTPException(
            status_code=400, detail="Member, principal, and tenure are all required"
        )
    if body.principal <= 0:
        raise HTTPException(status_code=400, detail="Principal must be a positive number")
    if not float(body.tenureMonths).is_integer() or body.tenureMonths <= 0:
        raise HTTPException(
            status_code=400, detail="Tenure must be a positive whole number of months"
        )

    try:
        loan = store.add_loan(body.memberId, body.principal, int(body.tenureMonths))
        return loan
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.get("/api/loans/{loan_id}")
def get_loan(loan_id: int):
    loan = store.get_loan_by_id(loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    member = store.get_member_by_id(loan["memberId"])
    return {
        **loan,
        "memberName": member["name"] if member else "Unknown",
        "outstanding": store.get_outstanding_for_loan(loan),
    }


# Bonus: foreclosure
@app.post("/api/loans/{loan_id}/foreclose")
def foreclose_loan(loan_id: int):
    loan = store.get_loan_by_id(loan_id)
    if loan is None:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan["status"] == "Closed":
        raise HTTPException(status_code=400, detail="Loan is already closed")

    outstanding = store.get_outstanding_for_loan(loan)
    settlement_amount = calculate_foreclosure_amount(outstanding, loan["annualRatePercent"])
    closed = store.close_loan_by_foreclosure(loan_id)
    return {**closed, "settlementAmount": settlement_amount}


# ---- Report ----
@app.get("/api/report/member-outstanding")
def member_outstanding_report():
    return store.get_member_wise_outstanding()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=4000, reload=True)
