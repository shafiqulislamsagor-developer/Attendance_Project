import { useEffect, useState } from "react";
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
import { listEmployees, listLeaves, reviewLeaveRequest } from "../lib/api";
import type { LeaveRequest, User } from "../types";

export function AdminLeavesPage() {
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const [leaveData, employeeData] = await Promise.all([
        listLeaves(),
        listEmployees({ limit: 500 }),
      ]);
      setItems(leaveData.items);
      setEmployees(employeeData.items);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load leave requests",
      );
    } finally {
      setLoading(false);
    }
  };

  const employeeMap = new Map(
    employees.map((employee) => [employee.id, employee]),
  );

  useEffect(() => {
    loadLeaves();
  }, []);

  const review = async (id: string, status: "approved" | "rejected") => {
    setBusyId(id);
    try {
      await reviewLeaveRequest(id, {
        status,
        reason: status === "rejected" ? "Reviewed by admin" : undefined,
      });
      toast.success(`Leave ${status}`);
      await loadLeaves();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update leave request",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppLayout title="Leave Approvals">
      <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              Leave requests
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Review employee leave requests and update leave balances
              automatically.
            </p>
          </div>
          <button
            onClick={loadLeaves}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
          >
            Refresh
          </button>
        </div>

        <DataTable>
          <DataTableHead>
            <tr>
              <DataTh>Employee</DataTh>
              <DataTh>Type</DataTh>
              <DataTh>Range</DataTh>
              <DataTh>Days</DataTh>
              <DataTh>Reason</DataTh>
              <DataTh>Status</DataTh>
              <DataTh>Actions</DataTh>
            </tr>
          </DataTableHead>
          <DataTableBody>
            {loading ? (
              <LoadingState colSpan={7} message="Loading leave requests..." />
            ) : null}
            {!loading && items.length
              ? items.map((item) => (
                  <tr key={item.id}>
                    <DataTd>
                      <div className="font-medium text-white">
                        {employeeMap.get(item.employeeId)?.name ||
                          item.employeeId}
                      </div>
                      <div className="text-xs text-slate-500">
                        {employeeMap.get(item.employeeId)?.department || "-"}
                      </div>
                    </DataTd>
                    <DataTd>{item.leaveType}</DataTd>
                    <DataTd>
                      {new Date(item.fromDate).toLocaleDateString()} -{" "}
                      {new Date(item.toDate).toLocaleDateString()}
                    </DataTd>
                    <DataTd>
                      {item.totalDays ||
                        Math.max(
                          1,
                          Math.round(
                            (new Date(item.toDate).getTime() -
                              new Date(item.fromDate).getTime()) /
                              86400000,
                          ) + 1,
                        )}{" "}
                      days
                    </DataTd>
                    <DataTd>{item.reason}</DataTd>
                    <DataTd>{item.status}</DataTd>
                    <DataTd>
                      {item.status === "pending" ? (
                        <div className="flex gap-2 text-sm">
                          <button
                            onClick={() => review(item.id, "approved")}
                            disabled={busyId === item.id}
                            className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => review(item.id, "rejected")}
                            disabled={busyId === item.id}
                            className="rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-1 text-rose-100"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Reviewed</span>
                      )}
                    </DataTd>
                  </tr>
                ))
              : null}
            {!loading && !items.length ? (
              <EmptyState colSpan={7} message="No leave requests found." />
            ) : null}
          </DataTableBody>
        </DataTable>
      </section>
    </AppLayout>
  );
}
