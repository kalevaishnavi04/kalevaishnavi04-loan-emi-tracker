const BASE_URL = "http://localhost:4000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Something went wrong");
  }
  return data;
}

export const api = {
  login: (username, password) =>
    request("/login", { method: "POST", body: JSON.stringify({ username, password }) }),

  getMembers: () => request("/members"),
  addMember: (member) => request("/members", { method: "POST", body: JSON.stringify(member) }),

  getLoans: () => request("/loans"),
  addLoan: (loan) => request("/loans", { method: "POST", body: JSON.stringify(loan) }),
  getLoan: (id) => request(`/loans/${id}`),
  forecloseLoan: (id) => request(`/loans/${id}/foreclose`, { method: "POST" }),

  getMemberOutstandingReport: () => request("/report/member-outstanding"),
};
