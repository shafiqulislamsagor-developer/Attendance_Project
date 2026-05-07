export type Role = "admin" | "employee";

export interface User {
  id: string;
  name: string;
  phone?: string;
  email: string;
  role: Role;
  employeeCode?: string;
  department?: string;
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
  user: User;
}

export interface LoginValues {
  email: string;
  password: string;
}

export interface EmployeeFormValues {
  name: string;
  email: string;
  password: string;
  role: Role;
  phone?: string;
  employeeCode: string;
  department: string;
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
