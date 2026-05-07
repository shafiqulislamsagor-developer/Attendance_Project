export type Role = "admin" | "employee";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  employeeCode?: string;
  department?: string;
  isActive?: boolean;
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
  status: "clocked-in" | "clocked-out" | string;
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
  employeeCode: string;
  department: string;
}

export interface ClockOutValues {
  attendanceId: string;
  latitude: number;
  longitude: number;
  deviceInfo: string;
}
