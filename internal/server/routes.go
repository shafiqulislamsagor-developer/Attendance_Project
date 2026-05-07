package server

import (
	"encoding/json"
	"log"
	"net/http"

	"go-test/internal/middleware"
	"go-test/internal/models"
	"go-test/internal/utils"
)

func (s *Server) RegisterRoutes() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/", s.rootHandler)
	mux.HandleFunc("/hello", s.HelloWorldHandler)
	mux.HandleFunc("/health", s.healthHandler)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(s.cfg.UploadDir))))
	mux.HandleFunc("/api/v1/auth/login", s.authHandler.Login)
	mux.Handle("/api/v1/auth/register", s.withAuth(http.HandlerFunc(s.authHandler.Register)))
	mux.Handle("/api/v1/me", s.withAuth(http.HandlerFunc(s.authHandler.Me)))
	mux.Handle("/api/v1/employees", s.withAuth(s.requireAdmin(http.HandlerFunc(s.employeeHandler.ListOrCreate))))
	mux.Handle("/api/v1/employees/", s.withAuth(s.requireAdmin(http.HandlerFunc(s.employeeHandler.Detail))))
	mux.Handle("/api/v1/attendance/clock-in", s.withAuth(http.HandlerFunc(s.attendanceHandler.ClockIn)))
	mux.Handle("/api/v1/attendance/clock-out", s.withAuth(http.HandlerFunc(s.attendanceHandler.ClockOut)))
	mux.Handle("/api/v1/attendance", s.withAuth(s.requireAdmin(http.HandlerFunc(s.attendanceHandler.List))))
	mux.Handle("/api/v1/attendance/summary", s.withAuth(s.requireAdmin(http.HandlerFunc(s.attendanceHandler.Summary))))
	mux.Handle("/api/v1/attendance/analytics", s.withAuth(s.requireAdmin(http.HandlerFunc(s.attendanceHandler.Analytics))))
	mux.Handle("/api/v1/attendance/recent", s.withAuth(http.HandlerFunc(s.attendanceHandler.RecentByEmployee)))
	mux.Handle("/api/v1/attendance/my-summary", s.withAuth(http.HandlerFunc(s.attendanceHandler.EmployeeSummary)))
	mux.Handle("/api/v1/attendance/", s.withAuth(s.requireAdmin(http.HandlerFunc(s.attendanceHandler.Approve))))
	mux.Handle("/api/v1/office-settings", s.withAuth(s.requireAdmin(http.HandlerFunc(s.officeHandler.GetOrUpdate))))

	return s.corsMiddleware(mux)
}

func (s *Server) withAuth(next http.Handler) http.Handler {
	return middleware.WithAuth(s.cfg.JWTSecret)(next)
}

func (s *Server) requireAdmin(next http.Handler) http.Handler {
	return middleware.RequireRole(models.RoleAdmin)(next)
}

func (s *Server) rootHandler(w http.ResponseWriter, r *http.Request) {
	utils.JSON(w, http.StatusOK, map[string]string{"message": "Attendance Management System API"})
}

func (s *Server) HelloWorldHandler(w http.ResponseWriter, r *http.Request) {
	resp := map[string]string{"message": "Hello World"}
	jsonResp, err := json.Marshal(resp)
	if err != nil {
		http.Error(w, "Failed to marshal response", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if _, err := w.Write(jsonResp); err != nil {
		log.Printf("Failed to write response: %v", err)
	}
}

func (s *Server) corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", s.cfg.FrontendURL)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
		w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
		w.Header().Set("Access-Control-Allow-Credentials", "false")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
	utils.JSON(w, http.StatusOK, s.db.Health())
}
