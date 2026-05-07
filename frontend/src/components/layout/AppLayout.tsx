import type { ReactNode } from "react";
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
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_28%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white dark:text-white">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <div className="lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:shrink-0">
          <Sidebar user={user} onLogout={logout} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Navbar title={title} user={user} />
          <main className="flex-1 px-4 py-6 md:px-6 xl:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
