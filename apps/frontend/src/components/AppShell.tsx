import { NavLink, Outlet } from "react-router-dom";
import { BellRing, Building2, CalendarDays, ClipboardList, Clock3, Home, Search } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/activity-timeline", label: "Activity Timeline", icon: Clock3 },
  { to: "/scheduler", label: "Scheduler", icon: BellRing },
  { to: "/structures", label: "Structures", icon: Building2 }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <ClipboardList size={24} />
          <div>
            <strong>Parking Maintenance</strong>
            <span>Operations</span>
          </div>
        </div>
        <nav>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="main-area">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
