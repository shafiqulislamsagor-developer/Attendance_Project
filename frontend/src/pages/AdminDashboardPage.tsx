import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  AttendanceStatusPieChart,
  WeeklyAttendanceChart,
} from "../components/charts/Charts";
import { StatCard } from "../components/dashboard/StatCard";
import { AppLayout } from "../components/layout/AppLayout";
import { Skeleton } from "../components/ui/Skeleton";
import {
  attendanceAnalytics,
  getOfficeSettings,
  updateOfficeSettings,
} from "../lib/api";
import type { AttendanceAnalytics, OfficeSettings } from "../types";

export function AdminDashboardPage() {
  const [analytics, setAnalytics] = useState<AttendanceAnalytics | null>(null);
  const [office, setOffice] = useState<OfficeSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadOverview() {
    setLoading(true);
    try {
      const [analyticsData, officeData] = await Promise.all([
        attendanceAnalytics(),
        getOfficeSettings(),
      ]);
      setAnalytics(analyticsData);
      setOffice(officeData);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const saveOfficeSettings = async () => {
    if (!office) {
      return;
    }
    setSaving(true);
    try {
      const saved = await updateOfficeSettings(office);
      setOffice(saved);
      toast.success("Office settings updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Admin HR Dashboard">
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="rounded-3xl border border-white/10 bg-white/5 p-5"
              >
                <Skeleton className="h-3 w-28" />
                <Skeleton className="mt-4 h-8 w-20" />
                <Skeleton className="mt-3 h-4 w-36" />
              </div>
            ))
          ) : (
            <>
              <StatCard
                label="Total Employees"
                value={analytics?.totalEmployees ?? 0}
              />
              <StatCard
                label="Present Today"
                value={analytics?.presentToday ?? 0}
              />
              <StatCard
                label="Absent Today"
                value={analytics?.absentToday ?? 0}
              />
              <StatCard
                label="Pending Approvals"
                value={analytics?.pendingApprovals ?? 0}
              />
              <StatCard
                label="Late Employees"
                value={analytics?.lateEmployees ?? 0}
              />
              <StatCard
                label="Perfect Timing"
                value={analytics?.perfectTimingEmployees ?? 0}
              />
              <StatCard
                label="Working Less Time"
                value={analytics?.underTimeEmployees ?? 0}
              />
              <StatCard
                label="Working Overtime"
                value={analytics?.overtimeEmployees ?? 0}
              />
            </>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold text-white">
              Weekly Attendance Trend
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              Approved attendance for last 7 days.
            </p>
            {loading || !analytics?.weeklyAttendanceChart ? (
              <Skeleton className="h-64 w-full rounded-3xl" />
            ) : (
              <WeeklyAttendanceChart
                data={analytics.weeklyAttendanceChart}
                height={300}
              />
            )}
          </div>

          <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold text-white">
              Today's Status
            </h2>
            <p className="mb-4 text-sm text-slate-400">
              Attendance breakdown for today.
            </p>
            {loading || !analytics ? (
              <Skeleton className="h-64 w-full rounded-3xl" />
            ) : (
              <AttendanceStatusPieChart
                present={analytics.presentToday}
                absent={analytics.absentToday}
                late={analytics.lateEmployees}
                height={300}
              />
            )}
          </div>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-2xl font-semibold text-white mb-4">
            Office Time Rules
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            Manage late, overtime and minimum work-hour policies.
          </p>
          {loading && !office ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : office ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs uppercase text-slate-400">
                  Office Start
                </span>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                  value={office.officeStartTime}
                  onChange={(e) =>
                    setOffice({ ...office, officeStartTime: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase text-slate-400">
                  Office End
                </span>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                  value={office.officeEndTime}
                  onChange={(e) =>
                    setOffice({ ...office, officeEndTime: e.target.value })
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase text-slate-400">
                  Grace Minutes
                </span>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                  type="number"
                  value={office.graceMinutes}
                  onChange={(e) =>
                    setOffice({
                      ...office,
                      graceMinutes: Number(e.target.value) || 0,
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs uppercase text-slate-400">
                  Minimum Work Hours
                </span>
                <input
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
                  type="number"
                  value={office.minimumWorkHours}
                  onChange={(e) =>
                    setOffice({
                      ...office,
                      minimumWorkHours: Number(e.target.value) || 8,
                    })
                  }
                />
              </label>
              <button
                onClick={saveOfficeSettings}
                disabled={saving}
                className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          ) : (
            <div className="text-slate-400">Loading settings...</div>
          )}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">
              Top Performers
            </h3>
            <div className="space-y-3">
              {(analytics?.employeePerformanceChart ?? [])
                .slice(0, 8)
                .map((metric) => (
                  <div
                    key={metric.employeeId}
                    className="flex justify-between text-sm text-slate-200"
                  >
                    <span className="text-cyan-300">{metric.name}</span>
                    <span>{Math.round(metric.value / 60)}h</span>
                  </div>
                ))}
            </div>
          </div>
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">
              Quick Links
            </h3>
            <div className="grid gap-3">
              <Link
                to="/attendance"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10"
              >
                Review Attendance Approvals
              </Link>
              <Link
                to="/employees"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10"
              >
                Open Employee Directory
              </Link>
              <Link
                to="/board"
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white hover:bg-white/10"
              >
                View Live Board
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
