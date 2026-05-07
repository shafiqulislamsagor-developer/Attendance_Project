package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"go-test/internal/config"
	"go-test/internal/models"
	"go-test/internal/repositories"
	"go-test/internal/utils"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuthService interface {
	Login(ctx context.Context, input models.LoginInput) (models.AuthResponse, error)
	Register(ctx context.Context, input models.CreateUserInput, creatorRole models.Role) (models.User, error)
	BootstrapAdmin(ctx context.Context) error
}

type EmployeeService interface {
	Create(ctx context.Context, input models.CreateUserInput) (models.User, error)
	List(ctx context.Context, filter repositories.UserListFilter) ([]models.User, int64, error)
	Get(ctx context.Context, id string) (models.User, error)
	Update(ctx context.Context, id string, input models.UpdateUserInput) (models.User, error)
	Delete(ctx context.Context, id string) error
}

type AttendanceService interface {
	ClockIn(ctx context.Context, input models.ClockInInput) (models.Attendance, error)
	ClockOut(ctx context.Context, input models.ClockOutInput) (models.Attendance, error)
	List(ctx context.Context, filter models.AttendanceFilter) ([]models.Attendance, int64, error)
	Summary(ctx context.Context) (models.AttendanceSummary, error)
	Recent(ctx context.Context, employeeID string, limit int64) ([]models.Attendance, error)
}

type authService struct {
	users  repositories.UserRepository
	cfg    config.Config
	secret string
}

type employeeService struct {
	users repositories.UserRepository
}

type attendanceService struct {
	attendance repositories.AttendanceRepository
	users      repositories.UserRepository
	cfg        config.Config
}

func NewAuthService(users repositories.UserRepository, cfg config.Config) AuthService {
	return &authService{users: users, cfg: cfg, secret: cfg.JWTSecret}
}

func NewEmployeeService(users repositories.UserRepository) EmployeeService {
	return &employeeService{users: users}
}

func NewAttendanceService(attendance repositories.AttendanceRepository, users repositories.UserRepository, cfg config.Config) AttendanceService {
	return &attendanceService{attendance: attendance, users: users, cfg: cfg}
}

func (s *authService) Login(ctx context.Context, input models.LoginInput) (models.AuthResponse, error) {
	user, err := s.users.FindByEmail(ctx, input.Email)
	if err != nil {
		return models.AuthResponse{}, errors.New("invalid credentials")
	}
	if err := utils.ComparePassword(user.PasswordHash, input.Password); err != nil {
		return models.AuthResponse{}, errors.New("invalid credentials")
	}
	token, err := utils.GenerateToken(s.secret, user, s.cfg.TokenTTL)
	if err != nil {
		return models.AuthResponse{}, err
	}
	return models.AuthResponse{Token: token, User: user}, nil
}

func (s *authService) Register(ctx context.Context, input models.CreateUserInput, creatorRole models.Role) (models.User, error) {
	if creatorRole != models.RoleAdmin {
		return models.User{}, errors.New("forbidden")
	}
	return createUser(ctx, s.users, input)
}

func (s *authService) BootstrapAdmin(ctx context.Context) error {
	if s.cfg.AdminEmail == "" || s.cfg.AdminPassword == "" {
		return nil
	}
	if _, err := s.users.FindAdmin(ctx); err == nil {
		return nil
	}
	_, err := createUser(ctx, s.users, models.CreateUserInput{
		Name:     "System Admin",
		Email:    s.cfg.AdminEmail,
		Password: s.cfg.AdminPassword,
		Role:     models.RoleAdmin,
	})
	return err
}

func (s *employeeService) Create(ctx context.Context, input models.CreateUserInput) (models.User, error) {
	return createUser(ctx, s.users, input)
}

func (s *employeeService) List(ctx context.Context, filter repositories.UserListFilter) ([]models.User, int64, error) {
	return s.users.List(ctx, filter)
}

func (s *employeeService) Get(ctx context.Context, id string) (models.User, error) {
	return s.users.FindByID(ctx, id)
}

func (s *employeeService) Update(ctx context.Context, id string, input models.UpdateUserInput) (models.User, error) {
	if input.Name == "" && input.Email == "" && input.Password == "" && input.Role == "" && input.EmployeeCode == "" && input.Department == "" && input.IsActive == nil {
		return models.User{}, errors.New("no fields to update")
	}
	if input.Email != "" {
		if err := utils.ValidateEmail(input.Email); err != nil {
			return models.User{}, err
		}
	}
	if input.Name != "" {
		if err := utils.ValidateName(input.Name); err != nil {
			return models.User{}, err
		}
	}
	if input.Password != "" {
		if err := utils.ValidatePassword(input.Password); err != nil {
			return models.User{}, err
		}
	}
	return s.users.Update(ctx, id, input)
}

