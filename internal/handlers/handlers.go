package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"go-test/internal/middleware"
	"go-test/internal/models"
	"go-test/internal/repositories"
	"go-test/internal/services"
	"go-test/internal/utils"
)

type AuthHandler struct {
	service services.AuthService
	users   services.EmployeeService
}

type EmployeeHandler struct {
	service services.EmployeeService
}

type AttendanceHandler struct {
	service services.AttendanceService
}

type OfficeHandler struct {
	service services.OfficeService
}

func NewAuthHandler(service services.AuthService, users services.EmployeeService) *AuthHandler {
	return &AuthHandler{service: service, users: users}
}

func NewEmployeeHandler(service services.EmployeeService) *EmployeeHandler {
	return &EmployeeHandler{service: service}
}

func NewAttendanceHandler(service services.AttendanceService) *AttendanceHandler {
	return &AttendanceHandler{service: service}
}

func NewOfficeHandler(service services.OfficeService) *OfficeHandler {
	return &OfficeHandler{service: service}
}

func (h *EmployeeHandler) ListOrCreate(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.List(w, r)
	case http.MethodPost:
		h.Create(w, r)
	default:
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input models.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	input.Email = strings.TrimSpace(input.Email)
	response, err := h.service.Login(r.Context(), input, requestSessionMetadata(r))
	if err != nil {
		utils.JSONError(w, http.StatusUnauthorized, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, response)
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := middleware.UserFromContext(r.Context())
	if !ok || (user.Role != models.RoleAdmin && user.Role != models.RoleSuperAdmin) {
		utils.JSONError(w, http.StatusForbidden, "forbidden")
		return
	}
	var input models.CreateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	created, err := h.service.Register(r.Context(), input, user.Role)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusCreated, created)
}

func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	profile, err := h.users.Get(r.Context(), user.ID)
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "user not found")
		return
	}
	utils.JSON(w, http.StatusOK, profile)
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input models.RefreshTokenInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.Refresh(r.Context(), input, requestSessionMetadata(r))
	if err != nil {
		utils.JSONError(w, http.StatusUnauthorized, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, response)
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := h.service.Logout(r.Context(), user.SessionID); err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, map[string]bool{"loggedOut": true})
}

func (h *AuthHandler) LogoutAll(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if err := h.service.LogoutAll(r.Context(), user.ID); err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, map[string]bool{"loggedOutAll": true})
}

func (h *EmployeeHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	page, _ := strconv.ParseInt(r.URL.Query().Get("page"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	filter := repositories.UserListFilter{
		Search: strings.TrimSpace(r.URL.Query().Get("search")),
		Role:   models.Role(strings.TrimSpace(r.URL.Query().Get("role"))),
		Page:   page,
		Limit:  limit,
	}
	if active := strings.TrimSpace(r.URL.Query().Get("active")); active != "" {
		parsed := strings.EqualFold(active, "true")
		filter.Active = &parsed
	}
	items, total, err := h.service.List(r.Context(), filter)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

func (h *EmployeeHandler) Create(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input models.CreateUserInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	created, err := h.service.Create(r.Context(), input)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusCreated, created)
}

func (h *EmployeeHandler) Detail(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/v1/employees/")
	if path == "" {
		utils.JSONError(w, http.StatusBadRequest, "employee id is required")
		return
	}
	parts := strings.Split(strings.Trim(path, "/"), "/")
	id := parts[0]
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "employee id is required")
		return
	}
	if len(parts) == 2 && parts[1] == "profile" {
		h.Profile(w, r, id)
		return
	}
	switch r.Method {
	case http.MethodGet:
		item, err := h.service.Get(r.Context(), id)
		if err != nil {
			utils.JSONError(w, http.StatusNotFound, "employee not found")
			return
		}
		utils.JSON(w, http.StatusOK, item)
	case http.MethodPatch:
		var input models.UpdateUserInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.JSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		item, err := h.service.Update(r.Context(), id, input)
		if err != nil {
			utils.JSONError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, item)
	case http.MethodDelete:
		if err := h.service.Delete(r.Context(), id); err != nil {
			utils.JSONError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSON(w, http.StatusNoContent, map[string]any{"deleted": true})
	default:
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *EmployeeHandler) Profile(w http.ResponseWriter, r *http.Request, employeeID string) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	profile, err := h.service.Profile(r.Context(), employeeID)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, profile)
}

func (h *AttendanceHandler) ClockIn(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	if err := r.ParseMultipartForm(20 << 20); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid multipart form")
		return
	}
	input, err := h.parseClockForm(r)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	attendance, err := h.service.ClockIn(r.Context(), input)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusCreated, attendance)
}

func (h *AttendanceHandler) ClockOut(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input models.ClockOutInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	attendance, err := h.service.ClockOut(r.Context(), input)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, attendance)
}

