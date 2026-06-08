import { NavLink, Outlet } from "react-router-dom";
import { BellRing, Building2, CalendarDays, ClipboardList, Home, Search } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/structures", label: "Structures", icon: Building2 },
  { to: "/search", label: "Search", icon: Search },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/scheduler", label: "Scheduler", icon: BellRing }
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <ClipboardList size={24} />
          <div>
            <strong>Parking Structure</strong>
            <span>Maintenance</span>
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
        <header className="topbar">
          <div className="local-pill">Local SQLite</div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
