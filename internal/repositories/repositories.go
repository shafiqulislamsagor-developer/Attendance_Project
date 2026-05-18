package repositories

import (
	"context"
	"errors"
	"strings"
	"time"

	"go-test/internal/database"
	"go-test/internal/models"
	"go-test/internal/utils"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type UserListFilter struct {
	Search string
	Role   models.Role
	Page   int64
	Limit  int64
	Active *bool
}

type UserRepository interface {
	Create(ctx context.Context, user models.User) (models.User, error)
	FindByEmail(ctx context.Context, email string) (models.User, error)
	FindByID(ctx context.Context, id string) (models.User, error)
	List(ctx context.Context, filter UserListFilter) ([]models.User, int64, error)
	Update(ctx context.Context, id string, input models.UpdateUserInput) (models.User, error)
	Delete(ctx context.Context, id string) error
	CountByRole(ctx context.Context, role models.Role) (int64, error)
	Count(ctx context.Context) (int64, error)
	FindAdmin(ctx context.Context) (models.User, error)
	ApplyDeletePolicy(ctx context.Context) error
}

type SessionRepository interface {
	Create(ctx context.Context, session models.Session) (models.Session, error)
	FindByID(ctx context.Context, id string) (models.Session, error)
	FindByRefreshTokenHash(ctx context.Context, refreshTokenHash string) (models.Session, error)
	UpdateRefreshToken(ctx context.Context, id string, refreshTokenHash string, expiresAt time.Time, lastUsedAt time.Time) (models.Session, error)
	Revoke(ctx context.Context, id string, revokedAt time.Time) error
	RevokeAllByUser(ctx context.Context, userID string, revokedAt time.Time) error
	ListActiveByUser(ctx context.Context, userID string) ([]models.Session, error)
}

type AttendanceRepository interface {
	Create(ctx context.Context, attendance models.Attendance) (models.Attendance, error)
	FindByID(ctx context.Context, id string) (models.Attendance, error)
	FindOpenByEmployee(ctx context.Context, employeeID string) (models.Attendance, error)
	FindTodayByEmployee(ctx context.Context, employeeID string, day time.Time) (models.Attendance, error)
	UpdateClockOut(ctx context.Context, id string, clockOut time.Time, latitude, longitude float64, deviceInfo string, workDuration, lateMinutes, overtimeMinutes int64) (models.Attendance, error)
	UpdateApproval(ctx context.Context, id string, approvalStatus, status, note, approvedBy string) (models.Attendance, error)
	List(ctx context.Context, filter models.AttendanceFilter) ([]models.Attendance, int64, error)
	Summary(ctx context.Context) (models.AttendanceSummary, error)
	RecentByEmployee(ctx context.Context, employeeID string, limit int64) ([]models.Attendance, error)
	ListByEmployee(ctx context.Context, employeeID string, limit int64) ([]models.Attendance, error)
}

type OfficeRepository interface {
	Get(ctx context.Context) (models.OfficeSettings, error)
	Upsert(ctx context.Context, input models.OfficeSettings) (models.OfficeSettings, error)
}

type DepartmentRepository interface {
	Create(ctx context.Context, department models.Department) (models.Department, error)
	List(ctx context.Context) ([]models.Department, error)
	FindByID(ctx context.Context, id string) (models.Department, error)
	Update(ctx context.Context, id string, department models.Department) (models.Department, error)
	Delete(ctx context.Context, id string) error
}

type ShiftRepository interface {
	Create(ctx context.Context, shift models.Shift) (models.Shift, error)
	List(ctx context.Context) ([]models.Shift, error)
	FindByID(ctx context.Context, id string) (models.Shift, error)
	Update(ctx context.Context, id string, shift models.Shift) (models.Shift, error)
	Delete(ctx context.Context, id string) error
}

type LeaveRepository interface {
	CreateRequest(ctx context.Context, request models.LeaveRequest) (models.LeaveRequest, error)
	ListByEmployee(ctx context.Context, employeeID string) ([]models.LeaveRequest, error)
	List(ctx context.Context) ([]models.LeaveRequest, error)
	FindByID(ctx context.Context, id string) (models.LeaveRequest, error)
	Review(ctx context.Context, id string, status string, reviewerID string, reason string) (models.LeaveRequest, error)
	GetBalance(ctx context.Context, employeeID string, year int) (models.LeaveBalance, error)
	UpsertBalance(ctx context.Context, balance models.LeaveBalance) (models.LeaveBalance, error)
}

type OfficeLocationRepository interface {
	List(ctx context.Context) ([]models.OfficeLocation, error)
	Upsert(ctx context.Context, location models.OfficeLocation) (models.OfficeLocation, error)
	GetActive(ctx context.Context) (models.OfficeLocation, error)
}

type AuditRepository interface {
	Create(ctx context.Context, log models.AuditLog) (models.AuditLog, error)
	List(ctx context.Context, limit int64) ([]models.AuditLog, error)
}

type userRepo struct {
	collection *mongo.Collection
}

type attendanceRepo struct {
	collection *mongo.Collection
}

type officeRepo struct {
	collection *mongo.Collection
}

type sessionRepo struct {
	collection *mongo.Collection
}

type departmentRepo struct {
	collection *mongo.Collection
}

type shiftRepo struct {
	collection *mongo.Collection
}

type leaveRepo struct {
	collection *mongo.Collection
	balance    *mongo.Collection
}

type officeLocationRepo struct {
	collection *mongo.Collection
}

type auditRepo struct {
	collection *mongo.Collection
}

func NewUserRepository(db database.Service) UserRepository {
	return &userRepo{collection: db.Collections().Users}
}

func NewAttendanceRepository(db database.Service) AttendanceRepository {
	return &attendanceRepo{collection: db.Collections().Attendances}
}

func NewOfficeRepository(db database.Service) OfficeRepository {
	return &officeRepo{collection: db.Collections().Office}
}

func NewSessionRepository(db database.Service) SessionRepository {
	return &sessionRepo{collection: db.Collections().Sessions}
}

func NewDepartmentRepository(db database.Service) DepartmentRepository {
	return &departmentRepo{collection: db.Collections().Departments}
}

func NewShiftRepository(db database.Service) ShiftRepository {
	return &shiftRepo{collection: db.Collections().Shifts}
}

func NewLeaveRepository(db database.Service) LeaveRepository {
	return &leaveRepo{collection: db.Collections().Leaves, balance: db.Collections().LeaveBalances}
}

func NewOfficeLocationRepository(db database.Service) OfficeLocationRepository {
	return &officeLocationRepo{collection: db.Collections().OfficeLocations}
}

func NewAuditRepository(db database.Service) AuditRepository {
	return &auditRepo{collection: db.Collections().AuditLogs}
}

func timeoutContext(parent context.Context) (context.Context, context.CancelFunc) {
	return context.WithTimeout(parent, 5*time.Second)
}

func (r *userRepo) Create(ctx context.Context, user models.User) (models.User, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	result, err := r.collection.InsertOne(ctx, user)
	if err != nil {
		return models.User{}, err
	}
	objectID, ok := result.InsertedID.(primitive.ObjectID)
	if !ok {
		return models.User{}, errors.New("failed to parse inserted id")
	}
	user.ID = objectID
	return user, nil
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (models.User, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"email": strings.ToLower(strings.TrimSpace(email))}).Decode(&user)
	return user, err
}

