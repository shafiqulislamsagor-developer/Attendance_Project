import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Navbar } from "./Navbar";
import { Sidebar } from "./Sidebar";

export function AppLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { user, logout, logoutAll } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white dark:text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {sidebarOpen ? (
          <button
            aria-label="Close sidebar"
            className="fixed inset-0 z-20 bg-slate-950/70 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}

        <div
          className={`fixed inset-y-0 left-0 z-30 w-76 max-w-[86vw] transform transition duration-200 lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <Sidebar
            user={user}
            onLogout={logout}
            onLogoutAll={logoutAll}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar
            title={title}
            user={user}
            onOpenSidebar={() => setSidebarOpen(true)}
          />
          <main className="flex-1 px-4 py-6 md:px-6 xl:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
