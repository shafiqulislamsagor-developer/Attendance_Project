package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Role string

const (
	RoleSuperAdmin Role = "super_admin"
	RoleAdmin      Role = "admin"
	RoleEmployee   Role = "employee"
)

type User struct {
	ID                primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name              string             `bson:"name" json:"name"`
	Phone             string             `bson:"phone,omitempty" json:"phone,omitempty"`
	Email             string             `bson:"email" json:"email"`
	PasswordHash      string             `bson:"passwordHash" json:"-"`
	TemporaryPassword string             `bson:"temporaryPassword,omitempty" json:"temporaryPassword,omitempty"`
	Role              Role               `bson:"role" json:"role"`
	Status            string             `bson:"status,omitempty" json:"status,omitempty"`
	EmployeeCode      string             `bson:"employeeCode,omitempty" json:"employeeCode,omitempty"`
	Department        string             `bson:"department,omitempty" json:"department,omitempty"`
	DepartmentID      string             `bson:"departmentId,omitempty" json:"departmentId,omitempty"`
	ShiftID           string             `bson:"shiftId,omitempty" json:"shiftId,omitempty"`
	Address           string             `bson:"address,omitempty" json:"address,omitempty"`
	EmergencyContact  string             `bson:"emergencyContact,omitempty" json:"emergencyContact,omitempty"`
	ProfileImage      string             `bson:"profileImage,omitempty" json:"profileImage,omitempty"`
	IsActive          bool               `bson:"isActive" json:"isActive"`
	IsDelete          bool               `bson:"isDelete" json:"isDelete"`
	CreatedAt         time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt         time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type CreateUserInput struct {
	Name             string `json:"name"`
	Phone            string `json:"phone"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	Role             Role   `json:"role"`
	EmployeeCode     string `json:"employeeCode"`
	Department       string `json:"department"`
	DepartmentID     string `json:"departmentId"`
	ShiftID          string `json:"shiftId"`
	Address          string `json:"address"`
	EmergencyContact string `json:"emergencyContact"`
	ProfileImage     string `json:"profileImage"`
}

type UpdateUserInput struct {
	Name             string `json:"name"`
	Phone            string `json:"phone"`
	Email            string `json:"email"`
	Password         string `json:"password"`
	Role             Role   `json:"role"`
	EmployeeCode     string `json:"employeeCode"`
	Department       string `json:"department"`
	DepartmentID     string `json:"departmentId"`
	ShiftID          string `json:"shiftId"`
	Address          string `json:"address"`
	EmergencyContact string `json:"emergencyContact"`
	ProfileImage     string `json:"profileImage"`
	Status           string `json:"status"`
	IsActive         *bool  `json:"isActive"`
}

type LoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token        string `json:"token"`
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
	User         User   `json:"user"`
}

type RefreshTokenInput struct {
	RefreshToken string `json:"refreshToken"`
}

type SessionMetadata struct {
	DeviceID   string `json:"deviceId"`
	DeviceInfo string `json:"deviceInfo"`
	IPAddress  string `json:"ipAddress"`
	UserAgent  string `json:"userAgent"`
}

type Session struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID           primitive.ObjectID `bson:"userId" json:"userId"`
	RefreshTokenHash string             `bson:"refreshTokenHash" json:"-"`
	DeviceID         string             `bson:"deviceId,omitempty" json:"deviceId,omitempty"`
	DeviceInfo       string             `bson:"deviceInfo,omitempty" json:"deviceInfo,omitempty"`
	IPAddress        string             `bson:"ipAddress,omitempty" json:"ipAddress,omitempty"`
	UserAgent        string             `bson:"userAgent,omitempty" json:"userAgent,omitempty"`
	ExpiresAt        time.Time          `bson:"expiresAt" json:"expiresAt"`
	RevokedAt        *time.Time         `bson:"revokedAt,omitempty" json:"revokedAt,omitempty"`
	LastUsedAt       *time.Time         `bson:"lastUsedAt,omitempty" json:"lastUsedAt,omitempty"`
	CreatedAt        time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type Attendance struct {
	ID               primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	EmployeeID       primitive.ObjectID  `bson:"employeeId" json:"employeeId"`
	ClockIn          time.Time           `bson:"clockIn" json:"clockIn"`
	ClockOut         *time.Time          `bson:"clockOut,omitempty" json:"clockOut,omitempty"`
	Latitude         float64             `bson:"latitude" json:"latitude"`
	Longitude        float64             `bson:"longitude" json:"longitude"`
	IsOutsideOffice  bool                `bson:"isOutsideOffice" json:"isOutsideOffice"`
	GeoFenceStatus   string              `bson:"geoFenceStatus,omitempty" json:"geoFenceStatus,omitempty"`
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
	TotalEmployees           int64            `json:"totalEmployees"`
	PresentToday             int64            `json:"presentToday"`
	AbsentToday              int64            `json:"absentToday"`
	PendingApprovals         int64            `json:"pendingApprovals"`
	LateEmployees            int64            `json:"lateEmployees"`
	PerfectTimingEmployees   int64            `json:"perfectTimingEmployees"`
	UnderTimeEmployees       int64            `json:"underTimeEmployees"`
	OvertimeEmployees        int64            `json:"overtimeEmployees"`
	WeeklyAttendanceChart    []ChartPoint     `json:"weeklyAttendanceChart"`
	MonthlyAttendanceChart   []ChartPoint     `json:"monthlyAttendanceChart"`
	EmployeePerformanceChart []EmployeeMetric `json:"employeePerformanceChart"`
}

type EmployeeAttendanceProfile struct {
	Employee                User         `json:"employee"`
	History                 []Attendance `json:"history"`
	TotalPresentDays        int64        `json:"totalPresentDays"`
	TotalAbsentDays         int64        `json:"totalAbsentDays"`
	TotalLateDays           int64        `json:"totalLateDays"`
	TotalApprovedAttendance int64        `json:"totalApprovedAttendance"`
	TotalRejectedAttendance int64        `json:"totalRejectedAttendance"`
	PendingApprovals        int64        `json:"pendingApprovals"`
	AverageWorkDuration     int64        `json:"averageWorkDuration"`
	TodayStatus             string       `json:"todayStatus"`
}

type AttendanceApprovalInput struct {
	AttendanceID string `json:"attendanceId"`
	Action       string `json:"action"`
	Status       string `json:"status"`
	Note         string `json:"note"`
	ApprovedBy   string `json:"approvedBy"`
}
