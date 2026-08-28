import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { formatINR } from "../utils/currency.js";

const EMPTY_FORM = { memberId: "", principal: "", tenureMonths: "" };

export default function Loans() {
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadData() {
    setLoading(true);
    Promise.all([api.getLoans(), api.getMembers()])
      .then(([l, m]) => {
        setLoans(l);
        setMembers(m);
      })
      .finally(() => setLoading(false));
  }

  useEffect(loadData, []);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.memberId || !form.principal || !form.tenureMonths) {
      setError("Member, principal, and tenure are all required.");
      return;
    }
    if (Number(form.principal) <= 0) {
      setError("Principal must be a positive number.");
      return;
    }
    if (!Number.isInteger(Number(form.tenureMonths)) || Number(form.tenureMonths) <= 0) {
      setError("Tenure must be a whole number of months, greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      await api.addLoan({
        memberId: Number(form.memberId),
        principal: Number(form.principal),
        tenureMonths: Number(form.tenureMonths),
      });
      setForm(EMPTY_FORM);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Loans</h1>
        <p>Create a loan and its EMI schedule is generated automatically — 8% p.a., reducing balance.</p>
      </div>

      <div className="panel">
        <div className="panel-title">Create a loan</div>
        {members.length === 0 ? (
          <div className="empty-state">Add a member first before creating a loan.</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Member
                <select value={form.memberId} onChange={(e) => updateField("memberId", e.target.value)}>
                  <option value="">Select a member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.memberCode})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Principal (₹)
                <input
                  type="number"
                  min="1"
                  value={form.principal}
                  onChange={(e) => updateField("principal", e.target.value)}
                  placeholder="e.g. 150000"
                />
              </label>
              <label>
                Tenure (months)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={form.tenureMonths}
                  onChange={(e) => updateField("tenureMonths", e.target.value)}
                  placeholder="e.g. 18"
                />
              </label>
            </div>
            <div className="helper-text">Interest rate is fixed at 8% per annum, reducing balance.</div>
            {error && <div className="error-text">{error}</div>}
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? "Creating…" : "Create loan"}
            </button>
          </form>
        )}
      </div>

      <div className="panel">
        <div className="panel-title">All loans</div>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : loans.length === 0 ? (
          <div className="empty-state">No loans yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Principal</th>
                <th>Tenure</th>
                <th>Outstanding</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td>{loan.memberName}</td>
                  <td className="num">{formatINR(loan.principal)}</td>
                  <td className="num">{loan.tenureMonths} mo</td>
                  <td className="num">{formatINR(loan.outstanding)}</td>
                  <td>
                    <span className={`stamp ${loan.status === "Active" ? "active" : "closed"}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td>
                    <Link className="table-link" to={`/loans/${loan.id}`}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
