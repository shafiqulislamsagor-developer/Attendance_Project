package server

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"go-test/internal/config"
	"go-test/internal/database"
	"go-test/internal/handlers"
	"go-test/internal/repositories"
	"go-test/internal/services"
	"go-test/internal/websocket"
)

type Server struct {
	port int

	db  database.Service
	cfg config.Config
	ws  *websocket.Manager

	authHandler       *handlers.AuthHandler
	employeeHandler   *handlers.EmployeeHandler
	attendanceHandler *handlers.AttendanceHandler
	officeHandler     *handlers.OfficeHandler
	departmentHandler *handlers.DepartmentHandler
	shiftHandler      *handlers.ShiftHandler
	leaveHandler      *handlers.LeaveHandler
	officeLocationHandler *handlers.OfficeLocationHandler
	auditHandler      *handlers.AuditHandler
}

func NewServer() *http.Server {
	cfg := config.Load()
	port, err := strconv.Atoi(cfg.Port)
	if err != nil || port == 0 {
		port = 8080
	}

	db := database.New()
	userRepo := repositories.NewUserRepository(db)
	sessionRepo := repositories.NewSessionRepository(db)
	attendanceRepo := repositories.NewAttendanceRepository(db)
	officeRepo := repositories.NewOfficeRepository(db)
	departmentRepo := repositories.NewDepartmentRepository(db)
	shiftRepo := repositories.NewShiftRepository(db)
	leaveRepo := repositories.NewLeaveRepository(db)
	officeLocationRepo := repositories.NewOfficeLocationRepository(db)
	auditRepo := repositories.NewAuditRepository(db)
	authSvc := services.NewAuthService(userRepo, sessionRepo, cfg)
	employeeSvc := services.NewEmployeeService(userRepo, attendanceRepo)
	attendanceSvc := services.NewAttendanceService(attendanceRepo, userRepo, officeRepo, officeLocationRepo, cfg)
	officeSvc := services.NewOfficeService(officeRepo)
	departmentSvc := services.NewDepartmentService(departmentRepo)
	shiftSvc := services.NewShiftService(shiftRepo)
	leaveSvc := services.NewLeaveService(leaveRepo, userRepo)
	officeLocationSvc := services.NewOfficeLocationService(officeLocationRepo)
	auditSvc := services.NewAuditService(auditRepo)

	wsManager := websocket.NewManager()

	app := &Server{
		port:              port,
		db:                db,
		cfg:               cfg,
		ws:                wsManager,
		authHandler:       handlers.NewAuthHandler(authSvc, employeeSvc),
		employeeHandler:   handlers.NewEmployeeHandler(employeeSvc),
		attendanceHandler: handlers.NewAttendanceHandler(attendanceSvc),
		officeHandler:     handlers.NewOfficeHandler(officeSvc),
		departmentHandler: handlers.NewDepartmentHandler(departmentSvc),
		shiftHandler:      handlers.NewShiftHandler(shiftSvc),
		leaveHandler:      handlers.NewLeaveHandler(leaveSvc),
		officeLocationHandler: handlers.NewOfficeLocationHandler(officeLocationSvc),
		auditHandler:      handlers.NewAuditHandler(auditSvc),
	}

	if err := authSvc.BootstrapAdmin(context.Background()); err != nil {
		panic(fmt.Sprintf("failed to bootstrap admin: %v", err))
	}

	// Start WebSocket manager
	wsManager.Start(context.Background())

	return &http.Server{
		Addr:         fmt.Sprintf(":%d", app.port),
		Handler:      app.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}
}
