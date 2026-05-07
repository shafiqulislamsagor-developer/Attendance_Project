import { zodResolver } from "@hookform/resolvers/zod";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../context/AuthContext";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginForm) => {
    setSubmitting(true);
    try {
      const user = await login(values);
      toast.success(`Welcome back, ${user.name}`);
      navigate(user.role === "admin" ? "/admin" : "/employee", {
        replace: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to login";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_30%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] text-white">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[48px_48px]" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-4 py-10 md:px-8">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Attendance Management System
            </div>
            <div className="max-w-2xl space-y-5">
              <h1 className="text-5xl font-semibold tracking-tight text-white md:text-7xl">
                Clock in with location, selfie, and confidence.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-slate-300">
                A modern attendance platform for admins and employees with JWT
                auth, GPS capture, selfie verification, analytics, and clean
                dashboards.
              </p>
            </div>
            <div className="grid max-w-xl gap-4 sm:grid-cols-3">
              {[
                ["JWT", "Protected sessions"],
                ["GPS", "Location capture"],
                ["Selfie", "Photo proof"],
              ].map(([title, description]) => (
                <div
                  key={title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <div className="text-sm font-semibold text-white">
                    {title}
                  </div>
                  <div className="mt-2 text-sm text-slate-400">
                    {description}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="relative">
            <div className="absolute -inset-6 rounded-4xl bg-cyan-400/10 blur-3xl" />
            <div className="relative rounded-4xl border border-white/10 bg-slate-950/90 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/20">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm uppercase tracking-[0.26em] text-cyan-200/70">
                    Secure login
                  </div>
                  <div className="text-xl font-semibold text-white">
                    Access your workspace
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Email
                  </span>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="admin@company.com"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                  />
                  {errors.email ? (
                    <p className="mt-2 text-sm text-rose-300">
                      {errors.email.message}
                    </p>
                  ) : null}
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-300">
                    Password
                  </span>
                  <input
                    {...register("password")}
                    type="password"
                    placeholder="********"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400"
                  />
                  {errors.password ? (
                    <p className="mt-2 text-sm text-rose-300">
                      {errors.password.message}
                    </p>
                  ) : null}
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                Bootstrap the first admin with{" "}
                <span className="font-semibold text-white">ADMIN_EMAIL</span>{" "}
                and{" "}
                <span className="font-semibold text-white">ADMIN_PASSWORD</span>{" "}
                in the backend environment.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
