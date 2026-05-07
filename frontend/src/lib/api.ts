import axios from "axios";
import type {
  Attendance,
  AttendanceSummary,
  AuthResponse,
  ClockOutValues,
  EmployeeFormValues,
  LoginValues,
  User,
} from "../types";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";
const uploadOrigin = baseURL.replace(/\/api\/v1\/?$/, "");
const authStorageKey = "ams-auth";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getAuthToken() {
  return localStorage.getItem(authStorageKey);
}

export function setAuthToken(token: string) {
  localStorage.setItem(authStorageKey, token);
}

export function clearAuthToken() {
  localStorage.removeItem(authStorageKey);
  localStorage.removeItem("ams-user");
}

export function saveUser(user: User) {
  localStorage.setItem("ams-user", JSON.stringify(user));
}

export function loadUser(): User | null {
  const raw = localStorage.getItem("ams-user");
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function resolveUploadUrl(imagePath?: string) {
  if (!imagePath) {
    return "";
  }
  if (/^https?:\/\//.test(imagePath)) {
    return imagePath;
  }
  return `${uploadOrigin}/${imagePath.replace(/^\//, "")}`;
}

export async function login(values: LoginValues) {
  const response = await api.post<AuthResponse>("/auth/login", values);
  return response.data;
}

export async function getMe() {
  const response = await api.get<User>("/me");
  return response.data;
}

export async function listEmployees(
  params?: Record<string, string | number | undefined>,
) {
  const response = await api.get<{ items: User[]; total: number }>(
    "/employees",
    { params },
  );
  return response.data;
}

export async function createEmployee(values: EmployeeFormValues) {
  const response = await api.post<User>("/employees", values);
  return response.data;
}

export async function updateEmployee(
  id: string,
  values: Partial<EmployeeFormValues> & { isActive?: boolean },
) {
  const response = await api.patch<User>(`/employees/${id}`, values);
  return response.data;
}

export async function deleteEmployee(id: string) {
  await api.delete(`/employees/${id}`);
}

export async function listAttendance(
  params?: Record<string, string | number | undefined>,
) {
  const response = await api.get<{ items: Attendance[]; total: number }>(
    "/attendance",
    { params },
  );
  return response.data;
}

export async function recentAttendance(employeeId: string, limit = 10) {
  const response = await api.get<Attendance[]>("/attendance/recent", {
    params: { employeeId, limit },
  });
  return response.data;
}

export async function attendanceSummary() {
  const response = await api.get<AttendanceSummary>("/attendance/summary");
  return response.data;
}

export async function clockIn(formData: FormData) {
  const response = await api.post<Attendance>(
    "/attendance/clock-in",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );
  return response.data;
}

export async function clockOut(values: ClockOutValues) {
  const response = await api.post<Attendance>("/attendance/clock-out", values);
  return response.data;
}
