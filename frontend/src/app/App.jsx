import { Routes, Route } from "react-router";
import AppLayout from "./AppLayout.jsx";
import DashboardPage from "../features/dashboard/DashboardPage.jsx";
import MapPage from "../features/map/MapPage.jsx";
import ReportsPage from "../features/reports/ReportsPage.jsx";

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="map" element={<MapPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
      <Route path="*" element={<p>Page not found</p>} />
    </Routes>
  );
}
