import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { HomeDashboard } from "./pages/HomeDashboard";
import { ReportsPage } from "./pages/ReportsPage";
import { SearchPage } from "./pages/SearchPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StructureDashboard } from "./pages/StructureDashboard";
import { StructureList } from "./pages/StructureList";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomeDashboard />} />
        <Route path="structures" element={<StructureList />} />
        <Route path="structures/:id" element={<StructureDashboard />} />
        <Route path="structures/:id/:tab" element={<StructureDashboard />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
