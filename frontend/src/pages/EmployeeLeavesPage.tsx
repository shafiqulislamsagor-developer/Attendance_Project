import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
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
import { useAuth } from "../context/AuthContext";
import { createLeaveRequest, getLeaveBalance, listMyLeaves } from "../lib/api";
import type { LeaveBalance, LeaveRequest } from "../types";

const emptyForm = {
  leaveType: "casual",
  fromDate: "",
  toDate: "",
  reason: "",
  documentUrl: "",
};

export function EmployeeLeavesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadLeaves = async () => {
    if (!user) {
      return;
    }
    setLoading(true);
    try {
      const [history, leaveBalance] = await Promise.all([
        listMyLeaves(),
        getLeaveBalance(user.id, new Date().getFullYear()),
      ]);
      setItems(history.items);
      setBalance(leaveBalance);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load leave data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaves();
  }, [user?.id]);

  const handleDocumentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setForm((current) => ({ ...current, documentUrl: result }));
      toast.success("Document attached");
    };
    reader.onerror = () => toast.error("Unable to read document");
    reader.readAsDataURL(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      toast.error("Leave type, dates, and reason are required");
      return;
    }
    setSaving(true);
    try {
      await createLeaveRequest({
        leaveType: form.leaveType,
        fromDate: new Date(form.fromDate).toISOString(),
        toDate: new Date(form.toDate).toISOString(),
        reason: form.reason.trim(),
        documentUrl: form.documentUrl,
      });
      toast.success("Leave request submitted");
      setForm(emptyForm);
      await loadLeaves();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to request leave",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="My Leave Requests">
      <div className="space-y-8">
        <section className="grid gap-4 md:grid-cols-4">
          <Stat label="Sick" value={balance?.sick ?? 0} />
          <Stat label="Casual" value={balance?.casual ?? 0} />
          <Stat label="Paid" value={balance?.paid ?? 0} />
          <Stat label="Emergency" value={balance?.emergency ?? 0} />
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">Request leave</h2>
            <p className="mt-1 text-sm text-slate-400">
              Submit a leave request with optional supporting document.
            </p>
          </div>

          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Leave type
              </span>
              <select
                className="input"
                value={form.leaveType}
                onChange={(e) =>
                  setForm({ ...form, leaveType: e.target.value })
                }
              >
                <option value="sick">Sick</option>
                <option value="casual">Casual</option>
                <option value="paid">Paid</option>
                <option value="emergency">Emergency</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Document
              </span>
              <input
                className="input"
                type="file"
                accept="image/*,.pdf"
                onChange={handleDocumentUpload}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                From
              </span>
              <input
                className="input"
                type="date"
                value={form.fromDate}
                onChange={(e) => setForm({ ...form, fromDate: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                To
              </span>
              <input
                className="input"
                type="date"
                value={form.toDate}
                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Reason
              </span>
              <textarea
                className="input min-h-28"
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                placeholder="Explain why you need leave"
              />
            </label>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving ? "Submitting..." : "Submit leave request"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">
                Request history
              </h3>
              <p className="text-sm text-slate-400">
                Track the status of your leave requests.
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
                <DataTh>Type</DataTh>
                <DataTh>Range</DataTh>
                <DataTh>Reason</DataTh>
                <DataTh>Status</DataTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <LoadingState colSpan={4} message="Loading leave requests..." />
              ) : null}
              {!loading && items.length
                ? items.map((item) => (
                    <tr key={item.id}>
                      <DataTd>{item.leaveType}</DataTd>
                      <DataTd>
                        {new Date(item.fromDate).toLocaleDateString()} -{" "}
                        {new Date(item.toDate).toLocaleDateString()}
                      </DataTd>
                      <DataTd>{item.reason}</DataTd>
                      <DataTd>{item.status}</DataTd>
                    </tr>
                  ))
                : null}
              {!loading && !items.length ? (
                <EmptyState colSpan={4} message="No leave requests found." />
              ) : null}
            </DataTableBody>
          </DataTable>
        </section>
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
    </div>
  );
}
