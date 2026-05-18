package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"go-test/internal/config"
	"go-test/internal/models"
	"go-test/internal/repositories"
	"go-test/internal/utils"

	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

type AuthService interface {
	Login(ctx context.Context, input models.LoginInput, metadata models.SessionMetadata) (models.AuthResponse, error)
	Refresh(ctx context.Context, input models.RefreshTokenInput, metadata models.SessionMetadata) (models.AuthResponse, error)
	Logout(ctx context.Context, sessionID string) error
	LogoutAll(ctx context.Context, userID string) error
	Register(ctx context.Context, input models.CreateUserInput, creatorRole models.Role) (models.User, error)
	BootstrapAdmin(ctx context.Context) error
}

type EmployeeService interface {
	Create(ctx context.Context, input models.CreateUserInput) (models.User, error)
	List(ctx context.Context, filter repositories.UserListFilter) ([]models.User, int64, error)
	Get(ctx context.Context, id string) (models.User, error)
	Update(ctx context.Context, id string, input models.UpdateUserInput) (models.User, error)
	Delete(ctx context.Context, id string) error
	Profile(ctx context.Context, id string) (models.EmployeeAttendanceProfile, error)
}

type AttendanceService interface {
	ClockIn(ctx context.Context, input models.ClockInInput) (models.Attendance, error)
	ClockOut(ctx context.Context, input models.ClockOutInput) (models.Attendance, error)
	Approve(ctx context.Context, input models.AttendanceApprovalInput) (models.Attendance, error)
	List(ctx context.Context, filter models.AttendanceFilter) ([]models.Attendance, int64, error)
	Summary(ctx context.Context) (models.AttendanceSummary, error)
	Analytics(ctx context.Context) (models.AttendanceAnalytics, error)
	Recent(ctx context.Context, employeeID string, limit int64) ([]models.Attendance, error)
	EmployeeSummary(ctx context.Context, employeeID string) (models.EmployeeAttendanceProfile, error)
}

type OfficeService interface {
	Get(ctx context.Context) (models.OfficeSettings, error)
	Update(ctx context.Context, input models.OfficeSettings) (models.OfficeSettings, error)
}

type authService struct {
	users    repositories.UserRepository
	sessions repositories.SessionRepository
	cfg      config.Config
	secret   string
}

type employeeService struct {
	users      repositories.UserRepository
	attendance repositories.AttendanceRepository
}

type attendanceService struct {
	attendance repositories.AttendanceRepository
	users      repositories.UserRepository
	office     repositories.OfficeRepository
	locations  repositories.OfficeLocationRepository
	cfg        config.Config
	httpClient *http.Client
}

type officeService struct {
	repo repositories.OfficeRepository
}

func NewAuthService(users repositories.UserRepository, sessions repositories.SessionRepository, cfg config.Config) AuthService {
	return &authService{users: users, sessions: sessions, cfg: cfg, secret: cfg.JWTSecret}
}

func NewEmployeeService(users repositories.UserRepository, attendance repositories.AttendanceRepository) EmployeeService {
	return &employeeService{users: users, attendance: attendance}
}

