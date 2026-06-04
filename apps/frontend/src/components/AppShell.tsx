import { FormEvent, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { BellRing, Building2, CalendarDays, ClipboardList, Home, Search, Settings } from "lucide-react";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/structures", label: "Structures", icon: Building2 },
  { to: "/search", label: "Search", icon: Search },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/scheduler", label: "Scheduler", icon: BellRing },
  { to: "/settings", label: "Settings", icon: Settings }
];

export function AppShell() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

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
          <form className="global-search" onSubmit={submit}>
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Global search" />
          </form>
          <div className="local-pill">Local SQLite</div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
