import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api.js";
import { formatINR } from "../utils/currency.js";

export default function LoanDetail() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forecloseBusy, setForecloseBusy] = useState(false);
  const [toast, setToast] = useState("");

  function loadLoan() {
    setLoading(true);
    api
      .getLoan(id)
      .then(setLoan)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(loadLoan, [id]);

  async function handleForeclose() {
    if (!confirm("Foreclose this loan now? This settles outstanding principal + this month's interest only, and closes the loan.")) {
      return;
    }
    setForecloseBusy(true);
    try {
      const result = await api.forecloseLoan(id);
      setToast(`Loan foreclosed — settlement amount ${formatINR(result.settlementAmount)}`);
      loadLoan();
      setTimeout(() => setToast(""), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setForecloseBusy(false);
    }
  }

  if (loading) return <div className="empty-state">Loading…</div>;
  if (error) return <div className="error-text">{error}</div>;
  if (!loan) return null;

  return (
    <>
      <div className="breadcrumb">
        <Link to="/loans">← Back to loans</Link>
      </div>
      <div className="page-header">
        <h1>{loan.memberName}'s loan</h1>
        <p>
          {formatINR(loan.principal)} over {loan.tenureMonths} months at {loan.annualRatePercent}% p.a. (reducing balance)
        </p>
      </div>

      <div className="stat-row">
        <div className="stat-card">
          <div className="label">Outstanding principal</div>
          <div className="value">{formatINR(loan.outstanding)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Monthly EMI</div>
          <div className="value">{formatINR(loan.emi)}</div>
        </div>
        <div className="stat-card">
          <div className="label">Status</div>
          <div className="value">
            <span className={`stamp ${loan.status === "Active" ? "active" : "closed"}`}>{loan.status}</span>
          </div>
        </div>
      </div>

      {loan.status === "Active" && (
        <div className="panel">
          <div className="panel-title">Foreclosure</div>
          <p className="helper-text" style={{ marginBottom: 12 }}>
            Closes the loan early. Settlement = outstanding principal + this month's interest only —
            all future interest is waived.
          </p>
          <button className="btn danger" onClick={handleForeclose} disabled={forecloseBusy}>
            {forecloseBusy ? "Processing…" : "Foreclose this loan"}
          </button>
        </div>
      )}

      <div className="panel">
        <div className="panel-title">EMI schedule</div>
        <div className="schedule-explainer">
          Interest each month is charged only on the balance still outstanding — not the original
          principal. That's why the interest column shrinks every month while the EMI amount stays
          fixed: more of each payment goes toward principal as the loan matures. The final row is
          adjusted so the balance clears to exactly ₹0.
        </div>
        <table>
          <thead>
            <tr>
              <th>EMI #</th>
              <th>Due date</th>
              <th>EMI amount</th>
              <th>Principal</th>
              <th>Interest</th>
              <th>Balance after</th>
            </tr>
          </thead>
          <tbody>
            {loan.schedule.map((row) => (
              <tr key={row.emiNumber}>
                <td className="num">{row.emiNumber}</td>
                <td className="num">{row.dueDate}</td>
                <td className="num">{formatINR(row.emiAmount)}</td>
                <td className="num">{formatINR(row.principalComponent)}</td>
                <td className="num">{formatINR(row.interestComponent)}</td>
                <td className="num">{formatINR(row.outstandingBalance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