func NewAttendanceService(attendance repositories.AttendanceRepository, users repositories.UserRepository, office repositories.OfficeRepository, locations repositories.OfficeLocationRepository, cfg config.Config) AttendanceService {
	return &attendanceService{
		attendance: attendance,
		users:      users,
		office:     office,
		locations:  locations,
		cfg:        cfg,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

func NewOfficeService(repo repositories.OfficeRepository) OfficeService {
	return &officeService{repo: repo}
}

func (s *authService) Login(ctx context.Context, input models.LoginInput, metadata models.SessionMetadata) (models.AuthResponse, error) {
	user, err := s.users.FindByEmail(ctx, input.Email)
	if err != nil {
		return models.AuthResponse{}, errors.New("invalid credentials")
	}
	if !user.IsActive {
		return models.AuthResponse{}, errors.New("account is inactive")
	}
	if err := utils.ComparePassword(user.PasswordHash, input.Password); err != nil {
		return models.AuthResponse{}, errors.New("invalid credentials")
	}
	refreshToken, err := utils.RandomToken(48)
	if err != nil {
		return models.AuthResponse{}, err
	}
	now := time.Now()
	session := models.Session{
		UserID:           user.ID,
		RefreshTokenHash: utils.HashToken(refreshToken),
		DeviceID:         strings.TrimSpace(metadata.DeviceID),
		DeviceInfo:       strings.TrimSpace(metadata.DeviceInfo),
		IPAddress:        strings.TrimSpace(metadata.IPAddress),
		UserAgent:        strings.TrimSpace(metadata.UserAgent),
		ExpiresAt:        now.Add(s.cfg.RefreshTokenTTL),
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	savedSession, err := s.sessions.Create(ctx, session)
	if err != nil {
		return models.AuthResponse{}, err
	}
	token, err := utils.GenerateToken(s.secret, user, s.cfg.TokenTTL, "access", savedSession.ID.Hex())
	if err != nil {
		return models.AuthResponse{}, err
	}
	return models.AuthResponse{
		Token:        token,
		AccessToken:  token,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.cfg.TokenTTL.Seconds()),
		User:         sanitizeUser(user),
	}, nil
}

func (s *authService) Register(ctx context.Context, input models.CreateUserInput, creatorRole models.Role) (models.User, error) {
	if creatorRole != models.RoleAdmin && creatorRole != models.RoleSuperAdmin {
		return models.User{}, errors.New("forbidden")
	}
	return createUser(ctx, s.users, input)
}

func (s *authService) BootstrapAdmin(ctx context.Context) error {
	if s.cfg.AdminEmail != "" && s.cfg.AdminPassword != "" {
		if _, err := s.users.FindAdmin(ctx); err != nil {
			if !errors.Is(err, mongo.ErrNoDocuments) {
				return err
			}
			if _, err := createUser(ctx, s.users, models.CreateUserInput{
				Name:     "System Admin",
				Email:    s.cfg.AdminEmail,
				Password: s.cfg.AdminPassword,
				Role:     models.RoleSuperAdmin,
			}); err != nil {
				return err
			}
		}
	}

	return s.users.ApplyDeletePolicy(ctx)
}

func (s *employeeService) Create(ctx context.Context, input models.CreateUserInput) (models.User, error) {
	return createUser(ctx, s.users, input)
}

func (s *employeeService) List(ctx context.Context, filter repositories.UserListFilter) ([]models.User, int64, error) {
	return s.users.List(ctx, filter)
}

func (s *employeeService) Get(ctx context.Context, id string) (models.User, error) {
	user, err := s.users.FindByID(ctx, id)
	if err != nil {
		return models.User{}, err
	}
	return sanitizeUser(user), nil
}

func (s *employeeService) Update(ctx context.Context, id string, input models.UpdateUserInput) (models.User, error) {
	if input.Name == "" && input.Email == "" && input.Password == "" && input.Role == "" && input.EmployeeCode == "" && input.Department == "" && input.DepartmentID == "" && input.ShiftID == "" && input.Address == "" && input.EmergencyContact == "" && input.ProfileImage == "" && input.Status == "" && input.Phone == "" && input.IsActive == nil {
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
	user, err := s.users.FindByID(ctx, id)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errors.New("employee not found")
		}
		return err
	}
	if !user.IsDelete {
		return errors.New("this user cannot be deleted")
	}
	return s.users.Delete(ctx, id)
}

func (s *employeeService) Profile(ctx context.Context, id string) (models.EmployeeAttendanceProfile, error) {
	user, err := s.users.FindByID(ctx, id)
	if err != nil {
		return models.EmployeeAttendanceProfile{}, err
	}
	history, err := s.attendance.ListByEmployee(ctx, id, 180)
	if err != nil {
		return models.EmployeeAttendanceProfile{}, err
	}
	return buildEmployeeProfile(sanitizeUser(user), history), nil
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
	if _, err := s.attendance.FindOpenByEmployee(ctx, input.EmployeeID); err == nil {
		return models.Attendance{}, errors.New("active attendance already exists")
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		return models.Attendance{}, err
	}
	if _, err := s.attendance.FindTodayByEmployee(ctx, input.EmployeeID, time.Now()); err == nil {
		return models.Attendance{}, errors.New("attendance already exists for today")
	} else if !errors.Is(err, mongo.ErrNoDocuments) {
		return models.Attendance{}, err
	}

	objectID, err := primitive.ObjectIDFromHex(input.EmployeeID)
	if err != nil {
		return models.Attendance{}, err
	}
	imagePath, err := utils.SaveUploadedImage(s.cfg.UploadDir, input.ImageName, input.ImageData)
	if err != nil {
		return models.Attendance{}, err
	}
	country, city, area, road, address := s.reverseGeocode(ctx, input.Latitude, input.Longitude)
	now := time.Now()
	deviceInfo := normalizeDeviceInfo(input.DeviceInfo)
	outsideOffice := false
	geoFenceStatus := "not_configured"
	if officeLocation, err := s.locations.GetActive(ctx); err == nil && officeLocation.RadiusMeters > 0 {
		distance := distanceMeters(input.Latitude, input.Longitude, officeLocation.Latitude, officeLocation.Longitude)
		outsideOffice = distance > float64(officeLocation.RadiusMeters)
		if outsideOffice {
			geoFenceStatus = "outside"
		} else {
			geoFenceStatus = "inside"
		}
	}
	attendance := models.Attendance{
		EmployeeID:       objectID,
		ClockIn:          now,
		Latitude:         input.Latitude,
		Longitude:        input.Longitude,
		IsOutsideOffice:  outsideOffice,
		GeoFenceStatus:   geoFenceStatus,
		Country:          country,
		City:             city,
		Area:             area,
		Road:             road,
		FormattedAddress: address,
		Image:            imagePath,
		Status:           "pending",
		ApprovalStatus:   "pending",
		LateMinutes:      0,
		OvertimeMinutes:  0,
		WorkDuration:     0,
		DeviceInfo:       deviceInfo,
		CreatedAt:        now,
		UpdatedAt:        now,
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
	attendance, err := s.attendance.FindByID(ctx, input.AttendanceID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.Attendance{}, errors.New("attendance not found")
		}
		return models.Attendance{}, err
	}
	if attendance.Status == "clocked-out" || attendance.ClockOut != nil {
		return models.Attendance{}, errors.New("attendance already clocked out")
	}
	settings, err := s.office.Get(ctx)
	if err != nil {
		return models.Attendance{}, err
	}
	workDuration := int64(time.Since(attendance.ClockIn).Minutes())
	lateMinutes, overtimeMinutes := computeLateAndOvertime(attendance.ClockIn, workDuration, settings)
	deviceInfo := normalizeDeviceInfo(input.DeviceInfo)
	if deviceInfo == "Unknown device" {
		deviceInfo = normalizeDeviceInfo(attendance.DeviceInfo)
	}
	updated, err := s.attendance.UpdateClockOut(ctx, input.AttendanceID, time.Now(), input.Latitude, input.Longitude, deviceInfo, workDuration, lateMinutes, overtimeMinutes)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.Attendance{}, errors.New("no active attendance found")
		}
		return models.Attendance{}, err
	}
	return updated, nil
}

