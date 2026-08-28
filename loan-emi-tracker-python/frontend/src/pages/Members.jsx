import { useEffect, useState } from "react";
import { api } from "../api.js";
import { formatINR } from "../utils/currency.js";

const EMPTY_FORM = { name: "", memberCode: "", monthlySalary: "" };

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function loadMembers() {
    setLoading(true);
    api
      .getMembers()
      .then(setMembers)
      .finally(() => setLoading(false));
  }

  useEffect(loadMembers, []);

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    // Basic validation — no empty required fields.
    if (!form.name.trim() || !form.memberCode.trim() || !form.monthlySalary) {
      setError("Name, member ID, and monthly salary are all required.");
      return;
    }
    if (Number(form.monthlySalary) <= 0) {
      setError("Monthly salary must be a positive number.");
      return;
    }

    setSubmitting(true);
    try {
      await api.addMember({
        name: form.name.trim(),
        memberCode: form.memberCode.trim(),
        monthlySalary: Number(form.monthlySalary),
      });
      setForm(EMPTY_FORM);
      loadMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Members</h1>
        <p>Everyone eligible to take a loan.</p>
      </div>

      <div className="panel">
        <div className="panel-title">Add a member</div>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <label>
              Full name
              <input value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="e.g. Anjali Deshmukh" />
            </label>
            <label>
              Member / employee ID
              <input value={form.memberCode} onChange={(e) => updateField("memberCode", e.target.value)} placeholder="e.g. EMP-104" />
            </label>
            <label>
              Monthly salary (₹)
              <input
                type="number"
                min="1"
                value={form.monthlySalary}
                onChange={(e) => updateField("monthlySalary", e.target.value)}
                placeholder="e.g. 42000"
              />
            </label>
          </div>
          {error && <div className="error-text">{error}</div>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Adding…" : "Add member"}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-title">All members</div>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : members.length === 0 ? (
          <div className="empty-state">No members yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Member ID</th>
                <th>Monthly salary</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td className="num">{m.memberCode}</td>
                  <td className="num">{formatINR(m.monthlySalary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
