import { NavLink } from "react-router";
import "./Sidebar.css";

function NavIcon({ name }) {
  const common = { width: 19, height: 19, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "dashboard") return <svg {...common}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
  if (name === "map") return <svg {...common}><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>;
  if (name === "reports") return <svg {...common}><path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v6h5M9 13h6M9 17h6"/></svg>;
  return null;
}

const items = [
  { to: "/", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/map", label: "Map & Analysis", icon: "map" },
  { to: "/reports", label: "Reports", icon: "reports" },
];

export default function Sidebar() {
  return (
    <aside className="scarcast-sidebar" aria-label="App sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-icon" aria-hidden="true">◢</span>
        <span>SCARCAST<span className="sidebar-brand-dot">.</span></span>
      </div>

      <div className="sidebar-content">
        <p className="sidebar-heading">Workspace</p>
        <nav className="sidebar-navigation" aria-label="Primary navigation">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link${isActive ? " sidebar-link-active" : ""}`}
            >
              <NavIcon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-rule" />
        <div className="sidebar-footer-title">Earth observation</div>
        <p>Investigate terrain changes with satellite evidence.</p>
        <span className="sidebar-footer-subtitle">NASA Space Apps Challenge</span>
      </div>
    </aside>
  );
}