func (s *attendanceService) Approve(ctx context.Context, input models.AttendanceApprovalInput) (models.Attendance, error) {
	if strings.TrimSpace(input.AttendanceID) == "" {
		return models.Attendance{}, errors.New("attendance id is required")
	}
	action := strings.ToLower(strings.TrimSpace(input.Action))
	if action == "" {
		action = "approve"
	}
	approvalStatus := "approved"
	status := strings.ToLower(strings.TrimSpace(input.Status))
	if status == "" {
		status = "approved"
	}
	switch action {
	case "approve":
		approvalStatus = "approved"
		if status == "approved" {
			status = "present"
		}
	case "reject":
		approvalStatus = "rejected"
		if status == "approved" || status == "pending" {
			status = "rejected"
		}
	case "suspicious":
		approvalStatus = "suspicious"
		status = "suspicious"
	default:
		return models.Attendance{}, errors.New("invalid approval action")
	}
	updated, err := s.attendance.UpdateApproval(ctx, input.AttendanceID, approvalStatus, status, input.Note, input.ApprovedBy)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.Attendance{}, errors.New("attendance not found")
		}
		return models.Attendance{}, err
	}
	return updated, nil
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

func (s *attendanceService) Analytics(ctx context.Context) (models.AttendanceAnalytics, error) {
	users, _, err := s.users.List(ctx, repositories.UserListFilter{Page: 1, Limit: 1000})
	if err != nil {
		return models.AttendanceAnalytics{}, err
	}
	settings, err := s.office.Get(ctx)
	if err != nil {
		return models.AttendanceAnalytics{}, err
	}
	start := time.Now().Truncate(24 * time.Hour)
	end := start.Add(24 * time.Hour)
	items, _, err := s.attendance.List(ctx, models.AttendanceFilter{From: start, To: end, Page: 1, Limit: 2000})
	if err != nil {
		return models.AttendanceAnalytics{}, err
	}

	analytics := models.AttendanceAnalytics{TotalEmployees: int64(len(users))}
	presentMap := map[string]struct{}{}
	lateMap := map[string]struct{}{}
	perfectMap := map[string]struct{}{}
	underMap := map[string]struct{}{}
	overMap := map[string]struct{}{}
	performance := make(map[string]int64)

	for _, item := range items {
		employeeID := item.EmployeeID.Hex()
		if item.ApprovalStatus == "pending" {
			analytics.PendingApprovals++
		}
		if item.ApprovalStatus == "approved" {
			presentMap[employeeID] = struct{}{}
			if item.LateMinutes > 0 {
				lateMap[employeeID] = struct{}{}
			} else {
				perfectMap[employeeID] = struct{}{}
			}
			if item.WorkDuration < settings.MinimumWorkHours*60 {
				underMap[employeeID] = struct{}{}
			}
			if item.OvertimeMinutes > 0 {
				overMap[employeeID] = struct{}{}
			}
			performance[employeeID] += item.WorkDuration
		}
	}

	analytics.PresentToday = int64(len(presentMap))
	if analytics.TotalEmployees > analytics.PresentToday {
		analytics.AbsentToday = analytics.TotalEmployees - analytics.PresentToday
	}
	analytics.LateEmployees = int64(len(lateMap))
	analytics.PerfectTimingEmployees = int64(len(perfectMap))
	analytics.UnderTimeEmployees = int64(len(underMap))
	analytics.OvertimeEmployees = int64(len(overMap))
	analytics.WeeklyAttendanceChart = s.makeWindowChart(ctx, 7)
	analytics.MonthlyAttendanceChart = s.makeWindowChart(ctx, 30)

	for _, user := range users {
		if value, ok := performance[user.ID.Hex()]; ok {
			analytics.EmployeePerformanceChart = append(analytics.EmployeePerformanceChart, models.EmployeeMetric{
				EmployeeID: user.ID.Hex(),
				Name:       user.Name,
				Value:      value,
			})
		}
	}
	return analytics, nil
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

func (s *attendanceService) EmployeeSummary(ctx context.Context, employeeID string) (models.EmployeeAttendanceProfile, error) {
	user, err := s.users.FindByID(ctx, employeeID)
	if err != nil {
		return models.EmployeeAttendanceProfile{}, err
	}
	history, err := s.attendance.ListByEmployee(ctx, employeeID, 365)
	if err != nil {
		return models.EmployeeAttendanceProfile{}, err
	}
	return buildEmployeeProfile(user, history), nil
}

func (s *officeService) Get(ctx context.Context) (models.OfficeSettings, error) {
	return s.repo.Get(ctx)
}

func (s *officeService) Update(ctx context.Context, input models.OfficeSettings) (models.OfficeSettings, error) {
	input.OfficeStartTime = normalizeTimeString(input.OfficeStartTime, "09:00")
	input.OfficeEndTime = normalizeTimeString(input.OfficeEndTime, "18:00")
	if input.GraceMinutes < 0 {
		input.GraceMinutes = 0
	}
	if input.MinimumWorkHours < 1 {
		input.MinimumWorkHours = 8
	}
	return s.repo.Upsert(ctx, input)
}

func createUser(ctx context.Context, users repositories.UserRepository, input models.CreateUserInput) (models.User, error) {
	if err := utils.ValidateName(input.Name); err != nil {
		return models.User{}, err
	}
	if err := utils.ValidateEmail(input.Email); err != nil {
		return models.User{}, err
	}
	role := input.Role
	if role == "" {
		role = models.RoleEmployee
	}
	password := strings.TrimSpace(input.Password)
	if role == models.RoleEmployee && password == "" {
		generatedPassword, err := utils.GeneratePassword(12)
		if err != nil {
			return models.User{}, err
		}
		password = generatedPassword
	}
	if password == "" {
		return models.User{}, errors.New("password is required")
	}
	if err := utils.ValidatePassword(password); err != nil {
		return models.User{}, err
	}
	hash, err := utils.HashPassword(password)
	if err != nil {
		return models.User{}, err
	}
	now := time.Now()
	employeeCode := strings.TrimSpace(input.EmployeeCode)
	if role == models.RoleEmployee || employeeCode == "" {
		employeeCode = generateEmployeeCode(ctx, users)
	}
	user := models.User{
		Name:         strings.TrimSpace(input.Name),
		Phone:        strings.TrimSpace(input.Phone),
		Email:        strings.ToLower(strings.TrimSpace(input.Email)),
		PasswordHash: hash,
		TemporaryPassword: func() string {
			if role == models.RoleEmployee {
				return password
			}
			return ""
		}(),
		Role:             role,
		Status:           "active",
		EmployeeCode:     employeeCode,
		Department:       strings.TrimSpace(input.Department),
		DepartmentID:     strings.TrimSpace(input.DepartmentID),
		ShiftID:          strings.TrimSpace(input.ShiftID),
		Address:          strings.TrimSpace(input.Address),
		EmergencyContact: strings.TrimSpace(input.EmergencyContact),
		ProfileImage:     strings.TrimSpace(input.ProfileImage),
		IsActive:         true,
		IsDelete:         true,
		CreatedAt:        now,
		UpdatedAt:        now,
	}
	created, err := users.Create(ctx, user)
	if err == nil {
		return created, nil
	}
	if strings.Contains(strings.ToLower(err.Error()), "duplicate key") && employeeCode != "" {
		user.EmployeeCode = generateEmployeeCode(ctx, users)
		return users.Create(ctx, user)
	}
	return models.User{}, err
}

func sanitizeUser(user models.User) models.User {
	user.TemporaryPassword = ""
	return user
}

func generateEmployeeCode(ctx context.Context, users repositories.UserRepository) string {
	items, _, err := users.List(ctx, repositories.UserListFilter{Page: 1, Limit: 5000})
	if err != nil {
		return fmt.Sprintf("EMP-%04d", time.Now().UnixNano()%10000)
	}
	pattern := regexp.MustCompile(`^EMP-(\d+)$`)
	var maxSequence int64
	for _, item := range items {
		match := pattern.FindStringSubmatch(strings.ToUpper(strings.TrimSpace(item.EmployeeCode)))
		if len(match) != 2 {
			continue
		}
		sequence, err := strconv.ParseInt(match[1], 10, 64)
		if err == nil && sequence > maxSequence {
			maxSequence = sequence
		}
	}
	return fmt.Sprintf("EMP-%04d", maxSequence+1)
}

func normalizeDeviceInfo(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return "Unknown device"
	}
	if strings.HasPrefix(value, "{") {
		var payload struct {
			Platform  string `json:"platform"`
			UserAgent string `json:"userAgent"`
		}
		if err := json.Unmarshal([]byte(value), &payload); err == nil {
			if payload.Platform != "" {
				return payload.Platform
			}
			if payload.UserAgent != "" {
				return payload.UserAgent
			}
		}
	}
	return value
}

