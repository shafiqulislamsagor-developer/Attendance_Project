import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="max-w-xl rounded-4xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-cyan-950/20">
        <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
          404
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-slate-400">
          The route you requested does not exist.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-flex rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