func (h *AttendanceHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	page, _ := strconv.ParseInt(r.URL.Query().Get("page"), 10, 64)
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	from, _ := time.Parse(time.RFC3339, r.URL.Query().Get("from"))
	to, _ := time.Parse(time.RFC3339, r.URL.Query().Get("to"))
	filter := models.AttendanceFilter{
		EmployeeID: strings.TrimSpace(r.URL.Query().Get("employeeId")),
		Status:     strings.TrimSpace(r.URL.Query().Get("status")),
		Approval:   strings.TrimSpace(r.URL.Query().Get("approval")),
		From:       from,
		To:         to,
		Page:       page,
		Limit:      limit,
		Search:     strings.TrimSpace(r.URL.Query().Get("search")),
	}
	items, total, err := h.service.List(r.Context(), filter)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, map[string]any{"items": items, "total": total})
}

func (h *AttendanceHandler) Summary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	summary, err := h.service.Summary(r.Context())
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, summary)
}

func (h *AttendanceHandler) Analytics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	analytics, err := h.service.Analytics(r.Context())
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, analytics)
}

func (h *AttendanceHandler) RecentByEmployee(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	employeeID := strings.TrimSpace(r.URL.Query().Get("employeeId"))
	limit, _ := strconv.ParseInt(r.URL.Query().Get("limit"), 10, 64)
	items, err := h.service.Recent(r.Context(), employeeID, limit)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, items)
}

func (h *AttendanceHandler) Approve(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	attendanceID := strings.TrimPrefix(r.URL.Path, "/api/v1/attendance/")
	attendanceID = strings.TrimSuffix(attendanceID, "/approval")
	attendanceID = strings.Trim(attendanceID, "/")
	if attendanceID == "" {
		utils.JSONError(w, http.StatusBadRequest, "attendance id is required")
		return
	}
	var payload struct {
		Action string `json:"action"`
		Status string `json:"status"`
		Note   string `json:"note"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	updated, err := h.service.Approve(r.Context(), models.AttendanceApprovalInput{
		AttendanceID: attendanceID,
		Action:       payload.Action,
		Status:       payload.Status,
		Note:         payload.Note,
		ApprovedBy:   user.ID,
	})
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, updated)
}

func (h *AttendanceHandler) EmployeeSummary(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	profile, err := h.service.EmployeeSummary(r.Context(), user.ID)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, profile)
}

func (h *OfficeHandler) GetOrUpdate(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		settings, err := h.service.Get(r.Context())
		if err != nil {
			utils.JSONError(w, http.StatusInternalServerError, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, settings)
	case http.MethodPut:
		fallthrough
	case http.MethodPatch:
		var input models.OfficeSettings
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.JSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		saved, err := h.service.Update(r.Context(), input)
		if err != nil {
			utils.JSONError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, saved)
	default:
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *AttendanceHandler) parseClockForm(r *http.Request) (models.ClockInInput, error) {
	var input models.ClockInInput
	input.EmployeeID = strings.TrimSpace(r.FormValue("employeeId"))
	input.DeviceInfo = strings.TrimSpace(r.FormValue("deviceInfo"))
	latitude, err := strconv.ParseFloat(r.FormValue("latitude"), 64)
	if err != nil {
		return input, fmt.Errorf("latitude is required")
	}
	longitude, err := strconv.ParseFloat(r.FormValue("longitude"), 64)
	if err != nil {
		return input, fmt.Errorf("longitude is required")
	}
	input.Latitude = latitude
	input.Longitude = longitude
	file, header, err := r.FormFile("image")
	if err != nil {
		if dataURL := strings.TrimSpace(r.FormValue("imageData")); dataURL != "" {
			bytes, _, decodeErr := utils.DecodeDataURL(dataURL)
			if decodeErr != nil {
				return input, decodeErr
			}
			input.ImageName = fmt.Sprintf("selfie-%d.jpg", time.Now().UnixNano())
			input.ImageData = bytes
			return input, nil
		}
		return input, fmt.Errorf("image is required")
	}
	defer file.Close()
	bytes, err := io.ReadAll(io.LimitReader(file, 12<<20))
	if err != nil {
		return input, err
	}
	input.ImageName = header.Filename
	input.ImageData = bytes
	input.ImageType = header.Header.Get("Content-Type")
	return input, nil
}

func requestSessionMetadata(r *http.Request) models.SessionMetadata {
	ipAddress := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if ipAddress == "" {
		ipAddress = strings.TrimSpace(r.Header.Get("X-Real-Ip"))
	}
	if ipAddress == "" {
		ipAddress = strings.TrimSpace(strings.Split(r.RemoteAddr, ":")[0])
	}
	return models.SessionMetadata{
		DeviceID:   strings.TrimSpace(r.Header.Get("X-Device-Id")),
		DeviceInfo: strings.TrimSpace(r.Header.Get("X-Device-Info")),
		IPAddress:  ipAddress,
		UserAgent:  strings.TrimSpace(r.UserAgent()),
	}
}
