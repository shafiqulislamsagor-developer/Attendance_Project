import { useEffect, useState, type FormEvent } from "react";
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
import { createShift, deleteShift, listShifts, updateShift } from "../lib/api";
import type { Shift } from "../types";

const emptyForm = {
  name: "",
  startTime: "09:00",
  endTime: "18:00",
  breakMinutes: 60,
  graceMinutes: 15,
};

export function AdminShiftsPage() {
  const [items, setItems] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const data = await listShifts();
      setItems(data.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load shifts",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Shift name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        breakMinutes: Number(form.breakMinutes) || 0,
        graceMinutes: Number(form.graceMinutes) || 0,
      };
      if (editingId) {
        await updateShift(editingId, payload);
        toast.success("Shift updated");
      } else {
        await createShift(payload);
        toast.success("Shift created");
      }
      setEditingId(null);
      setForm(emptyForm);
      await loadShifts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save shift",
      );
    } finally {
      setSaving(false);
    }
  };

  const editShift = (shift: Shift) => {
    setEditingId(shift.id);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      breakMinutes: shift.breakMinutes,
      graceMinutes: shift.graceMinutes,
    });
  };

  const removeShift = async (id: string) => {
    if (!confirm("Delete this shift?")) {
      return;
    }
    try {
      await deleteShift(id);
      toast.success("Shift deleted");
      await loadShifts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete shift",
      );
    }
  };

  return (
    <AppLayout title="Shifts">
      <div className="space-y-8">
        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">Shift setup</h2>
              <p className="mt-1 text-sm text-slate-400">
                Configure start/end time, grace minutes, and work-hours rules.
              </p>
            </div>
            {editingId ? (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
              >
                Cancel edit
              </button>
            ) : null}
          </div>

          <form onSubmit={submit} className="grid gap-4 md:grid-cols-4">
            <label className="block md:col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Name
              </span>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="General Shift"
              />
            </label>
            <label className="block md:col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Start
              </span>
              <input
                className="input"
                type="time"
                value={form.startTime}
                onChange={(e) =>
                  setForm({ ...form, startTime: e.target.value })
                }
              />
            </label>
            <label className="block md:col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                End
              </span>
              <input
                className="input"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              />
            </label>
            <label className="block md:col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Break minutes
              </span>
              <input
                className="input"
                type="number"
                value={form.breakMinutes}
                onChange={(e) =>
                  setForm({ ...form, breakMinutes: Number(e.target.value) })
                }
              />
            </label>
            <label className="block md:col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Grace minutes
              </span>
              <input
                className="input"
                type="number"
                value={form.graceMinutes}
                onChange={(e) =>
                  setForm({ ...form, graceMinutes: Number(e.target.value) })
                }
              />
            </label>
            <div className="md:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update shift"
                    : "Create shift"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">Shifts</h3>
              <p className="text-sm text-slate-400">
                Used for late, overtime, and early-leave calculation.
              </p>
            </div>
            <button
              onClick={loadShifts}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            >
              Refresh
            </button>
          </div>

          <DataTable>
            <DataTableHead>
              <tr>
                <DataTh>Name</DataTh>
                <DataTh>Time</DataTh>
                <DataTh>Break</DataTh>
                <DataTh>Grace</DataTh>
                <DataTh>Effective hours</DataTh>
                <DataTh>Status</DataTh>
                <DataTh>Actions</DataTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <LoadingState colSpan={7} message="Loading shifts..." />
              ) : null}
              {!loading && items.length
                ? items.map((shift) => (
                    <tr key={shift.id}>
                      <DataTd>{shift.name}</DataTd>
                      <DataTd>
                        {shift.startTime} - {shift.endTime}
                      </DataTd>
                      <DataTd>{shift.breakMinutes} min</DataTd>
                      <DataTd>{shift.graceMinutes} min</DataTd>
                      <DataTd>
                        {Math.max(
                          0,
                          Math.round((shift.effectiveMinutes || 0) / 60),
                        )}
                        h
                        <span className="ml-2 text-xs text-slate-500">
                          ({Math.round((shift.officeMinutes || 0) / 60)}h
                          office)
                        </span>
                      </DataTd>
                      <DataTd>{shift.isActive ? "Active" : "Inactive"}</DataTd>
                      <DataTd>
                        <div className="flex gap-3 text-sm">
                          <button
                            onClick={() => editShift(shift)}
                            className="text-cyan-300 hover:text-cyan-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => removeShift(shift.id)}
                            className="text-rose-300 hover:text-rose-200"
                          >
                            Delete
                          </button>
                        </div>
                      </DataTd>
                    </tr>
                  ))
                : null}
              {!loading && !items.length ? (
                <EmptyState colSpan={6} message="No shifts found." />
              ) : null}
            </DataTableBody>
          </DataTable>
        </section>
      </div>
    </AppLayout>
  );
}
