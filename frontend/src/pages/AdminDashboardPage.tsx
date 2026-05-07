import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { StatCard } from "../components/dashboard/StatCard";
import { AppLayout } from "../components/layout/AppLayout";
import {
  attendanceSummary,
  createEmployee,
  deleteEmployee,
  listAttendance,
  listEmployees,
  resolveUploadUrl,
} from "../lib/api";
import type {
  Attendance,
  AttendanceSummary,
  EmployeeFormValues,
  User,
} from "../types";

const employeeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "employee"]),
  employeeCode: z.string().optional(),
  department: z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

export function AdminDashboardPage() {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      role: "employee",
      employeeCode: "",
      department: "",
    },
  });

  async function loadData() {
    setLoading(true);
    try {
      const [summaryResponse, employeeResponse, attendanceResponse] =
        await Promise.all([
          attendanceSummary(),
          listEmployees({ limit: 100 }),
          listAttendance({ limit: 20 }),
        ]);
      setSummary(summaryResponse);
      setEmployees(employeeResponse.items);
      setAttendance(attendanceResponse.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const onCreateEmployee = async (values: EmployeeForm) => {
    try {
      await createEmployee(values as EmployeeFormValues);
      toast.success("Employee account created");
      reset();
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create employee",
      );
    }
  };

  const handleRemoveEmployee = async (id: string) => {
    if (!confirm("Delete this employee account?")) {
      return;
    }
    try {
      await deleteEmployee(id);
      toast.success("Employee deleted");
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete employee",
      );
    }
  };

  const clockedIn = attendance.filter(
    (item) => item.status === "clocked-in",
  ).length;
  const clockedOut = attendance.filter(
    (item) => item.status === "clocked-out",
  ).length;

  return (
    <AppLayout title="Admin Dashboard">
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total employees"
            value={summary?.totalEmployees ?? 0}
            helper="Registered accounts"
          />
          <StatCard
            label="Attendance logs"
            value={summary?.totalRecords ?? 0}
            helper="All tracked sessions"
          />
          <StatCard
            label="Clocked in"
            value={clockedIn}
            helper="Active sessions today"
          />
          <StatCard
            label="Clocked out"
            value={clockedOut}
            helper="Completed sessions today"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-white">
                Create employee account
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Admin onboarding for employees and internal supervisors.
              </p>
            </div>

            <form
              onSubmit={handleSubmit(onCreateEmployee)}
              className="grid gap-4 md:grid-cols-2"
            >
              <Field label="Full name" error={errors.name?.message}>
                <input
                  {...register("name")}
                  className="input"
                  placeholder="Jane Doe"
                />
              </Field>
              <Field label="Email" error={errors.email?.message}>
                <input
                  {...register("email")}
                  type="email"
                  className="input"
                  placeholder="jane@company.com"
                />
              </Field>
              <Field label="Password" error={errors.password?.message}>
                <input
                  {...register("password")}
                  type="password"
                  className="input"
                  placeholder="Minimum 8 characters"
                />
              </Field>
              <Field label="Role" error={errors.role?.message}>
                <select {...register("role")} className="input">
                  <option value="employee">Employee</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
              <Field label="Employee code" error={errors.employeeCode?.message}>
                <input
                  {...register("employeeCode")}
                  className="input"
                  placeholder="EMP-001"
                />
              </Field>
              <Field label="Department" error={errors.department?.message}>
                <input
                  {...register("department")}
                  className="input"
                  placeholder="Operations"
                />
              </Field>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
                >
                  {isSubmitting ? "Creating account..." : "Create employee"}
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  Attendance analytics
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Recent sessions with location and selfie proof.
                </p>
              </div>
              <button
                onClick={loadData}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              >
                Refresh
              </button>
            </div>

            {loading ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-slate-400">
                Loading dashboard...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-sm text-slate-400">Clocked in</div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {clockedIn}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="text-sm text-slate-400">Clocked out</div>
                    <div className="mt-2 text-3xl font-semibold text-white">
                      {clockedOut}
                    </div>
                  </div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-sm text-slate-400">Today's mix</div>
                  <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{
                        width: `${attendance.length ? (clockedIn / attendance.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Employee table
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Manage active accounts and account status.
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm text-slate-200">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.24em] text-slate-400">
                <tr>
                  <Th>Employee</Th>
                  <Th>Role</Th>
                  <Th>Department</Th>
                  <Th>Status</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 bg-slate-950/40">
                {employees.map((employee) => (
                  <tr key={employee.id} className="align-top">
                    <Td>
                      <div className="font-medium text-white">
                        {employee.name}
                      </div>
                      <div className="text-slate-400">{employee.email}</div>
                      <div className="text-xs text-slate-500">
                        {employee.employeeCode || "No code"}
                      </div>
                    </Td>
                    <Td>{employee.role}</Td>
                    <Td>{employee.department || "—"}</Td>
                    <Td>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                        {employee.isActive ? "Active" : "Inactive"}
                      </span>
                    </Td>
                    <Td>
                      <button
                        onClick={() => handleRemoveEmployee(employee.id)}
                        className="text-sm text-rose-300 hover:text-rose-200"
                      >
                        Delete
                      </button>
                    </Td>
                  </tr>
                ))}
                {!employees.length ? (
                  <tr>
                    <Td colSpan={5}>
                      <div className="py-10 text-center text-slate-400">
                        No employees yet.
                      </div>
                    </Td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5">
            <h2 className="text-2xl font-semibold text-white">
              Attendance table
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Location, timestamp, and selfie verification for each session.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {attendance.map((item) => (
              <AttendanceCard key={item.id} attendance={item} />
            ))}
            {!attendance.length ? (
              <div className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-slate-400 md:col-span-2 xl:col-span-3">
                No attendance logs available yet.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block md:col-span-1">
      <span className="mb-2 block text-sm font-medium text-slate-300">
        {label}
      </span>
      {children}
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </label>
  );
}

function Th({ children }: { children?: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>;
}

function Td({ children, colSpan }: { children: ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className="px-4 py-4 align-top">
      {children}
    </td>
  );
}

function AttendanceCard({ attendance }: { attendance: Attendance }) {
  const map =
    attendance.latitude && attendance.longitude
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${attendance.longitude - 0.01},${attendance.latitude - 0.01},${attendance.longitude + 0.01},${attendance.latitude + 0.01}&layer=mapnik&marker=${attendance.latitude},${attendance.longitude}`
      : "";

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40 shadow-2xl shadow-cyan-950/10">
      <div className="aspect-16/10 bg-slate-900">
        {attendance.image ? (
          <img
            src={resolveUploadUrl(attendance.image)}
            alt="Attendance selfie"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            No selfie available
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium text-white">
              {attendance.employeeId}
            </div>
            <div className="text-xs text-slate-400">
              {new Date(attendance.clockIn).toLocaleString()}
            </div>
          </div>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
            {attendance.status}
          </span>
        </div>
        <div className="text-sm text-slate-300">
          {attendance.latitude.toFixed(5)}, {attendance.longitude.toFixed(5)}
        </div>
        <div className="overflow-hidden rounded-2xl border border-white/10">
          {map ? (
            <iframe
              title="Attendance location"
              src={map}
              className="h-44 w-full border-0"
              loading="lazy"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
