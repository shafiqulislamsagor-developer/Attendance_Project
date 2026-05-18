import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { AppLayout } from "../components/layout/AppLayout";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  DataTd,
  DataTh,
  EmptyState,
  LoadingState,
} from "../components/table/DataTable";
import {
  approveAttendance,
  listAttendance,
  listEmployees,
  resolveUploadUrl,
} from "../lib/api";
import { formatDeviceInfoLabel } from "../lib/device";
import type { Attendance, User } from "../types";

function minutesToHours(minutes?: number) {
  if (!minutes) {
    return "0h 0m";
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export function AdminAttendancePage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  const employeeMap = useMemo(() => {
    const map = new Map<string, User>();
    employees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [employees]);

  async function loadAttendance() {
    setLoading(true);
    try {
      const [attendanceData, employeeData] = await Promise.all([
        listAttendance({ limit: 300 }),
        listEmployees({ limit: 500 }),
      ]);
      setAttendance(attendanceData.items);
      setEmployees(employeeData.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load attendance",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance();
  }, []);

  const takeAction = async (
    attendanceId: string,
    action: "approve" | "reject" | "suspicious",
  ) => {
    const nextState =
      action === "approve"
        ? { status: "present", approvalStatus: "approved" }
        : action === "reject"
          ? { status: "rejected", approvalStatus: "rejected" }
          : { status: "suspicious", approvalStatus: "suspicious" };

    setAttendance((prev) =>
      prev.map((item) =>
        item.id === attendanceId
          ? {
              ...item,
              ...nextState,
            }
          : item,
      ),
    );
    try {
      await approveAttendance(attendanceId, {
        action,
        status: nextState.status,
      });
      toast.success(`Attendance ${action}d`);
      setActionMenuId(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
      await loadAttendance();
    }
  };

  return (
    <AppLayout title="Attendance & Approval">
      <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Employee attendance monitoring
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Review, verify and approve employee attendance records.
            </p>
          </div>
          <button
            onClick={loadAttendance}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        <DataTable>
          <DataTableHead>
            <tr>
              <DataTh>Employee</DataTh>
              <DataTh>Device</DataTh>
              <DataTh>Photo</DataTh>
              <DataTh>Clock In</DataTh>
              <DataTh>Clock Out</DataTh>
              <DataTh>Work Hours</DataTh>
              <DataTh>Late</DataTh>
              <DataTh>Overtime</DataTh>
              <DataTh>Location</DataTh>
              <DataTh>Status</DataTh>
              <DataTh>Approval</DataTh>
              <DataTh>Actions</DataTh>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <LoadingState colSpan={12} message="Loading attendance..." />
            ) : null}
            {!loading &&
              attendance.map((item) => {
                const employee = employeeMap.get(item.employeeId);
                const mapsUrl = `https://maps.google.com/?q=${item.latitude},${item.longitude}`;
                return (
                  <tr key={item.id}>
                    <DataTd>
                      <div className="font-medium text-white">
                        {employee?.name || item.employeeId}
                      </div>
                      <div className="text-xs text-slate-400">
                        {employee?.email || "No email"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {employee?.phone || "No phone"}
                      </div>
                    </DataTd>
                    <DataTd>
                      <span
                        className="inline-block max-w-56 truncate"
                        title={item.deviceInfo || "-"}
                      >
                        {formatDeviceInfoLabel(item.deviceInfo)}
                      </span>
                    </DataTd>
                    <DataTd>
                      {item.image ? (
                        <a
                          href={resolveUploadUrl(item.image)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={resolveUploadUrl(item.image)}
                            alt="proof"
                            className="h-12 w-12 rounded-xl object-cover"
                          />
                        </a>
                      ) : (
                        "-"
                      )}
                    </DataTd>
                    <DataTd>{new Date(item.clockIn).toLocaleString()}</DataTd>
                    <DataTd>
                      {item.clockOut
                        ? new Date(item.clockOut).toLocaleString()
                        : "-"}
                    </DataTd>
                    <DataTd>{minutesToHours(item.workDuration)}</DataTd>
                    <DataTd>{item.lateMinutes || 0}m</DataTd>
                    <DataTd>{item.overtimeMinutes || 0}m</DataTd>
                    <DataTd>
                      <div
                        className="max-w-56 text-xs text-slate-300"
                        title={item.formattedAddress || "-"}
                      >
                        {item.city || ""} {item.area ? `, ${item.area}` : ""}
                      </div>
                      {item.geoFenceStatus ? (
                        <div className="mt-1 text-xs uppercase tracking-[0.2em] text-cyan-300">
                          {item.geoFenceStatus === "outside"
                            ? "Outside office"
                            : item.geoFenceStatus === "inside"
                              ? "Within office"
                              : "Geo-fence unknown"}
                        </div>
                      ) : null}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-cyan-300 hover:text-cyan-200"
                      >
                        Open Map
                      </a>
                    </DataTd>
                    <DataTd>{item.status}</DataTd>
                    <DataTd>{item.approvalStatus || "pending"}</DataTd>
                    <DataTd>
                      <div className="relative flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
                          {item.approvalStatus || "pending"}
                        </span>
                        <button
                          onClick={() =>
                            setActionMenuId((current) =>
                              current === item.id ? null : item.id,
                            )
                          }
                          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs text-white transition hover:bg-white/10"
                        >
                          Edit
                        </button>
                        {actionMenuId === item.id ? (
                          <div className="absolute right-0 top-10 z-20 w-40 rounded-2xl border border-white/10 bg-slate-950 p-2 shadow-2xl shadow-black/30">
                            <button
                              onClick={() => takeAction(item.id, "approve")}
                              className="flex w-full rounded-xl px-3 py-2 text-left text-xs text-emerald-200 transition hover:bg-emerald-500/10"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => takeAction(item.id, "reject")}
                              className="flex w-full rounded-xl px-3 py-2 text-left text-xs text-rose-200 transition hover:bg-rose-500/10"
                            >
                              Reject
                            </button>
                            <button
                              onClick={() => takeAction(item.id, "suspicious")}
                              className="flex w-full rounded-xl px-3 py-2 text-left text-xs text-amber-100 transition hover:bg-amber-500/10"
                            >
                              Suspicious
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </DataTd>
                  </tr>
                );
              })}
            {!loading && !attendance.length ? (
              <EmptyState colSpan={12} message="No attendance records found." />
            ) : null}
          </DataTableBody>
        </DataTable>
      </section>
    </AppLayout>
  );
}
