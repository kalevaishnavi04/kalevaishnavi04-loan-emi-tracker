import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Members from "./pages/Members.jsx";
import Loans from "./pages/Loans.jsx";
import LoanDetail from "./pages/LoanDetail.jsx";
import Report from "./pages/Report.jsx";

export default function App() {
  // Auth state kept simple on purpose: a token in localStorage.
  // No real session/JWT verification — matches the assignment's
  // "mock/hardcoded login is fine" allowance.
  const [token, setToken] = useState(() => localStorage.getItem("emi_token"));

  function handleLogin(newToken) {
    localStorage.setItem("emi_token", newToken);
    setToken(newToken);
  }

  function handleLogout() {
    localStorage.removeItem("emi_token");
    setToken(null);
  }

  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Routes>
      <Route element={<Layout onLogout={handleLogout} />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/members" element={<Members />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/loans/:id" element={<LoanDetail />} />
        <Route path="/report" element={<Report />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
