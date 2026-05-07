import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
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
import { createEmployee, deleteEmployee, listEmployees } from "../lib/api";
import type { EmployeeFormValues, User } from "../types";

const employeeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "employee"]),
  employeeCode: z.string().optional(),
  department: z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

export function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<User[]>([]);
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

  async function loadEmployees() {
    setLoading(true);
    try {
      const data = await listEmployees({ limit: 200 });
      setEmployees(data.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load employees",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const onCreateEmployee = async (values: EmployeeForm) => {
    try {
      await createEmployee(values as EmployeeFormValues);
      toast.success("Employee account created");
      reset();
      await loadEmployees();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create employee",
      );
    }
  };

  const onDeleteEmployee = async (employee: User) => {
    if (!employee.isDelete) {
      toast.error("This user cannot be deleted");
      return;
    }

    if (!confirm("Delete this employee account?")) {
      return;
    }

    try {
      await deleteEmployee(employee.id);
      toast.success("Employee deleted");
      await loadEmployees();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to delete employee",
      );
    }
  };

  return (
    <AppLayout title="Employees">
      <div className="space-y-8">
        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-white">
              Create employee account
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Add admins and employees with department and employee code.
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
        </section>

        <section className="rounded-4xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Employee table
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Manage active accounts and roles.
              </p>
            </div>
            <button
              onClick={loadEmployees}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
            >
              Refresh
            </button>
          </div>

          <DataTable>
            <DataTableHead>
              <tr>
                <DataTh>Employee</DataTh>
                <DataTh>Role</DataTh>
                <DataTh>Department</DataTh>
                <DataTh>Status</DataTh>
                <DataTh />
              </tr>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <LoadingState colSpan={5} message="Loading employees..." />
              ) : null}
              {!loading &&
                employees.map((employee) => (
                  <tr key={employee.id}>
                    <DataTd>
                      <div className="font-medium text-white">
                        {employee.name}
                      </div>
                      <div
                        className="max-w-60 truncate text-slate-400"
                        title={employee.email}
                      >
                        {employee.email}
                      </div>
                      <div className="text-xs text-slate-500">
                        {employee.employeeCode || "No code"}
                      </div>
                    </DataTd>
                    <DataTd>{employee.role}</DataTd>
                    <DataTd>{employee.department || "-"}</DataTd>
                    <DataTd>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-100">
                        {employee.isActive ? "Active" : "Inactive"}
                      </span>
                    </DataTd>
                    <DataTd>
                      <button
                        onClick={() => onDeleteEmployee(employee)}
                        disabled={!employee.isDelete}
                        title={
                          employee.isDelete
                            ? "Delete employee"
                            : "This user is protected from deletion"
                        }
                        className="text-sm text-rose-300 transition hover:text-rose-200 disabled:cursor-not-allowed disabled:text-slate-500"
                      >
                        {employee.isDelete ? "Delete" : "Locked"}
                      </button>
                    </DataTd>
                  </tr>
                ))}
              {!loading && !employees.length ? (
                <EmptyState colSpan={5} message="No employees found." />
              ) : null}
            </DataTableBody>
          </DataTable>
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
