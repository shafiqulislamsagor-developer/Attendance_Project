import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminAttendancePage } from "./pages/AdminAttendancePage";
import { AdminAuditLogsPage } from "./pages/AdminAuditLogsPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminDepartmentsPage } from "./pages/AdminDepartmentsPage";
import { AdminEmployeesPage } from "./pages/AdminEmployeesPage";
import { AdminGeofencePage } from "./pages/AdminGeofencePage";
import { AdminLeavesPage } from "./pages/AdminLeavesPage";
import { AdminLiveBoardPage } from "./pages/AdminLiveBoardPage";
import { AdminShiftsPage } from "./pages/AdminShiftsPage";
import { EmployeeDashboardPage } from "./pages/EmployeeDashboardPage";
import { EmployeeLeavesPage } from "./pages/EmployeeLeavesPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute roles={["admin", "super_admin"]} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/employees" element={<AdminEmployeesPage />} />
        <Route path="/attendance" element={<AdminAttendancePage />} />
        <Route path="/departments" element={<AdminDepartmentsPage />} />
        <Route path="/shifts" element={<AdminShiftsPage />} />
        <Route path="/leaves" element={<AdminLeavesPage />} />
        <Route path="/geofence" element={<AdminGeofencePage />} />
        <Route path="/board" element={<AdminLiveBoardPage />} />
        <Route path="/audit-logs" element={<AdminAuditLogsPage />} />
      </Route>
      <Route element={<ProtectedRoute roles={["employee"]} />}>
        <Route path="/employee" element={<EmployeeDashboardPage />} />
        <Route path="/employee/leaves" element={<EmployeeLeavesPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
