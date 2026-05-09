package services

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"go-test/internal/models"
	"go-test/internal/repositories"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DepartmentService interface {
	List(ctx context.Context) ([]models.Department, error)
	Get(ctx context.Context, id string) (models.Department, error)
	Create(ctx context.Context, input models.Department) (models.Department, error)
	Update(ctx context.Context, id string, input models.Department) (models.Department, error)
	Delete(ctx context.Context, id string) error
}

type ShiftService interface {
	List(ctx context.Context) ([]models.Shift, error)
	Get(ctx context.Context, id string) (models.Shift, error)
	Create(ctx context.Context, input models.Shift) (models.Shift, error)
	Update(ctx context.Context, id string, input models.Shift) (models.Shift, error)
	Delete(ctx context.Context, id string) error
}

type LeaveService interface {
	Request(ctx context.Context, employeeID string, input models.LeaveRequest) (models.LeaveRequest, error)
	ListMyRequests(ctx context.Context, employeeID string) ([]models.LeaveRequest, error)
	List(ctx context.Context) ([]models.LeaveRequest, error)
	Review(ctx context.Context, requestID string, reviewerID string, status string, reason string) (models.LeaveRequest, error)
	GetBalance(ctx context.Context, employeeID string, year int) (models.LeaveBalance, error)
	UpsertBalance(ctx context.Context, balance models.LeaveBalance) (models.LeaveBalance, error)
}

type OfficeLocationService interface {
	List(ctx context.Context) ([]models.OfficeLocation, error)
	Save(ctx context.Context, input models.OfficeLocation) (models.OfficeLocation, error)
	GetActive(ctx context.Context) (models.OfficeLocation, error)
}

type AuditService interface {
	List(ctx context.Context, limit int64) ([]models.AuditLog, error)
	Record(ctx context.Context, input models.AuditLog) (models.AuditLog, error)
}

type departmentService struct {
	repo repositories.DepartmentRepository
}

type shiftService struct {
	repo repositories.ShiftRepository
}

type leaveService struct {
	repo     repositories.LeaveRepository
	users    repositories.UserRepository
}

type officeLocationService struct {
	repo repositories.OfficeLocationRepository
}

type auditService struct {
	repo repositories.AuditRepository
}

func NewDepartmentService(repo repositories.DepartmentRepository) DepartmentService {
	return &departmentService{repo: repo}
}

func NewShiftService(repo repositories.ShiftRepository) ShiftService {
	return &shiftService{repo: repo}
}

func NewLeaveService(repo repositories.LeaveRepository, users repositories.UserRepository) LeaveService {
	return &leaveService{repo: repo, users: users}
}

func NewOfficeLocationService(repo repositories.OfficeLocationRepository) OfficeLocationService {
	return &officeLocationService{repo: repo}
}

func NewAuditService(repo repositories.AuditRepository) AuditService {
	return &auditService{repo: repo}
}

func (s *departmentService) List(ctx context.Context) ([]models.Department, error) {
	return s.repo.List(ctx)
}

func (s *departmentService) Get(ctx context.Context, id string) (models.Department, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *departmentService) Create(ctx context.Context, input models.Department) (models.Department, error) {
	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		return models.Department{}, errors.New("department name is required")
	}
	input.Code = generateDepartmentCode(ctx, s.repo, input.Name)
	now := time.Now()
	input.IsActive = true
	input.CreatedAt = now
	input.UpdatedAt = now
	return s.repo.Create(ctx, input)
}

func (s *departmentService) Update(ctx context.Context, id string, input models.Department) (models.Department, error) {
	if strings.TrimSpace(input.Name) == "" && strings.TrimSpace(input.Code) == "" {
		return models.Department{}, errors.New("no fields to update")
	}
	current, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return models.Department{}, err
	}
	if input.Name != "" {
		current.Name = strings.TrimSpace(input.Name)
	}
	
	current.IsActive = input.IsActive || current.IsActive
	return s.repo.Update(ctx, id, current)
}

func (s *departmentService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *shiftService) List(ctx context.Context) ([]models.Shift, error) {
	return s.repo.List(ctx)
}

func (s *shiftService) Get(ctx context.Context, id string) (models.Shift, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *shiftService) Create(ctx context.Context, input models.Shift) (models.Shift, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.StartTime = normalizeTimeString(input.StartTime, "09:00")
	input.EndTime = normalizeTimeString(input.EndTime, "18:00")
	if input.Name == "" {
		return models.Shift{}, errors.New("shift name is required")
	}
	input.BreakMinutes = maxInt64(0, input.BreakMinutes)
	input.GraceMinutes = maxInt64(0, input.GraceMinutes)
	officeMinutes, effectiveMinutes := calculateShiftDurations(input.StartTime, input.EndTime, input.BreakMinutes)
	input.OfficeMinutes = officeMinutes
	input.EffectiveMinutes = effectiveMinutes
	input.MinimumWorkHours = maxInt64(1, effectiveMinutes/60)
	now := time.Now()
	input.IsActive = true
	input.CreatedAt = now
	input.UpdatedAt = now
	return s.repo.Create(ctx, input)
}

