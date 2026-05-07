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
}

type AttendanceRepository interface {
	Create(ctx context.Context, attendance models.Attendance) (models.Attendance, error)
	FindByID(ctx context.Context, id string) (models.Attendance, error)
	FindTodayByEmployee(ctx context.Context, employeeID string, day time.Time) (models.Attendance, error)
	UpdateClockOut(ctx context.Context, id string, clockOut time.Time, latitude, longitude float64, deviceInfo string) (models.Attendance, error)
	List(ctx context.Context, filter models.AttendanceFilter) ([]models.Attendance, int64, error)
	Summary(ctx context.Context) (models.AttendanceSummary, error)
	RecentByEmployee(ctx context.Context, employeeID string, limit int64) ([]models.Attendance, error)
}

type userRepo struct {
	collection *mongo.Collection
}

type attendanceRepo struct {
	collection *mongo.Collection
}

func NewUserRepository(db database.Service) UserRepository {
	return &userRepo{collection: db.Collections().Users}
}

func NewAttendanceRepository(db database.Service) AttendanceRepository {
	return &attendanceRepo{collection: db.Collections().Attendances}
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
		}
	}
	total, err := r.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip((page - 1) * limit).SetLimit(limit).SetSort(bson.M{"createdAt": -1})
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
		updates["name"] = input.Name
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
	err := r.collection.FindOne(ctx, bson.M{"role": models.RoleAdmin}).Decode(&user)
	return user, err
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

func (r *attendanceRepo) UpdateClockOut(ctx context.Context, id string, clockOut time.Time, latitude, longitude float64, deviceInfo string) (models.Attendance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.Attendance{}, err
	}
	update := bson.M{"$set": bson.M{"clockOut": clockOut, "status": "clocked-out", "latitude": latitude, "longitude": longitude, "deviceInfo": deviceInfo, "updatedAt": clockOut}}
	_, err = r.collection.UpdateByID(ctx, objectID, update)
	if err != nil {
		return models.Attendance{}, err
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
		query["status"] = filter.Status
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
	count, err := r.collection.CountDocuments(ctx, query)
	if err != nil {
		return nil, 0, err
	}
	opts := options.Find().SetSkip((page - 1) * limit).SetLimit(limit).SetSort(bson.M{"clockIn": -1})
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
	totalPresent, err := r.collection.CountDocuments(ctx, bson.M{"status": "clocked-in"})
	if err != nil {
		return models.AttendanceSummary{}, err
	}
	totalClockOuts, err := r.collection.CountDocuments(ctx, bson.M{"status": "clocked-out"})
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
	opts := options.Find().SetSort(bson.M{"clockIn": -1}).SetLimit(limit)
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
