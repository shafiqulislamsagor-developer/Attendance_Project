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
    try {
      await approveAttendance(attendanceId, {
        action,
        status:
          action === "approve"
            ? "present"
            : action === "reject"
              ? "rejected"
              : "suspicious",
      });
      toast.success(`Attendance ${action}d`);
      await loadAttendance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
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
                      <span className="inline-block max-w-56 truncate" title={item.deviceInfo || "-"}>
                        {item.deviceInfo || "-"}
                      </span>
                    </DataTd>
                    <DataTd>
                      {item.image ? (
                        <a href={resolveUploadUrl(item.image)} target="_blank" rel="noreferrer">
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
                      {item.clockOut ? new Date(item.clockOut).toLocaleString() : "-"}
                    </DataTd>
                    <DataTd>{minutesToHours(item.workDuration)}</DataTd>
                    <DataTd>{item.lateMinutes || 0}m</DataTd>
                    <DataTd>{item.overtimeMinutes || 0}m</DataTd>
                    <DataTd>
                      <div className="max-w-56 text-xs text-slate-300" title={item.formattedAddress || "-"}>
                        {item.city || ""} {item.area ? `, ${item.area}` : ""}
                      </div>
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
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => takeAction(item.id, "approve")}
                          className="rounded-lg bg-emerald-500/20 px-2 py-1 text-xs text-emerald-200"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => takeAction(item.id, "reject")}
                          className="rounded-lg bg-rose-500/20 px-2 py-1 text-xs text-rose-200"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => takeAction(item.id, "suspicious")}
                          className="rounded-lg bg-amber-500/20 px-2 py-1 text-xs text-amber-100"
                        >
                          Suspicious
                        </button>
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
