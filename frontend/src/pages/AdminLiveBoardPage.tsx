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
import { listAttendance, listEmployees } from "../lib/api";
import type { Attendance, User } from "../types";

export function AdminLiveBoardPage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const activeEmployees = useMemo(
    () => attendance.filter((item) => !item.clockOut),
    [attendance],
  );

  const loadBoard = async () => {
    setLoading(true);
    try {
      const [attendanceData, employeeData] = await Promise.all([
        listAttendance({ limit: 200 }),
        listEmployees({ limit: 500 }),
      ]);
      setAttendance(attendanceData.items);
      setEmployees(employeeData.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load live board",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
    const timer = window.setInterval(loadBoard, 20000);
    return () => window.clearInterval(timer);
  }, []);

  const employeeMap = useMemo(() => {
    const map = new Map<string, User>();
    employees.forEach((employee) => map.set(employee.id, employee));
    return map;
  }, [employees]);

  return (
    <AppLayout title="Live Attendance Board">
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active now" value={activeEmployees.length} />
          <Stat label="Loaded employees" value={employees.length} />
          <Stat label="Total records" value={attendance.length} />
          <Stat label="Refreshing" value="20s" />
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Currently working employees
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                The board refreshes automatically every 20 seconds.
              </p>
            </div>
            <button
              onClick={loadBoard}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            >
              Refresh
            </button>
          </div>

          <DataTable>
            <DataTableHead>
              <tr>
                <DataTh>Employee</DataTh>
                <DataTh>Clock In</DataTh>
                <DataTh>Location</DataTh>
                <DataTh>Approval</DataTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <LoadingState colSpan={4} message="Loading live board..." />
              ) : null}
              {!loading && activeEmployees.length
                ? activeEmployees.map((item) => {
                    const employee = employeeMap.get(item.employeeId);
                    return (
                      <tr key={item.id}>
                        <DataTd>
                          <div className="font-medium text-white">
                            {employee?.name || item.employeeId}
                          </div>
                          <div className="text-xs text-slate-500">
                            {employee?.department || employee?.role}
                          </div>
                        </DataTd>
                        <DataTd>
                          {new Date(item.clockIn).toLocaleTimeString()}
                        </DataTd>
                        <DataTd>
                          {item.city || item.formattedAddress || "Unknown"}
                        </DataTd>
                        <DataTd>{item.approvalStatus || "pending"}</DataTd>
                      </tr>
                    );
                  })
                : null}
              {!loading && !activeEmployees.length ? (
                <EmptyState
                  colSpan={4}
                  message="No active employees at the moment."
                />
              ) : null}
            </DataTableBody>
          </DataTable>
        </section>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}
