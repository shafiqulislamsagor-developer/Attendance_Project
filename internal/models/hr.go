package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Department struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name      string             `bson:"name" json:"name"`
	Code      string             `bson:"code" json:"code"`
	IsActive  bool               `bson:"isActive" json:"isActive"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type Shift struct {
	ID               primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name             string             `bson:"name" json:"name"`
	StartTime        string             `bson:"startTime" json:"startTime"`
	EndTime          string             `bson:"endTime" json:"endTime"`
	GraceMinutes     int64              `bson:"graceMinutes" json:"graceMinutes"`
	MinimumWorkHours int64              `bson:"minimumWorkHours" json:"minimumWorkHours"`
	IsActive         bool               `bson:"isActive" json:"isActive"`
	CreatedAt        time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt        time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type LeaveRequest struct {
	ID              primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	EmployeeID      primitive.ObjectID  `bson:"employeeId" json:"employeeId"`
	LeaveType       string              `bson:"leaveType" json:"leaveType"`
	FromDate        time.Time           `bson:"fromDate" json:"fromDate"`
	ToDate          time.Time           `bson:"toDate" json:"toDate"`
	Reason          string              `bson:"reason" json:"reason"`
	DocumentURL     string              `bson:"documentUrl,omitempty" json:"documentUrl,omitempty"`
	Status          string              `bson:"status" json:"status"`
	ReviewedBy      *primitive.ObjectID `bson:"reviewedBy,omitempty" json:"reviewedBy,omitempty"`
	ReviewedAt      *time.Time          `bson:"reviewedAt,omitempty" json:"reviewedAt,omitempty"`
	RejectionReason string              `bson:"rejectionReason,omitempty" json:"rejectionReason,omitempty"`
	CreatedAt       time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt       time.Time           `bson:"updatedAt" json:"updatedAt"`
}

type LeaveBalance struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	EmployeeID primitive.ObjectID `bson:"employeeId" json:"employeeId"`
	Year       int                `bson:"year" json:"year"`
	Sick       int64              `bson:"sick" json:"sick"`
	Casual     int64              `bson:"casual" json:"casual"`
	Paid       int64              `bson:"paid" json:"paid"`
	Emergency  int64              `bson:"emergency" json:"emergency"`
}

type OfficeLocation struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name         string             `bson:"name" json:"name"`
	Latitude     float64            `bson:"latitude" json:"latitude"`
	Longitude    float64            `bson:"longitude" json:"longitude"`
	RadiusMeters  int64              `bson:"radiusMeters" json:"radiusMeters"`
	Address      string             `bson:"address,omitempty" json:"address,omitempty"`
	IsActive     bool               `bson:"isActive" json:"isActive"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type AuditLog struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	ActorID    string             `bson:"actorId,omitempty" json:"actorId,omitempty"`
	Action     string             `bson:"action" json:"action"`
	EntityType string             `bson:"entityType" json:"entityType"`
	EntityID   string             `bson:"entityId,omitempty" json:"entityId,omitempty"`
	IPAddress  string             `bson:"ipAddress,omitempty" json:"ipAddress,omitempty"`
	DeviceInfo string             `bson:"deviceInfo,omitempty" json:"deviceInfo,omitempty"`
	Metadata   string             `bson:"metadata,omitempty" json:"metadata,omitempty"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}
