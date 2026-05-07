import {
  CalendarDays,
  CircleX,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Users,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import type { User } from "../../types";

const baseLink =
  "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200";

export function Sidebar({
  user,
  onLogout,
  onClose,
}: {
  user: User;
  onLogout: () => void;
  onClose?: () => void;
}) {
  const links =
    user.role === "admin"
      ? [
          { to: "/admin", label: "Overview", icon: LayoutDashboard },
          { to: "/employees", label: "Employees", icon: Users },
          { to: "/attendance", label: "Attendance", icon: CalendarDays },
        ]
      : [{ to: "/employee", label: "Dashboard", icon: Fingerprint }];

  return (
    <aside className="flex h-full w-full flex-col border-r border-white/10 bg-slate-950/95 p-5 text-white backdrop-blur-xl lg:w-72">
      <div className="mb-3 flex items-center justify-end lg:hidden">
        <button
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white"
          aria-label="Close sidebar"
        >
          <CircleX className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-8 rounded-3xl border border-cyan-400/20 bg-linear-to-br from-cyan-500/15 via-slate-900 to-emerald-500/10 p-4 shadow-2xl shadow-cyan-950/30">
        <div className="text-xs uppercase tracking-[0.28em] text-cyan-200/70">
          Attendance Management
        </div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">
          ClockFlow
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Clean attendance tracking with GPS and selfie verification.
        </p>
      </div>

      <nav className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/admin"}
              onClick={onClose}
              className={({ isActive }) =>
                `${baseLink} ${isActive ? "bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20" : "text-slate-300 hover:bg-white/10 hover:text-white"}`
              }
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="mt-auto rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
          Signed in as
        </div>
        <div
          className="mt-1 max-w-full truncate text-lg font-semibold"
          title={user.name}
        >
          {user.name}
        </div>
        <div
          className="max-w-full truncate text-sm text-slate-400"
          title={user.email}
        >
          {user.email}
        </div>
        <button
          onClick={onLogout}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
