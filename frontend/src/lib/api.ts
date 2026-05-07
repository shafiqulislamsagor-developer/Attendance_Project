import axios from "axios";
import type {
  Attendance,
  AttendanceAnalytics,
  AttendanceSummary,
  AuditLog,
  AuthResponse,
  ClockOutValues,
  Department,
  EmployeeAttendanceProfile,
  EmployeeFormValues,
  LeaveBalance,
  LeaveRequest,
  LoginValues,
  OfficeLocation,
  OfficeSettings,
  Shift,
  User,
} from "../types";

const baseURL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1";
const uploadOrigin = baseURL.replace(/\/api\/v1\/?$/, "");
const authStorageKey = "ams-auth";
const userStorageKey = "ams-user";

type StoredAuth = {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
};

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

const refreshClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let refreshPromise: Promise<AuthResponse> | null = null;

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as
      | (typeof error.config & { _retry?: boolean })
      | undefined;

    if (
      !error.response ||
      error.response.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      String(originalRequest.url || "").includes("/auth/login") ||
      String(originalRequest.url || "").includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthToken();
      return Promise.reject(error);
    }

    try {
      if (!refreshPromise) {
        refreshPromise = refreshClient
          .post<AuthResponse>("/auth/refresh", { refreshToken })
          .then((response) => response.data)
          .finally(() => {
            refreshPromise = null;
          });
      }

      const session = await refreshPromise;
      const nextToken = session.accessToken ?? session.token;
      setAuthTokens(nextToken, session.refreshToken ?? refreshToken);
      originalRequest._retry = true;
      originalRequest.headers = originalRequest.headers ?? {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      clearAuthToken();
      return Promise.reject(refreshError);
    }
  },
);

export function getAuthToken() {
  const stored = readAuthStorage();
  if (stored?.accessToken) {
    return stored.accessToken;
  }
  if (stored?.token) {
    return stored.token;
  }
  return localStorage.getItem(authStorageKey);
}

export function getRefreshToken() {
  const stored = readAuthStorage();
  return stored?.refreshToken ?? null;
}

export function setAuthToken(token: string) {
  setAuthTokens(token);
}

export function setAuthTokens(accessToken: string, refreshToken?: string) {
  localStorage.setItem(
    authStorageKey,
    JSON.stringify({ accessToken, refreshToken }),
  );
}

export function clearAuthToken() {
  localStorage.removeItem(authStorageKey);
  localStorage.removeItem(userStorageKey);
}

export function saveUser(user: User) {
  localStorage.setItem(userStorageKey, JSON.stringify(user));
}

export function loadUser(): User | null {
  const raw = localStorage.getItem(userStorageKey);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function readAuthStorage(): StoredAuth | null {
  const raw = localStorage.getItem(authStorageKey);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as StoredAuth;
  } catch {
    return { token: raw };
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

export async function refreshSession(refreshToken: string) {
  const response = await refreshClient.post<AuthResponse>("/auth/refresh", {
    refreshToken,
  });
  return response.data;
}

export async function logoutSession() {
  await api.post("/auth/logout");
}

export async function logoutAllSessions() {
  await api.post("/auth/logout-all");
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

export async function approveAttendance(
  attendanceId: string,
  payload: {
    action: "approve" | "reject" | "suspicious";
    status?: string;
    note?: string;
  },
) {
  const response = await api.post<Attendance>(
    `/attendance/${attendanceId}/approval`,
    payload,
  );
  return response.data;
}

export async function attendanceAnalytics() {
  const response = await api.get<AttendanceAnalytics>("/attendance/analytics");
  return response.data;
}

export async function myAttendanceSummary() {
  const response = await api.get<EmployeeAttendanceProfile>(
    "/attendance/my-summary",
  );
  return response.data;
}

export async function getOfficeSettings() {
  const response = await api.get<OfficeSettings>("/office-settings");
  return response.data;
}

export async function updateOfficeSettings(values: OfficeSettings) {
  const response = await api.put<OfficeSettings>("/office-settings", values);
  return response.data;
}

export async function listDepartments() {
  const response = await api.get<{ items: Department[] }>("/departments");
  return response.data;
}

export async function createDepartment(values: Partial<Department>) {
  const response = await api.post<Department>("/departments", values);
  return response.data;
}

export async function updateDepartment(
  id: string,
  values: Partial<Department>,
) {
  const response = await api.patch<Department>(`/departments/${id}`, values);
  return response.data;
}

export async function deleteDepartment(id: string) {
  await api.delete(`/departments/${id}`);
}

export async function listShifts() {
  const response = await api.get<{ items: Shift[] }>("/shifts");
  return response.data;
}

export async function createShift(values: Partial<Shift>) {
  const response = await api.post<Shift>("/shifts", values);
  return response.data;
}

export async function updateShift(id: string, values: Partial<Shift>) {
  const response = await api.patch<Shift>(`/shifts/${id}`, values);
  return response.data;
}

export async function deleteShift(id: string) {
  await api.delete(`/shifts/${id}`);
}

export async function listLeaves() {
  const response = await api.get<{ items: LeaveRequest[] }>("/leaves/admin");
  return response.data;
}

export async function listMyLeaves() {
  const response = await api.get<{ items: LeaveRequest[] }>("/leaves/me");
  return response.data;
}

export async function createLeaveRequest(values: Partial<LeaveRequest>) {
  const response = await api.post<LeaveRequest>("/leaves", values);
  return response.data;
}

export async function reviewLeaveRequest(
  id: string,
  payload: { status: "approved" | "rejected"; reason?: string },
) {
  const response = await api.post<LeaveRequest>(
    `/leaves/${id}/review`,
    payload,
  );
  return response.data;
}

export async function getLeaveBalance(employeeId?: string, year?: number) {
  const response = await api.get<LeaveBalance>("/leave-balances", {
    params: { employeeId, year },
  });
  return response.data;
}

export async function listOfficeLocations() {
  const response = await api.get<{ items: OfficeLocation[] }>(
    "/office-locations",
  );
  return response.data;
}

export async function saveOfficeLocation(values: Partial<OfficeLocation>) {
  const response = await api.post<OfficeLocation>("/office-locations", values);
  return response.data;
}

export async function getActiveOfficeLocation() {
  const response = await api.get<OfficeLocation>("/office-locations/active");
  return response.data;
}

export async function listAuditLogs(limit = 50) {
  const response = await api.get<{ items: AuditLog[] }>("/audit-logs", {
    params: { limit },
  });
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