func buildEmployeeProfile(user models.User, history []models.Attendance) models.EmployeeAttendanceProfile {
	profile := models.EmployeeAttendanceProfile{Employee: user, History: history, TodayStatus: "absent"}
	if len(history) == 0 {
		return profile
	}
	today := time.Now().Format("2006-01-02")
	var totalWork int64
	for _, item := range history {
		if item.ApprovalStatus == "approved" {
			profile.TotalApprovedAttendance++
			profile.TotalPresentDays++
		}
		if item.ApprovalStatus == "rejected" {
			profile.TotalRejectedAttendance++
		}
		if item.ApprovalStatus == "pending" {
			profile.PendingApprovals++
		}
		if item.LateMinutes > 0 {
			profile.TotalLateDays++
		}
		totalWork += item.WorkDuration
		if item.ClockIn.Format("2006-01-02") == today {
			profile.TodayStatus = item.ApprovalStatus
		}
	}
	if len(history) > 0 {
		profile.AverageWorkDuration = totalWork / int64(len(history))
	}
	window := int64(30)
	if int64(len(history)) < window {
		window = int64(len(history))
	}
	if window > profile.TotalPresentDays {
		profile.TotalAbsentDays = window - profile.TotalPresentDays
	}
	return profile
}

func normalizeTimeString(value, fallback string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	if _, err := time.Parse("15:04", value); err != nil {
		return fallback
	}
	return value
}

