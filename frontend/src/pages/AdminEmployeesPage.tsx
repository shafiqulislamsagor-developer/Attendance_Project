import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Copy, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { AsyncSelect } from "../components/form/AsyncSelect";
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
  createEmployee,
  deleteEmployee,
  listDepartments,
  listEmployees,
} from "../lib/api";
import type { EmployeeFormValues, User } from "../types";

const employeeSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "employee"]),
  employeeCode: z.string().optional(),
  departmentId: z.string().min(1, "Department is required"),
  department: z.string().min(1, "Department is required"),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

export function AdminEmployeesPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<
    { value: string; label: string; description?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [departmentLoading, setDepartmentLoading] = useState(true);
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      email: "",
      password: generateTemporaryPassword(),
      role: "employee",
      employeeCode: "",
      departmentId: "",
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

  async function loadDepartments() {
    setDepartmentLoading(true);
    try {
      const data = await listDepartments();
      setDepartmentOptions(
        data.items.map((department) => ({
          value: department.id,
          label: department.name,
          description: department.code,
        })),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load departments",
      );
    } finally {
      setDepartmentLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
    loadDepartments();
  }, []);

  const onCreateEmployee = async (values: EmployeeForm) => {
    try {
      await createEmployee(values as EmployeeFormValues);
      toast.success("Employee account created");
      reset({
        name: "",
        email: "",
        password: generateTemporaryPassword(),
        role: "employee",
        employeeCode: "",
        departmentId: "",
        department: "",
      });
      await loadEmployees();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to create employee",
      );
    }
  };

  const selectedDepartmentId = watch("departmentId");

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
            <Field label="Temporary password" error={errors.password?.message}>
              <div className="flex gap-2">
                <input
                  {...register("password")}
                  type="text"
                  className="input"
                  placeholder="Auto-generated password"
                />
                <button
                  type="button"
                  onClick={() =>
                    setValue("password", generateTemporaryPassword(), {
                      shouldValidate: true,
                    })
                  }
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4" />
                  Generate
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                This password will be stored as a temporary value for admin
                visibility.
              </p>
            </Field>
            <Field label="Role" error={errors.role?.message}>
              <select {...register("role")} className="input">
                <option value="employee">Employee</option>
                <option value="admin">Admin</option>
              </select>
            </Field>
            <Field label="Department" error={errors.departmentId?.message}>
              <AsyncSelect
                value={selectedDepartmentId}
                onChange={(option) => {
                  setValue("departmentId", option?.value ?? "", {
                    shouldValidate: true,
                  });
                  setValue("department", option?.label ?? "", {
                    shouldValidate: true,
                  });
                }}
                loadOptions={async () => departmentOptions}
                placeholder="Search departments"
                searchPlaceholder="Type department name or code"
                disabled={departmentLoading}
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
                <DataTh>Password</DataTh>
                <DataTh>Role</DataTh>
                <DataTh>Department</DataTh>
                <DataTh>Status</DataTh>
                <DataTh />
              </tr>
            </DataTableHead>
            <DataTableBody>
              {loading ? (
                <LoadingState colSpan={6} message="Loading employees..." />
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
                    <DataTd>
                      <PasswordCell password={employee.temporaryPassword} />
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
                <EmptyState colSpan={6} message="No employees found." />
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

function PasswordCell({ password }: { password?: string }) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!password) {
    return <span className="text-xs text-slate-500">Not available</span>;
  }

  const masked = "•".repeat(Math.max(8, password.length));
  const copyPassword = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs tracking-[0.15em] text-white">
        {visible ? password : masked}
      </span>
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
        title={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
      <button
        type="button"
        onClick={copyPassword}
        className="rounded-xl border border-white/10 bg-white/5 p-2 text-slate-200 transition hover:bg-white/10"
        title="Copy password"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-300" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

function generateTemporaryPassword() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => charset[value % charset.length]).join("");
}
