import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminAttendancePage } from "./pages/AdminAttendancePage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { AdminEmployeesPage } from "./pages/AdminEmployeesPage";
import { EmployeeDashboardPage } from "./pages/EmployeeDashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { NotFoundPage } from "./pages/NotFoundPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute roles={["admin"]} />}>
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/employees" element={<AdminEmployeesPage />} />
        <Route path="/attendance" element={<AdminAttendancePage />} />
      </Route>
      <Route element={<ProtectedRoute roles={["employee"]} />}>
        <Route path="/employee" element={<EmployeeDashboardPage />} />
      </Route>
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
