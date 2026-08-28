import { useEffect, useState } from "react";
import { api } from "../api.js";
import { formatINR } from "../utils/currency.js";

export default function Report() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMemberOutstandingReport()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  function exportCsv() {
    const header = ["Member ID", "Member Name", "Loan Count", "Total Outstanding (INR)"];
    const lines = rows.map((r) => [r.memberCode, r.memberName, r.loanCount, r.totalOutstanding]);

    // Plain CSV — commas in values aren't expected here (names/IDs are
    // simple), but we still quote text fields defensively.
    const csvContent = [header, ...lines]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `member-outstanding-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const grandTotal = rows.reduce((sum, r) => sum + r.totalOutstanding, 0);

  return (
    <>
      <div className="page-header">
        <h1>Report</h1>
        <p>Member-wise outstanding across all their loans.</p>
      </div>

      <div className="panel">
        <div className="section-actions">
          <div className="panel-title" style={{ marginBottom: 0 }}>
            Member-wise outstanding
          </div>
          <button className="btn secondary" onClick={exportCsv} disabled={rows.length === 0}>
            Export to CSV
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No members yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Member</th>
                <th>Member ID</th>
                <th>Loans</th>
                <th>Total outstanding</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.memberId}>
                  <td>{r.memberName}</td>
                  <td className="num">{r.memberCode}</td>
                  <td className="num">{r.loanCount}</td>
                  <td className="num">{formatINR(r.totalOutstanding)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} style={{ fontWeight: 600 }}>
                  Grand total
                </td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {formatINR(grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