func (r *userRepo) FindByID(ctx context.Context, id string) (models.User, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var user models.User
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return user, err
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&user)
	return user, err
}

func (r *userRepo) List(ctx context.Context, filter UserListFilter) ([]models.User, int64, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 10
	}
	query := bson.M{}
	if filter.Role != "" {
		query["role"] = filter.Role
	}
	if filter.Active != nil {
		query["isActive"] = *filter.Active
	}
	if filter.Search != "" {
		query["$or"] = []bson.M{
			{"name": bson.M{"$regex": filter.Search, "$options": "i"}},
			{"email": bson.M{"$regex": filter.Search, "$options": "i"}},
			{"employeeCode": bson.M{"$regex": filter.Search, "$options": "i"}},
			{"phone": bson.M{"$regex": filter.Search, "$options": "i"}},
		}
	}
	total, err := r.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip((page - 1) * limit).SetLimit(limit).SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cur, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	users := make([]models.User, 0)
	for cur.Next(ctx) {
		var user models.User
		if err := cur.Decode(&user); err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}
	return users, total, cur.Err()
}

func (r *userRepo) Update(ctx context.Context, id string, input models.UpdateUserInput) (models.User, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.User{}, err
	}
	updates := bson.M{"updatedAt": time.Now()}
	if input.Name != "" {
		updates["name"] = strings.TrimSpace(input.Name)
	}
	if input.Phone != "" {
		updates["phone"] = strings.TrimSpace(input.Phone)
	}
	if input.Email != "" {
		updates["email"] = strings.ToLower(strings.TrimSpace(input.Email))
	}
	if input.Role != "" {
		updates["role"] = input.Role
	}
	if input.EmployeeCode != "" {
		updates["employeeCode"] = input.EmployeeCode
	}
	if input.Department != "" {
		updates["department"] = input.Department
	}
	if input.DepartmentID != "" {
		updates["departmentId"] = input.DepartmentID
	}
	if input.ShiftID != "" {
		updates["shiftId"] = input.ShiftID
	}
	if input.Address != "" {
		updates["address"] = input.Address
	}
	if input.EmergencyContact != "" {
		updates["emergencyContact"] = input.EmergencyContact
	}
	if input.ProfileImage != "" {
		updates["profileImage"] = input.ProfileImage
	}
	if input.Status != "" {
		updates["status"] = input.Status
	}
	if input.Password != "" {
		hash, err := utils.HashPassword(input.Password)
		if err != nil {
			return models.User{}, err
		}
		updates["passwordHash"] = hash
	}
	if input.IsActive != nil {
		updates["isActive"] = *input.IsActive
	}
	_, err = r.collection.UpdateByID(ctx, objectID, bson.M{"$set": updates})
	if err != nil {
		return models.User{}, err
	}
	return r.FindByID(ctx, id)
}

