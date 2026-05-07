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
)

type Server struct {
	port int

	db  database.Service
	cfg config.Config

	authHandler       *handlers.AuthHandler
	employeeHandler   *handlers.EmployeeHandler
	attendanceHandler *handlers.AttendanceHandler
}

func NewServer() *http.Server {
	cfg := config.Load()
	port, err := strconv.Atoi(cfg.Port)
	if err != nil || port == 0 {
		port = 8080
	}

	db := database.New()
	userRepo := repositories.NewUserRepository(db)
	attendanceRepo := repositories.NewAttendanceRepository(db)
	authSvc := services.NewAuthService(userRepo, cfg)
	employeeSvc := services.NewEmployeeService(userRepo)
	attendanceSvc := services.NewAttendanceService(attendanceRepo, userRepo, cfg)

	app := &Server{
		port:              port,
		db:                db,
		cfg:               cfg,
		authHandler:       handlers.NewAuthHandler(authSvc, employeeSvc),
		employeeHandler:   handlers.NewEmployeeHandler(employeeSvc),
		attendanceHandler: handlers.NewAttendanceHandler(attendanceSvc),
	}

	if err := authSvc.BootstrapAdmin(context.Background()); err != nil {
		panic(fmt.Sprintf("failed to bootstrap admin: %v", err))
	}

	return &http.Server{
		Addr:         fmt.Sprintf(":%d", app.port),
		Handler:      app.RegisterRoutes(),
		IdleTimeout:  time.Minute,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
	}
}
