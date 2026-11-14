
import { Outlet } from "react-router";
import Sidebar from "../components/Sidebar";
import "../components/Sidebar.css";

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />

      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
}