func (r *userRepo) Delete(ctx context.Context, id string) error {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	return err
}

func (r *userRepo) CountByRole(ctx context.Context, role models.Role) (int64, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	return r.collection.CountDocuments(ctx, bson.M{"role": role})
}

func (r *userRepo) Count(ctx context.Context) (int64, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	return r.collection.CountDocuments(ctx, bson.M{})
}

func (r *userRepo) FindAdmin(ctx context.Context) (models.User, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var user models.User
	err := r.collection.FindOne(ctx, bson.M{"role": bson.M{"$in": []models.Role{models.RoleAdmin, models.RoleSuperAdmin}}}).Decode(&user)
	return user, err
}

func (r *userRepo) ApplyDeletePolicy(ctx context.Context) error {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()

	var firstUser models.User
	err := r.collection.FindOne(ctx, bson.M{}, options.FindOne().SetSort(bson.D{{Key: "createdAt", Value: 1}})).Decode(&firstUser)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return nil
	}
	if err != nil {
		return err
	}

	if _, err := r.collection.UpdateMany(ctx, bson.M{}, bson.M{"$set": bson.M{"isDelete": true}}); err != nil {
		return err
	}
	_, err = r.collection.UpdateByID(ctx, firstUser.ID, bson.M{"$set": bson.M{"isDelete": false}})
	return err
}

func (r *attendanceRepo) Create(ctx context.Context, attendance models.Attendance) (models.Attendance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	result, err := r.collection.InsertOne(ctx, attendance)
	if err != nil {
		return models.Attendance{}, err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		attendance.ID = id
	}
	return attendance, nil
}

func (r *attendanceRepo) FindByID(ctx context.Context, id string) (models.Attendance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var attendance models.Attendance
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return attendance, err
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&attendance)
	return attendance, err
}

