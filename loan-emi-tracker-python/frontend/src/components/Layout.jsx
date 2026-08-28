import { NavLink, Outlet } from "react-router-dom";

export default function Layout({ onLogout }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          Ledger<span>.</span>
        </div>
        <div className="sidebar-tag">EMI Tracker</div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
            Dashboard
          </NavLink>
          <NavLink to="/members" className={({ isActive }) => (isActive ? "active" : "")}>
            Members
          </NavLink>
          <NavLink to="/loans" className={({ isActive }) => (isActive ? "active" : "")}>
            Loans
          </NavLink>
          <NavLink to="/report" className={({ isActive }) => (isActive ? "active" : "")}>
            Report
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <span>staff</span>
          <button onClick={onLogout}>Log out</button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
