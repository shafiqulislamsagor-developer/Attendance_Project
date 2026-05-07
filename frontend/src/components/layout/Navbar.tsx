import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import type { User } from "../../types";

export function Navbar({ title, user }: { title: string; user: User }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            {user.role}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {title}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            {user.name}
          </span>
          <button
            onClick={toggleTheme}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-white transition hover:bg-white/10"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <SunMedium className="h-4 w-4" />
            ) : (
              <MoonStar className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
