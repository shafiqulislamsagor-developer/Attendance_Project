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
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"passwordHash" json:"-"`
	Role         Role               `bson:"role" json:"role"`
	EmployeeCode string             `bson:"employeeCode,omitempty" json:"employeeCode,omitempty"`
	Department   string             `bson:"department,omitempty" json:"department,omitempty"`
	IsActive     bool               `bson:"isActive" json:"isActive"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type CreateUserInput struct {
	Name         string `json:"name"`
	Email        string `json:"email"`
	Password     string `json:"password"`
	Role         Role   `json:"role"`
	EmployeeCode string `json:"employeeCode"`
	Department   string `json:"department"`
}

type UpdateUserInput struct {
	Name         string `json:"name"`
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
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	EmployeeID primitive.ObjectID `bson:"employeeId" json:"employeeId"`
	ClockIn    time.Time          `bson:"clockIn" json:"clockIn"`
	ClockOut   *time.Time         `bson:"clockOut,omitempty" json:"clockOut,omitempty"`
	Latitude   float64            `bson:"latitude" json:"latitude"`
	Longitude  float64            `bson:"longitude" json:"longitude"`
	Image      string             `bson:"image" json:"image"`
	Status     string             `bson:"status" json:"status"`
	DeviceInfo string             `bson:"deviceInfo,omitempty" json:"deviceInfo,omitempty"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time          `bson:"updatedAt" json:"updatedAt"`
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