func (r *attendanceRepo) FindOpenByEmployee(ctx context.Context, employeeID string) (models.Attendance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var attendance models.Attendance
	objectID, err := primitive.ObjectIDFromHex(employeeID)
	if err != nil {
		return attendance, err
	}
	err = r.collection.FindOne(ctx, bson.M{
		"employeeId": objectID,
		"status":     bson.M{"$nin": []string{"clocked-out", "absent"}},
		"clockOut":   bson.M{"$exists": false},
	}).Decode(&attendance)
	return attendance, err
}

func (r *attendanceRepo) FindTodayByEmployee(ctx context.Context, employeeID string, day time.Time) (models.Attendance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var attendance models.Attendance
	objectID, err := primitive.ObjectIDFromHex(employeeID)
	if err != nil {
		return attendance, err
	}
	start := time.Date(day.Year(), day.Month(), day.Day(), 0, 0, 0, 0, day.Location())
	end := start.Add(24 * time.Hour)
	err = r.collection.FindOne(ctx, bson.M{"employeeId": objectID, "clockIn": bson.M{"$gte": start, "$lt": end}}).Decode(&attendance)
	return attendance, err
}

func (r *attendanceRepo) UpdateClockOut(ctx context.Context, id string, clockOut time.Time, latitude, longitude float64, deviceInfo string, workDuration, lateMinutes, overtimeMinutes int64) (models.Attendance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.Attendance{}, err
	}
	update := bson.M{"$set": bson.M{
		"clockOut":        clockOut,
		"status":          "pending",
		"latitude":        latitude,
		"longitude":       longitude,
		"deviceInfo":      deviceInfo,
		"workDuration":    workDuration,
		"lateMinutes":     lateMinutes,
		"overtimeMinutes": overtimeMinutes,
		"approvalStatus":  "pending",
		"updatedAt":       clockOut,
	}}
	filter := bson.M{"_id": objectID, "status": bson.M{"$ne": "clocked-out"}}
	result, err := r.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return models.Attendance{}, err
	}
	if result.MatchedCount == 0 {
		return models.Attendance{}, mongo.ErrNoDocuments
	}
	return r.FindByID(ctx, id)
}

func (r *attendanceRepo) UpdateApproval(ctx context.Context, id string, approvalStatus, status, note, approvedBy string) (models.Attendance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.Attendance{}, err
	}
	now := time.Now()
	updates := bson.M{
		"approvalStatus": strings.ToLower(strings.TrimSpace(approvalStatus)),
		"status":         strings.ToLower(strings.TrimSpace(status)),
		"approvalNote":   strings.TrimSpace(note),
		"approvedAt":     now,
		"updatedAt":      now,
	}
	if approvedBy != "" {
		if approverID, err := primitive.ObjectIDFromHex(approvedBy); err == nil {
			updates["approvedBy"] = approverID
		}
	}
	result, err := r.collection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{"$set": updates})
	if err != nil {
		return models.Attendance{}, err
	}
	if result.MatchedCount == 0 {
		return models.Attendance{}, mongo.ErrNoDocuments
	}
	return r.FindByID(ctx, id)
}