func (s *shiftService) Update(ctx context.Context, id string, input models.Shift) (models.Shift, error) {
	if strings.TrimSpace(input.Name) == "" && strings.TrimSpace(input.StartTime) == "" && strings.TrimSpace(input.EndTime) == "" && input.GraceMinutes == 0 && input.MinimumWorkHours == 0 && !input.IsActive {
		return models.Shift{}, errors.New("no fields to update")
	}
	current, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return models.Shift{}, err
	}
	if input.Name != "" {
		current.Name = strings.TrimSpace(input.Name)
	}
	if input.StartTime != "" {
		current.StartTime = normalizeTimeString(input.StartTime, current.StartTime)
	}
	if input.EndTime != "" {
		current.EndTime = normalizeTimeString(input.EndTime, current.EndTime)
	}
	if input.BreakMinutes >= 0 {
		current.BreakMinutes = input.BreakMinutes
	}
	if input.GraceMinutes > 0 {
		current.GraceMinutes = input.GraceMinutes
	}
	officeMinutes, effectiveMinutes := calculateShiftDurations(current.StartTime, current.EndTime, current.BreakMinutes)
	current.OfficeMinutes = officeMinutes
	current.EffectiveMinutes = effectiveMinutes
	current.MinimumWorkHours = maxInt64(1, effectiveMinutes/60)
	if input.IsActive {
		current.IsActive = true
	}
	return s.repo.Update(ctx, id, current)
}

func (s *shiftService) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *leaveService) Request(ctx context.Context, employeeID string, input models.LeaveRequest) (models.LeaveRequest, error) {
	if strings.TrimSpace(employeeID) == "" {
		return models.LeaveRequest{}, errors.New("employee id is required")
	}
	if _, err := s.users.FindByID(ctx, employeeID); err != nil {
		return models.LeaveRequest{}, errors.New("employee not found")
	}
	if strings.TrimSpace(input.LeaveType) == "" {
		return models.LeaveRequest{}, errors.New("leave type is required")
	}
	if input.FromDate.IsZero() || input.ToDate.IsZero() {
		return models.LeaveRequest{}, errors.New("leave dates are required")
	}
	if input.ToDate.Before(input.FromDate) {
		return models.LeaveRequest{}, errors.New("invalid leave date range")
	}
	totalDays := int64(input.ToDate.Sub(input.FromDate).Hours()/24) + 1
	if totalDays < 1 {
		totalDays = 1
	}
	employeeObjectID, err := primitive.ObjectIDFromHex(employeeID)
	if err != nil {
		return models.LeaveRequest{}, err
	}
	now := time.Now()
	input.EmployeeID = employeeObjectID
	input.TotalDays = totalDays
	input.Status = "pending"
	input.CreatedAt = now
	input.UpdatedAt = now
	request, err := s.repo.CreateRequest(ctx, input)
	if err != nil {
		return models.LeaveRequest{}, err
	}
	return request, nil
}

func (s *leaveService) ListMyRequests(ctx context.Context, employeeID string) ([]models.LeaveRequest, error) {
	return s.repo.ListByEmployee(ctx, employeeID)
}

func (s *leaveService) List(ctx context.Context) ([]models.LeaveRequest, error) {
	return s.repo.List(ctx)
}

func (s *leaveService) Review(ctx context.Context, requestID string, reviewerID string, status string, reason string) (models.LeaveRequest, error) {
	status = strings.ToLower(strings.TrimSpace(status))
	if status == "" {
		return models.LeaveRequest{}, errors.New("status is required")
	}
	request, err := s.repo.FindByID(ctx, requestID)
	if err != nil {
		return models.LeaveRequest{}, err
	}
	updated, err := s.repo.Review(ctx, requestID, status, reviewerID, reason)
	if err != nil {
		return models.LeaveRequest{}, err
	}
	if status == "approved" {
		days := request.TotalDays
		if days < 1 {
			days = 1
		}
		year := request.FromDate.Year()
		balance, err := s.repo.GetBalance(ctx, request.EmployeeID.Hex(), year)
		if err == nil {
			switch strings.ToLower(request.LeaveType) {
			case "sick":
				balance.Sick = maxInt64(0, balance.Sick-days)
			case "casual":
				balance.Casual = maxInt64(0, balance.Casual-days)
			case "paid":
				balance.Paid = maxInt64(0, balance.Paid-days)
			case "emergency":
				balance.Emergency = maxInt64(0, balance.Emergency-days)
			}
			_, _ = s.repo.UpsertBalance(ctx, balance)
		}
	}
	return updated, nil
}

