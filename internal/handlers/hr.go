package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"go-test/internal/middleware"
	"go-test/internal/models"
	"go-test/internal/services"
	"go-test/internal/utils"
)

type DepartmentHandler struct {
	service services.DepartmentService
}

type ShiftHandler struct {
	service services.ShiftService
}

type LeaveHandler struct {
	service services.LeaveService
}

type OfficeLocationHandler struct {
	service services.OfficeLocationService
}

type AuditHandler struct {
	service services.AuditService
}

func NewDepartmentHandler(service services.DepartmentService) *DepartmentHandler {
	return &DepartmentHandler{service: service}
}

func NewShiftHandler(service services.ShiftService) *ShiftHandler {
	return &ShiftHandler{service: service}
}

func NewLeaveHandler(service services.LeaveService) *LeaveHandler {
	return &LeaveHandler{service: service}
}

func NewOfficeLocationHandler(service services.OfficeLocationService) *OfficeLocationHandler {
	return &OfficeLocationHandler{service: service}
}

func NewAuditHandler(service services.AuditService) *AuditHandler {
	return &AuditHandler{service: service}
}

func (h *DepartmentHandler) ListOrCreate(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		items, err := h.service.List(r.Context())
		if err != nil {
			utils.JSONError(w, http.StatusInternalServerError, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var input models.Department
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
	default:
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *DepartmentHandler) Detail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/departments/")
	id = strings.Trim(id, "/")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "department id is required")
		return
	}
	switch r.Method {
	case http.MethodGet:
		item, err := h.service.Get(r.Context(), id)
		if err != nil {
			utils.JSONError(w, http.StatusNotFound, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, item)
	case http.MethodPatch:
		var input models.Department
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.JSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		updated, err := h.service.Update(r.Context(), id, input)
		if err != nil {
			utils.JSONError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, updated)
	case http.MethodDelete:
		if err := h.service.Delete(r.Context(), id); err != nil {
			utils.JSONError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSON(w, http.StatusNoContent, map[string]bool{"deleted": true})
	default:
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *ShiftHandler) ListOrCreate(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		items, err := h.service.List(r.Context())
		if err != nil {
			utils.JSONError(w, http.StatusInternalServerError, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var input models.Shift
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
	default:
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *ShiftHandler) Detail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/v1/shifts/")
	id = strings.Trim(id, "/")
	if id == "" {
		utils.JSONError(w, http.StatusBadRequest, "shift id is required")
		return
	}
	switch r.Method {
	case http.MethodGet:
		item, err := h.service.Get(r.Context(), id)
		if err != nil {
			utils.JSONError(w, http.StatusNotFound, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, item)
	case http.MethodPatch:
		var input models.Shift
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.JSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		updated, err := h.service.Update(r.Context(), id, input)
		if err != nil {
			utils.JSONError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, updated)
	case http.MethodDelete:
		if err := h.service.Delete(r.Context(), id); err != nil {
			utils.JSONError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSON(w, http.StatusNoContent, map[string]bool{"deleted": true})
	default:
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *LeaveHandler) Request(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	var input models.LeaveRequest
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	created, err := h.service.Request(r.Context(), user.ID, input)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusCreated, created)
}

func (h *LeaveHandler) MyRequests(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	items, err := h.service.ListMyRequests(r.Context(), user.ID)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *LeaveHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	items, err := h.service.List(r.Context())
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *LeaveHandler) Review(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	user, ok := middleware.UserFromContext(r.Context())
	if !ok {
		utils.JSONError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	leaveID := strings.TrimPrefix(r.URL.Path, "/api/v1/leaves/")
	leaveID = strings.TrimSuffix(leaveID, "/review")
	leaveID = strings.Trim(leaveID, "/")
	if leaveID == "" {
		utils.JSONError(w, http.StatusBadRequest, "leave id is required")
		return
	}
	var payload struct {
		Status string `json:"status"`
		Reason string `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		utils.JSONError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	updated, err := h.service.Review(r.Context(), leaveID, user.ID, payload.Status, payload.Reason)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, updated)
}

func (h *LeaveHandler) Balance(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	userID := strings.TrimSpace(r.URL.Query().Get("employeeId"))
	if userID == "" {
		if user, ok := middleware.UserFromContext(r.Context()); ok {
			userID = user.ID
		}
	}
	year, _ := strconv.Atoi(strings.TrimSpace(r.URL.Query().Get("year")))
	balance, err := h.service.GetBalance(r.Context(), userID, year)
	if err != nil {
		utils.JSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, balance)
}

func (h *OfficeLocationHandler) ListOrSave(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		items, err := h.service.List(r.Context())
		if err != nil {
			utils.JSONError(w, http.StatusInternalServerError, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, map[string]any{"items": items})
	case http.MethodPost:
		var input models.OfficeLocation
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			utils.JSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		saved, err := h.service.Save(r.Context(), input)
		if err != nil {
			utils.JSONError(w, http.StatusBadRequest, err.Error())
			return
		}
		utils.JSON(w, http.StatusOK, saved)
	default:
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h *OfficeLocationHandler) Active(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	item, err := h.service.GetActive(r.Context())
	if err != nil {
		utils.JSONError(w, http.StatusNotFound, "office location not found")
		return
	}
	utils.JSON(w, http.StatusOK, item)
}

func (h *AuditHandler) List(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.JSONError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	limit, _ := strconv.ParseInt(strings.TrimSpace(r.URL.Query().Get("limit")), 10, 64)
	items, err := h.service.List(r.Context(), limit)
	if err != nil {
		utils.JSONError(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.JSON(w, http.StatusOK, map[string]any{"items": items})
}