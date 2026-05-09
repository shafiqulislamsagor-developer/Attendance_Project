export type Role = "super_admin" | "admin" | "employee";

export interface User {
  id: string;
  name: string;
  phone?: string;
  email: string;
  role: Role;
  status?: string;
  temporaryPassword?: string;
  employeeCode?: string;
  department?: string;
  departmentId?: string;
  shiftId?: string;
  address?: string;
  emergencyContact?: string;
  profileImage?: string;
  isActive?: boolean;
  isDelete?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut?: string;
  latitude: number;
  longitude: number;
  isOutsideOffice?: boolean;
  geoFenceStatus?: string;
  image: string;
  status: string;
  approvalStatus?: string;
  approvalNote?: string;
  lateMinutes?: number;
  overtimeMinutes?: number;
  workDuration?: number;
  country?: string;
  city?: string;
  area?: string;
  road?: string;
  formattedAddress?: string;
  deviceInfo?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AttendanceSummary {
  totalRecords: number;
  totalPresent: number;
  totalClockOuts: number;
  totalEmployees: number;
}

export interface AuthResponse {
  token: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
  user: User;
}

export interface LoginValues {
  email: string;
  password: string;
}

export interface EmployeeFormValues {
  name: string;
  email: string;
  password?: string;
  role: Role;
  phone?: string;
  employeeCode?: string;
  department: string;
  departmentId: string;
  shiftId?: string;
  address?: string;
  emergencyContact?: string;
  profileImage?: string;
}

export interface ClockOutValues {
  attendanceId: string;
  latitude: number;
  longitude: number;
  deviceInfo: string;
}

export interface OfficeSettings {
  officeStartTime: string;
  officeEndTime: string;
  graceMinutes: number;
  minimumWorkHours: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  graceMinutes: number;
  minimumWorkHours: number;
  officeMinutes?: number;
  effectiveMinutes?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  leaveType: "sick" | "casual" | "paid" | "emergency" | string;
  fromDate: string;
  toDate: string;
  totalDays?: number;
  reason: string;
  documentUrl?: string;
  status: string;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaveBalance {
  id?: string;
  employeeId: string;
  year: number;
  sick: number;
  casual: number;
  paid: number;
  emergency: number;
}

export interface OfficeLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  address?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  actorId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  ipAddress?: string;
  deviceInfo?: string;
  metadata?: string;
  createdAt: string;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface EmployeeMetric {
  employeeId: string;
  name: string;
  value: number;
}

export interface AttendanceAnalytics {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  pendingApprovals: number;
  lateEmployees: number;
  perfectTimingEmployees: number;
  underTimeEmployees: number;
  overtimeEmployees: number;
  weeklyAttendanceChart: ChartPoint[];
  monthlyAttendanceChart: ChartPoint[];
  employeePerformanceChart: EmployeeMetric[];
}

export interface EmployeeAttendanceProfile {
  employee: User;
  history: Attendance[];
  totalPresentDays: number;
  totalAbsentDays: number;
  totalLateDays: number;
  totalApprovedAttendance: number;
  totalRejectedAttendance: number;
  pendingApprovals: number;
  averageWorkDuration: number;
  todayStatus: string;
}