func (s *employeeService) Delete(ctx context.Context, id string) error {
	return s.users.Delete(ctx, id)
}

func (s *attendanceService) ClockIn(ctx context.Context, input models.ClockInInput) (models.Attendance, error) {
	if strings.TrimSpace(input.EmployeeID) == "" {
		return models.Attendance{}, errors.New("employee id is required")
	}
	if input.Latitude == 0 && input.Longitude == 0 {
		return models.Attendance{}, errors.New("location is required")
	}
	if _, err := s.users.FindByID(ctx, input.EmployeeID); err != nil {
		return models.Attendance{}, errors.New("employee not found")
	}
	if _, err := s.attendance.FindTodayByEmployee(ctx, input.EmployeeID, time.Now()); err == nil {
		return models.Attendance{}, errors.New("attendance already exists for today")
	}
	objectID, err := primitive.ObjectIDFromHex(input.EmployeeID)
	if err != nil {
		return models.Attendance{}, err
	}
	imagePath, err := utils.SaveUploadedImage(s.cfg.UploadDir, input.ImageName, input.ImageData)
	if err != nil {
		return models.Attendance{}, err
	}
	now := time.Now()
	attendance := models.Attendance{
		EmployeeID: objectID,
		ClockIn:    now,
		Latitude:   input.Latitude,
		Longitude:  input.Longitude,
		Image:      imagePath,
		Status:     "clocked-in",
		DeviceInfo: input.DeviceInfo,
		CreatedAt:  now,
		UpdatedAt:  now,
	}
	return s.attendance.Create(ctx, attendance)
}

func (s *attendanceService) ClockOut(ctx context.Context, input models.ClockOutInput) (models.Attendance, error) {
	if strings.TrimSpace(input.AttendanceID) == "" {
		return models.Attendance{}, errors.New("attendance id is required")
	}
	if input.Latitude == 0 && input.Longitude == 0 {
		return models.Attendance{}, errors.New("location is required")
	}
	return s.attendance.UpdateClockOut(ctx, input.AttendanceID, time.Now(), input.Latitude, input.Longitude, input.DeviceInfo)
}

func (s *attendanceService) List(ctx context.Context, filter models.AttendanceFilter) ([]models.Attendance, int64, error) {
	return s.attendance.List(ctx, filter)
}

func (s *attendanceService) Summary(ctx context.Context) (models.AttendanceSummary, error) {
	summary, err := s.attendance.Summary(ctx)
	if err != nil {
		return models.AttendanceSummary{}, err
	}
	totalEmployees, err := s.users.Count(ctx)
	if err != nil {
		return models.AttendanceSummary{}, err
	}
	summary.TotalEmployees = totalEmployees
	return summary, nil
}

func (s *attendanceService) Recent(ctx context.Context, employeeID string, limit int64) ([]models.Attendance, error) {
	if employeeID == "" {
		return nil, fmt.Errorf("employee id is required")
	}
	if limit < 1 {
		limit = 10
	}
	return s.attendance.RecentByEmployee(ctx, employeeID, limit)
}

func createUser(ctx context.Context, users repositories.UserRepository, input models.CreateUserInput) (models.User, error) {
	if err := utils.ValidateName(input.Name); err != nil {
		return models.User{}, err
	}
	if err := utils.ValidateEmail(input.Email); err != nil {
		return models.User{}, err
	}
	if err := utils.ValidatePassword(input.Password); err != nil {
		return models.User{}, err
	}
	role := input.Role
	if role == "" {
		role = models.RoleEmployee
	}
	hash, err := utils.HashPassword(input.Password)
	if err != nil {
		return models.User{}, err
	}
	now := time.Now()
	user := models.User{
		Name:         strings.TrimSpace(input.Name),
		Email:        strings.ToLower(strings.TrimSpace(input.Email)),
		PasswordHash: hash,
		Role:         role,
		EmployeeCode: strings.TrimSpace(input.EmployeeCode),
		Department:   strings.TrimSpace(input.Department),
		IsActive:     true,
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	return users.Create(ctx, user)
}