func (s *leaveService) GetBalance(ctx context.Context, employeeID string, year int) (models.LeaveBalance, error) {
	if year == 0 {
		year = time.Now().Year()
	}
	return s.repo.GetBalance(ctx, employeeID, year)
}

func (s *leaveService) UpsertBalance(ctx context.Context, balance models.LeaveBalance) (models.LeaveBalance, error) {
	return s.repo.UpsertBalance(ctx, balance)
}

func (s *officeLocationService) List(ctx context.Context) ([]models.OfficeLocation, error) {
	return s.repo.List(ctx)
}

func (s *officeLocationService) Save(ctx context.Context, input models.OfficeLocation) (models.OfficeLocation, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Address = strings.TrimSpace(input.Address)
	if input.Name == "" {
		return models.OfficeLocation{}, errors.New("location name is required")
	}
	if input.RadiusMeters < 100 {
		input.RadiusMeters = 100
	}
	if input.Latitude == 0 && input.Longitude == 0 {
		return models.OfficeLocation{}, errors.New("office coordinates are required")
	}
	input.IsActive = true
	return s.repo.Upsert(ctx, input)
}

func (s *officeLocationService) GetActive(ctx context.Context) (models.OfficeLocation, error) {
	return s.repo.GetActive(ctx)
}

func (s *auditService) List(ctx context.Context, limit int64) ([]models.AuditLog, error) {
	return s.repo.List(ctx, limit)
}

func (s *auditService) Record(ctx context.Context, input models.AuditLog) (models.AuditLog, error) {
	input.Action = strings.TrimSpace(input.Action)
	input.EntityType = strings.TrimSpace(input.EntityType)
	if input.Action == "" || input.EntityType == "" {
		return models.AuditLog{}, fmt.Errorf("audit action and entity type are required")
	}
	if input.CreatedAt.IsZero() {
		input.CreatedAt = time.Now()
	}
	return s.repo.Create(ctx, input)
}

func generateDepartmentCode(ctx context.Context, repo repositories.DepartmentRepository, name string) string {
	items, err := repo.List(ctx)
	if err != nil {
		return fmt.Sprintf("DEP-%03d", time.Now().UnixNano()%1000)
	}
	prefix := departmentPrefix(name)
	pattern := regexp.MustCompile(fmt.Sprintf(`^%s-(\d+)$`, regexp.QuoteMeta(prefix)))
	var maxSequence int64
	for _, item := range items {
		match := pattern.FindStringSubmatch(strings.ToUpper(strings.TrimSpace(item.Code)))
		if len(match) != 2 {
			continue
		}
		sequence, err := strconv.ParseInt(match[1], 10, 64)
		if err == nil && sequence > maxSequence {
			maxSequence = sequence
		}
	}
	return fmt.Sprintf("%s-%03d", prefix, maxSequence+1)
}

func departmentPrefix(name string) string {
	switch {
	case strings.Contains(strings.ToLower(name), "human"):
		return "HR"
	case strings.Contains(strings.ToLower(name), "marketing"):
		return "MKT"
	case strings.Contains(strings.ToLower(name), "it"):
		return "IT"
	case strings.Contains(strings.ToLower(name), "account"):
		return "ACC"
	case strings.Contains(strings.ToLower(name), "sales"):
		return "SAL"
	default:
		cleaned := strings.ToUpper(strings.ReplaceAll(strings.TrimSpace(name), " ", ""))
		if len(cleaned) > 4 {
			cleaned = cleaned[:4]
		}
		if cleaned == "" {
			cleaned = "DEP"
		}
		return cleaned
	}
}

func calculateShiftDurations(startTime, endTime string, breakMinutes int64) (int64, int64) {
	start, err := time.Parse("15:04", startTime)
	if err != nil {
		start = time.Date(2000, 1, 1, 9, 0, 0, 0, time.Local)
	}
	end, err := time.Parse("15:04", endTime)
	if err != nil {
		end = time.Date(2000, 1, 1, 18, 0, 0, 0, time.Local)
	}
	duration := end.Sub(start)
	if duration < 0 {
		duration += 24 * time.Hour
	}
	officeMinutes := int64(duration.Minutes())
	effectiveMinutes := officeMinutes - maxInt64(0, breakMinutes)
	if effectiveMinutes < 0 {
		effectiveMinutes = 0
	}
	return officeMinutes, effectiveMinutes
}

func maxInt64(a, b int64) int64 {
	if a > b {
		return a
	}
	return b
}