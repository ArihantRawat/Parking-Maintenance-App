import { Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ActivityTimelinePage } from "./pages/ActivityTimelinePage";
import { CalendarPage } from "./pages/CalendarPage";
import { HomeDashboard } from "./pages/HomeDashboard";
import { ReportsPage } from "./pages/ReportsPage";
import { SchedulerPage } from "./pages/SchedulerPage";
import { SearchPage } from "./pages/SearchPage";
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
        <Route path="activity-timeline" element={<ActivityTimelinePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="scheduler" element={<SchedulerPage />} />
        <Route path="reports" element={<ReportsPage />} />
      </Route>
    </Routes>
  );
}