func computeLateAndOvertime(clockIn time.Time, workDuration int64, office models.OfficeSettings) (int64, int64) {
	officeStart := parseTodayTime(office.OfficeStartTime)
	lateAfter := officeStart.Add(time.Duration(office.GraceMinutes) * time.Minute)
	late := int64(0)
	if clockIn.After(lateAfter) {
		late = int64(clockIn.Sub(lateAfter).Minutes())
	}
	overtime := int64(0)
	target := office.MinimumWorkHours * 60
	if workDuration > target {
		overtime = workDuration - target
	}
	return late, overtime
}

func parseTodayTime(hhmm string) time.Time {
	now := time.Now()
	parts := strings.Split(hhmm, ":")
	if len(parts) != 2 {
		return time.Date(now.Year(), now.Month(), now.Day(), 9, 0, 0, 0, now.Location())
	}
	h, _ := strconv.Atoi(parts[0])
	m, _ := strconv.Atoi(parts[1])
	return time.Date(now.Year(), now.Month(), now.Day(), h, m, 0, 0, now.Location())
}

func (s *attendanceService) reverseGeocode(ctx context.Context, lat, lon float64) (country, city, area, road, formatted string) {
	url := fmt.Sprintf("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=%f&lon=%f", lat, lon)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", "", "", "", ""
	}
	req.Header.Set("User-Agent", "go-test-attendance-system/1.0")
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", "", "", "", ""
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return "", "", "", "", ""
	}
	var payload struct {
		DisplayName string `json:"display_name"`
		Address     struct {
			Country string `json:"country"`
			City    string `json:"city"`
			Town    string `json:"town"`
			Village string `json:"village"`
			Suburb  string `json:"suburb"`
			Road    string `json:"road"`
		} `json:"address"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return "", "", "", "", ""
	}
	city = payload.Address.City
	if city == "" {
		city = payload.Address.Town
	}
	if city == "" {
		city = payload.Address.Village
	}
	return payload.Address.Country, city, payload.Address.Suburb, payload.Address.Road, payload.DisplayName
}

func (s *attendanceService) makeWindowChart(ctx context.Context, days int) []models.ChartPoint {
	points := make([]models.ChartPoint, 0, days)
	for i := days - 1; i >= 0; i-- {
		day := time.Now().AddDate(0, 0, -i)
		start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, day.Location())
		end := start.Add(24 * time.Hour)
		items, _, err := s.attendance.List(ctx, models.AttendanceFilter{From: start, To: end, Approval: "approved", Page: 1, Limit: 2000})
		value := int64(0)
		if err == nil {
			value = int64(len(items))
		}
		points = append(points, models.ChartPoint{Label: start.Format("Jan 2"), Value: value})
	}
	return points
}
