import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { formatINR } from "../utils/currency.js";

export default function Dashboard() {
  const [members, setMembers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMembers(), api.getLoans()])
      .then(([m, l]) => {
        setMembers(m);
        setLoans(l);
      })
      .finally(() => setLoading(false));
  }, []);

  const activeLoans = loans.filter((l) => l.status === "Active");
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + l.outstanding, 0);
  const totalDisbursed = loans.reduce((sum, l) => sum + l.principal, 0);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Snapshot of members, active loans, and money outstanding.</p>
      </div>

      {loading ? (
        <div className="empty-state">Loading…</div>
      ) : (
        <>
          <div className="stat-row">
            <div className="stat-card">
              <div className="label">Members</div>
              <div className="value">{members.length}</div>
            </div>
            <div className="stat-card">
              <div className="label">Active loans</div>
              <div className="value">{activeLoans.length}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total disbursed</div>
              <div className="value">{formatINR(totalDisbursed)}</div>
            </div>
            <div className="stat-card">
              <div className="label">Total outstanding</div>
              <div className="value">{formatINR(totalOutstanding)}</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">Recent loans</div>
            {loans.length === 0 ? (
              <div className="empty-state">No loans yet — create one from the Loans page.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Principal</th>
                    <th>EMI</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {loans.slice(0, 5).map((loan) => (
                    <tr key={loan.id}>
                      <td>{loan.memberName}</td>
                      <td className="num">{formatINR(loan.principal)}</td>
                      <td className="num">{formatINR(loan.emi)}</td>
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
      )}
    </>
  );
}