func (r *attendanceRepo) List(ctx context.Context, filter models.AttendanceFilter) ([]models.Attendance, int64, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	page := filter.Page
	if page < 1 {
		page = 1
	}
	limit := filter.Limit
	if limit < 1 {
		limit = 10
	}
	query := bson.M{}
	if filter.EmployeeID != "" {
		if objectID, err := primitive.ObjectIDFromHex(filter.EmployeeID); err == nil {
			query["employeeId"] = objectID
		}
	}
	if filter.Status != "" {
		query["status"] = strings.ToLower(filter.Status)
	}
	if filter.Approval != "" {
		query["approvalStatus"] = strings.ToLower(filter.Approval)
	}
	if !filter.From.IsZero() || !filter.To.IsZero() {
		rangeQuery := bson.M{}
		if !filter.From.IsZero() {
			rangeQuery["$gte"] = filter.From
		}
		if !filter.To.IsZero() {
			rangeQuery["$lte"] = filter.To
		}
		query["clockIn"] = rangeQuery
	}
	if filter.Search != "" {
		query["deviceInfo"] = bson.M{"$regex": filter.Search, "$options": "i"}
	}
	count, err := r.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip((page - 1) * limit).SetLimit(limit).SetSort(bson.D{{Key: "clockIn", Value: -1}})
	cur, err := r.collection.Find(ctx, query, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cur.Close(ctx)
	items := make([]models.Attendance, 0)
	for cur.Next(ctx) {
		var attendance models.Attendance
		if err := cur.Decode(&attendance); err != nil {
			return nil, 0, err
		}
		items = append(items, attendance)
	}
	return items, count, cur.Err()
}

func (r *attendanceRepo) Summary(ctx context.Context) (models.AttendanceSummary, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	totalRecords, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return models.AttendanceSummary{}, err
	}
	totalPresent, err := r.collection.CountDocuments(ctx, bson.M{"approvalStatus": "approved"})
	if err != nil {
		return models.AttendanceSummary{}, err
	}
	totalClockOuts, err := r.collection.CountDocuments(ctx, bson.M{"clockOut": bson.M{"$exists": true}})
	if err != nil {
		return models.AttendanceSummary{}, err
	}
	return models.AttendanceSummary{TotalRecords: totalRecords, TotalPresent: totalPresent, TotalClockOuts: totalClockOuts}, nil
}

func (r *attendanceRepo) RecentByEmployee(ctx context.Context, employeeID string, limit int64) ([]models.Attendance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(employeeID)
	if err != nil {
		return nil, err
	}
	opts := options.Find().SetSort(bson.D{{Key: "clockIn", Value: -1}}).SetLimit(limit)
	cur, err := r.collection.Find(ctx, bson.M{"employeeId": objectID}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	items := make([]models.Attendance, 0)
	for cur.Next(ctx) {
		var attendance models.Attendance
		if err := cur.Decode(&attendance); err != nil {
			return nil, err
		}
		items = append(items, attendance)
	}
	return items, cur.Err()
}

func (r *attendanceRepo) ListByEmployee(ctx context.Context, employeeID string, limit int64) ([]models.Attendance, error) {
	if limit < 1 {
		limit = 100
	}
	return r.RecentByEmployee(ctx, employeeID, limit)
}

func (r *officeRepo) Get(ctx context.Context) (models.OfficeSettings, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var settings models.OfficeSettings
	err := r.collection.FindOne(ctx, bson.M{}).Decode(&settings)
	if errors.Is(err, mongo.ErrNoDocuments) {
		now := time.Now()
		return models.OfficeSettings{
			OfficeStartTime:  "09:00",
			OfficeEndTime:    "18:00",
			GraceMinutes:     15,
			MinimumWorkHours: 8,
			CreatedAt:        now,
			UpdatedAt:        now,
		}, nil
	}
	return settings, err
}

func (r *officeRepo) Upsert(ctx context.Context, input models.OfficeSettings) (models.OfficeSettings, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	now := time.Now()
	input.UpdatedAt = now
	if input.CreatedAt.IsZero() {
		input.CreatedAt = now
	}
	update := bson.M{"$set": bson.M{
		"officeStartTime":  input.OfficeStartTime,
		"officeEndTime":    input.OfficeEndTime,
		"graceMinutes":     input.GraceMinutes,
		"minimumWorkHours": input.MinimumWorkHours,
		"updatedAt":        input.UpdatedAt,
	}, "$setOnInsert": bson.M{"createdAt": input.CreatedAt}}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After).SetUpsert(true)
	var saved models.OfficeSettings
	if err := r.collection.FindOneAndUpdate(ctx, bson.M{}, update, opts).Decode(&saved); err != nil {
		return models.OfficeSettings{}, err
	}
	return saved, nil
}
