import jsPDF from "jspdf";
import type { Attendance, User } from "../types";

// jspdf-autotable is auto-loaded by jsPDF when imported
declare global {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export function exportAttendanceToCSV(
  attendance: Attendance[],
  employees: Map<string, User>,
  filename = "attendance.csv",
) {
  const headers = [
    "Employee Name",
    "Department",
    "Clock In",
    "Clock Out",
    "Duration",
    "Location",
    "Status",
    "Approval",
  ];

  const rows = attendance.map((record) => {
    const employee = employees.get(record.employeeId);
    const clockIn = new Date(record.clockIn);
    const clockOut = record.clockOut ? new Date(record.clockOut) : null;
    const duration = clockOut
      ? `${Math.round((clockOut.getTime() - clockIn.getTime()) / 3600000)} hrs`
      : "In Progress";

    return [
      employee?.name || record.employeeId,
      employee?.department || "N/A",
      clockIn.toLocaleString(),
      clockOut ? clockOut.toLocaleString() : "-",
      duration,
      record.city || record.formattedAddress || "Unknown",
      record.status || "Pending",
      record.approvalStatus || "Pending",
    ];
  });

  const csv = [
    headers.join(","),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
  ].join("\n");

  downloadFile(csv, filename, "text/csv");
}

export function exportAttendanceToPDF(
  attendance: Attendance[],
  employees: Map<string, User>,
  title = "Attendance Report",
  filename = "attendance.pdf",
) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(16);
  doc.text(title, 14, yPosition);
  yPosition += 15;

  // Date generated
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, yPosition);
  yPosition += 10;

  // Table data
  const tableData = attendance.map((record) => {
    const employee = employees.get(record.employeeId);
    const clockIn = new Date(record.clockIn);
    const clockOut = record.clockOut ? new Date(record.clockOut) : null;
    const duration = clockOut
      ? `${Math.round((clockOut.getTime() - clockIn.getTime()) / 3600000)}h`
      : "In Progress";

    return [
      employee?.name || record.employeeId,
      employee?.department || "N/A",
      clockIn.toLocaleTimeString(),
      clockOut ? clockOut.toLocaleTimeString() : "-",
      duration,
      record.city || record.formattedAddress?.substring(0, 30) || "Unknown",
      record.approvalStatus || "Pending",
    ];
  });

  (doc as any).autoTable({
    head: [
      [
        "Employee",
        "Department",
        "Clock In",
        "Clock Out",
        "Duration",
        "Location",
        "Status",
      ],
    ],
    body: tableData,
    startY: yPosition,
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
    bodyStyles: {
      textColor: 50,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });

  doc.save(filename);
}

export function exportAnalyticsToPDF(
  analytics: {
    totalEmployees: number;
    presentToday: number;
    absentToday: number;
    lateEmployees: number;
    overtimeEmployees: number;
    underTimeEmployees: number;
    perfectTimingEmployees: number;
    pendingApprovals: number;
    weeklyAttendanceChart?: Array<{ label: string; value: number }>;
  },
  filename = "analytics.pdf",
) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(16);
  doc.text("Attendance Analytics Report", 14, yPosition);
  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, yPosition);
  yPosition += 15;

  // Key metrics
  doc.setFontSize(12);
  doc.text("Key Metrics:", 14, yPosition);
  yPosition += 8;

  const metrics = [
    [`Total Employees: ${analytics.totalEmployees}`],
    [`Present Today: ${analytics.presentToday}`],
    [`Absent Today: ${analytics.absentToday}`],
    [`Late Employees: ${analytics.lateEmployees}`],
    [`Overtime Employees: ${analytics.overtimeEmployees}`],
    [`Under Time Employees: ${analytics.underTimeEmployees}`],
    [`Perfect Timing: ${analytics.perfectTimingEmployees}`],
    [`Pending Approvals: ${analytics.pendingApprovals}`],
  ];

  (doc as any).autoTable({
    body: metrics,
    startY: yPosition,
    theme: "striped",
    bodyStyles: {
      textColor: 50,
    },
  });

  doc.save(filename);
}

export function exportDepartmentToPDF(
  departmentName: string,
  employees: User[],
  filename?: string,
) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(16);
  doc.text(`${departmentName} - Employee List`, 14, yPosition);
  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, yPosition);
  yPosition += 15;

  // Table data
  const tableData = employees.map((emp) => [
    emp.name,
    emp.email,
    emp.phone || "N/A",
    emp.employeeCode || "N/A",
    emp.status || "Active",
  ]);

  (doc as any).autoTable({
    head: [["Name", "Email", "Phone", "Employee Code", "Status"]],
    body: tableData,
    startY: yPosition,
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  doc.save(filename || `${departmentName}-employees.pdf`);
}

export function exportLeaveRequestsToPDF(
  leaves: any[],
  filename = "leave-requests.pdf",
) {
  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(16);
  doc.text("Leave Requests Report", 14, yPosition);
  yPosition += 15;

  // Date
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, yPosition);
  yPosition += 15;

  // Table data
  const tableData = leaves.map((leave) => [
    leave.employeeName || leave.employeeId,
    leave.leaveType,
    new Date(leave.startDate).toLocaleDateString(),
    new Date(leave.endDate).toLocaleDateString(),
    leave.days || 1,
    leave.status || "Pending",
  ]);

  (doc as any).autoTable({
    head: [
      ["Employee", "Leave Type", "Start Date", "End Date", "Days", "Status"],
    ],
    body: tableData,
    startY: yPosition,
    theme: "grid",
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: "bold",
    },
  });

  doc.save(filename);
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
}
