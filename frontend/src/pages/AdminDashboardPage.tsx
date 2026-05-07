import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { StatCard } from "../components/dashboard/StatCard";
import { AppLayout } from "../components/layout/AppLayout";
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
          <StatCard label="Total Employees" value={analytics?.totalEmployees ?? 0} />
          <StatCard label="Present Today" value={analytics?.presentToday ?? 0} />
          <StatCard label="Absent Today" value={analytics?.absentToday ?? 0} />
          <StatCard
            label="Pending Approvals"
            value={analytics?.pendingApprovals ?? 0}
          />
          <StatCard label="Late Employees" value={analytics?.lateEmployees ?? 0} />
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
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold text-white">Weekly Attendance</h2>
            <p className="mb-4 text-sm text-slate-400">Approved attendance trend for last 7 days.</p>
            {loading ? (
              <div className="text-slate-400">Loading chart...</div>
            ) : (
              <div className="space-y-3">
                {analytics?.weeklyAttendanceChart.map((point) => (
                  <div key={point.label}>
                    <div className="mb-1 flex justify-between text-xs text-slate-300">
                      <span>{point.label}</span>
                      <span>{point.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full bg-cyan-400"
                        style={{
                          width: `${Math.min(100, (point.value / Math.max(1, analytics.totalEmployees || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-2xl font-semibold text-white">Office Time Rules</h2>
            <p className="mb-4 text-sm text-slate-400">Manage late, overtime and minimum work-hour policies.</p>
            {office ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs uppercase text-slate-400">Office Start</span>
                  <input
                    className="input"
                    value={office.officeStartTime}
                    onChange={(e) =>
                      setOffice({ ...office, officeStartTime: e.target.value })
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs uppercase text-slate-400">Office End</span>
                  <input
                    className="input"
                    value={office.officeEndTime}
                    onChange={(e) =>
                      setOffice({ ...office, officeEndTime: e.target.value })
                    }
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs uppercase text-slate-400">Grace Minutes</span>
                  <input
                    className="input"
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
                  <span className="mb-1 block text-xs uppercase text-slate-400">Minimum Work Hours</span>
                  <input
                    className="input"
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
                  className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            ) : (
              <div className="text-slate-400">Loading settings...</div>
            )}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Employee Performance</h3>
            <div className="space-y-3">
              {analytics?.employeePerformanceChart.slice(0, 8).map((metric) => (
                <div key={metric.employeeId} className="flex justify-between text-sm text-slate-200">
                  <Link to={`/employees/${metric.employeeId}`} className="text-cyan-300 hover:text-cyan-200">
                    {metric.name}
                  </Link>
                  <span>{Math.round(metric.value / 60)}h</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-4xl border border-white/10 bg-white/5 p-6">
            <h3 className="mb-4 text-xl font-semibold text-white">Quick Links</h3>
            <div className="grid gap-3">
              <Link to="/attendance" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                Review Attendance Approvals
              </Link>
              <Link to="/employees" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white">
                Open Employee Directory
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
