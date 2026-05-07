package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Role string

const (
	RoleAdmin    Role = "admin"
	RoleEmployee Role = "employee"
)

type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name         string             `bson:"name" json:"name"`
	Phone        string             `bson:"phone,omitempty" json:"phone,omitempty"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"passwordHash" json:"-"`
	Role         Role               `bson:"role" json:"role"`
	EmployeeCode string             `bson:"employeeCode,omitempty" json:"employeeCode,omitempty"`
	Department   string             `bson:"department,omitempty" json:"department,omitempty"`
	IsActive     bool               `bson:"isActive" json:"isActive"`
	IsDelete     bool               `bson:"isDelete" json:"isDelete"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type CreateUserInput struct {
	Name         string `json:"name"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	Role         Role   `json:"role"`
	EmployeeCode string `json:"employeeCode"`
	Department   string `json:"department"`
}

type UpdateUserInput struct {
	Name         string `json:"name"`
	Phone        string `json:"phone"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	Role         Role   `json:"role"`
	EmployeeCode string `json:"employeeCode"`
	Department   string `json:"department"`
	IsActive     *bool  `json:"isActive"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type Attendance struct {
	ID               primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	EmployeeID       primitive.ObjectID  `bson:"employeeId" json:"employeeId"`
	ClockIn          time.Time           `bson:"clockIn" json:"clockIn"`
	ClockOut         *time.Time          `bson:"clockOut,omitempty" json:"clockOut,omitempty"`
	Latitude         float64             `bson:"latitude" json:"latitude"`
	Longitude        float64             `bson:"longitude" json:"longitude"`
	Country          string              `bson:"country,omitempty" json:"country,omitempty"`
	City             string              `bson:"city,omitempty" json:"city,omitempty"`
	Area             string              `bson:"area,omitempty" json:"area,omitempty"`
	Road             string              `bson:"road,omitempty" json:"road,omitempty"`
	FormattedAddress string              `bson:"formattedAddress,omitempty" json:"formattedAddress,omitempty"`
	Image            string              `bson:"image" json:"image"`
	Status           string              `bson:"status" json:"status"`
	ApprovalStatus   string              `bson:"approvalStatus,omitempty" json:"approvalStatus,omitempty"`
	ApprovalNote     string              `bson:"approvalNote,omitempty" json:"approvalNote,omitempty"`
	ApprovedBy       *primitive.ObjectID `bson:"approvedBy,omitempty" json:"approvedBy,omitempty"`
	ApprovedAt       *time.Time          `bson:"approvedAt,omitempty" json:"approvedAt,omitempty"`
	LateMinutes      int64               `bson:"lateMinutes,omitempty" json:"lateMinutes,omitempty"`
	OvertimeMinutes  int64               `bson:"overtimeMinutes,omitempty" json:"overtimeMinutes,omitempty"`
	WorkDuration     int64               `bson:"workDuration,omitempty" json:"workDuration,omitempty"`
	DeviceInfo       string              `bson:"deviceInfo,omitempty" json:"deviceInfo,omitempty"`
	CreatedAt        time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time           `bson:"updatedAt" json:"updatedAt"`
}

type ClockInInput struct {
	EmployeeID string
	Latitude   float64
	Longitude  float64
	DeviceInfo string
	ImageName  string
	ImageData  []byte
	ImageType  string
}

type ClockOutInput struct {
	AttendanceID string  `json:"attendanceId"`
	Latitude     float64 `json:"latitude"`
	Longitude    float64 `json:"longitude"`
	DeviceInfo   string  `json:"deviceInfo"`
}

type AttendanceFilter struct {
	EmployeeID string
	Status     string
	Approval   string
	From       time.Time
	To         time.Time
	Page       int64
	Limit      int64
	Search     string
}

type AttendanceSummary struct {
	TotalRecords   int64 `json:"totalRecords"`
	TotalPresent   int64 `json:"totalPresent"`
	TotalClockOuts int64 `json:"totalClockOuts"`
	TotalEmployees int64 `json:"totalEmployees"`
}

type OfficeSettings struct {
	OfficeStartTime  string    `bson:"officeStartTime" json:"officeStartTime"`
	OfficeEndTime    string    `bson:"officeEndTime" json:"officeEndTime"`
	GraceMinutes     int64     `bson:"graceMinutes" json:"graceMinutes"`
	MinimumWorkHours int64     `bson:"minimumWorkHours" json:"minimumWorkHours"`
	CreatedAt        time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time `bson:"updatedAt" json:"updatedAt"`
}

type ChartPoint struct {
	Label string `json:"label"`
	Value int64  `json:"value"`
}

type EmployeeMetric struct {
	EmployeeID string `json:"employeeId"`
	Name       string `json:"name"`
	Value      int64  `json:"value"`
}

type AttendanceAnalytics struct {
	TotalEmployees           int64          `json:"totalEmployees"`
	PresentToday             int64          `json:"presentToday"`
	AbsentToday              int64          `json:"absentToday"`
	PendingApprovals         int64          `json:"pendingApprovals"`
	LateEmployees            int64          `json:"lateEmployees"`
	PerfectTimingEmployees   int64          `json:"perfectTimingEmployees"`
	UnderTimeEmployees       int64          `json:"underTimeEmployees"`
	OvertimeEmployees        int64          `json:"overtimeEmployees"`
	WeeklyAttendanceChart    []ChartPoint   `json:"weeklyAttendanceChart"`
	MonthlyAttendanceChart   []ChartPoint   `json:"monthlyAttendanceChart"`
	EmployeePerformanceChart []EmployeeMetric `json:"employeePerformanceChart"`
}

type EmployeeAttendanceProfile struct {
	Employee               User          `json:"employee"`
	History                []Attendance  `json:"history"`
	TotalPresentDays       int64         `json:"totalPresentDays"`
	TotalAbsentDays        int64         `json:"totalAbsentDays"`
	TotalLateDays          int64         `json:"totalLateDays"`
	TotalApprovedAttendance int64        `json:"totalApprovedAttendance"`
	TotalRejectedAttendance int64        `json:"totalRejectedAttendance"`
	PendingApprovals       int64         `json:"pendingApprovals"`
	AverageWorkDuration    int64         `json:"averageWorkDuration"`
	TodayStatus            string        `json:"todayStatus"`
}

type AttendanceApprovalInput struct {
	AttendanceID string `json:"attendanceId"`
	Action       string `json:"action"`
	Status       string `json:"status"`
	Note         string `json:"note"`
	ApprovedBy   string `json:"approvedBy"`
}
