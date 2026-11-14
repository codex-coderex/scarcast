import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
import "./AppLayout.css";

export default function AppLayout() {
  return (
    <div className="scarcast-app-shell">
      <Sidebar />
      <main className="scarcast-app-main" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
