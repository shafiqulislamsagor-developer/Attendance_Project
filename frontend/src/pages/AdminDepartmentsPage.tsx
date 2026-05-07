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
import {
  createDepartment,
  deleteDepartment,
  listDepartments,
  updateDepartment,
} from "../lib/api";
import type { Department } from "../types";

const emptyForm = { name: "", code: "" };

export function AdminDepartmentsPage() {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const data = await listDepartments();
      setItems(data.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load departments",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Department name is required");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await updateDepartment(editingId, {
          name: form.name.trim(),
          code: form.code.trim(),
        });
        toast.success("Department updated");
      } else {
        await createDepartment({
          name: form.name.trim(),
          code: form.code.trim(),
        });
        toast.success("Department created");
      }
      setEditingId(null);
      setForm(emptyForm);
      await loadDepartments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to save department",
      );
    } finally {
      setSaving(false);
    }
  };

  const editDepartment = (department: Department) => {
    setEditingId(department.id);
    setForm({ name: department.name, code: department.code });
  };

  const removeDepartment = async (id: string) => {
    if (!confirm("Delete this department?")) {
      return;
    }
    try {
      await deleteDepartment(id);
      toast.success("Department deleted");
      await loadDepartments();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete department",
      );
    }
  };

  return (
    <AppLayout title="Departments">
      <div className="space-y-8">
        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Department setup
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Create and manage company departments.
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

          <form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
            <label className="block md:col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Department name
              </span>
              <input
                className="input"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Human Resources"
              />
            </label>
            <label className="block md:col-span-1">
              <span className="mb-2 block text-sm font-medium text-slate-300">
                Code
              </span>
              <input
                className="input"
                value={form.code}
                onChange={(event) =>
                  setForm({ ...form, code: event.target.value })
                }
                placeholder="HR"
              />
            </label>
            <div className="md:col-span-1 md:self-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update department"
                    : "Create department"}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xl font-semibold text-white">Departments</h3>
              <p className="text-sm text-slate-400">
                Used across employee assignment and analytics.
              </p>
            </div>
            <button
              onClick={loadDepartments}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white"
            >
              Refresh
            </button>
          </div>

          <DataTable>
            <DataTableHead>
              <tr>
                <DataTh>Name</DataTh>
                <DataTh>Code</DataTh>
                <DataTh>Status</DataTh>
                <DataTh>Actions</DataTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <LoadingState colSpan={4} message="Loading departments..." />
              ) : null}
              {!loading && items.length
                ? items.map((department) => (
                    <tr key={department.id}>
                      <DataTd>{department.name}</DataTd>
                      <DataTd>{department.code}</DataTd>
                      <DataTd>
                        <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                          {department.isActive ? "Active" : "Inactive"}
                        </span>
                      </DataTd>
                      <DataTd>
                        <div className="flex gap-3 text-sm">
                          <button
                            onClick={() => editDepartment(department)}
                            className="text-cyan-300 hover:text-cyan-200"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => removeDepartment(department.id)}
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
                <EmptyState colSpan={4} message="No departments found." />
              ) : null}
            </DataTableBody>
          </DataTable>
        </section>
      </div>
    </AppLayout>
  );
}
