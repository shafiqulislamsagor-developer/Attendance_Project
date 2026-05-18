package repositories

import (
	"context"
	"errors"
	"time"

	"go-test/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func (r *departmentRepo) Create(ctx context.Context, department models.Department) (models.Department, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	result, err := r.collection.InsertOne(ctx, department)
	if err != nil {
		return models.Department{}, err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		department.ID = id
	}
	return department, nil
}

func (r *departmentRepo) List(ctx context.Context) ([]models.Department, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})
	cur, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	items := make([]models.Department, 0)
	for cur.Next(ctx) {
		var item models.Department
		if err := cur.Decode(&item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, cur.Err()
}

func (r *departmentRepo) FindByID(ctx context.Context, id string) (models.Department, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var department models.Department
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return department, err
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&department)
	return department, err
}

func (r *departmentRepo) Update(ctx context.Context, id string, department models.Department) (models.Department, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.Department{}, err
	}
	update := bson.M{"$set": bson.M{
		"name":      department.Name,
		"code":      department.Code,
		"isActive":  department.IsActive,
		"updatedAt": time.Now(),
	}}
	if _, err := r.collection.UpdateByID(ctx, objectID, update); err != nil {
		return models.Department{}, err
	}
	return r.FindByID(ctx, id)
}

func (r *departmentRepo) Delete(ctx context.Context, id string) error {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	return err
}

func (r *shiftRepo) Create(ctx context.Context, shift models.Shift) (models.Shift, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	result, err := r.collection.InsertOne(ctx, shift)
	if err != nil {
		return models.Shift{}, err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		shift.ID = id
	}
	return shift, nil
}

func (r *shiftRepo) List(ctx context.Context) ([]models.Shift, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	opts := options.Find().SetSort(bson.D{{Key: "startTime", Value: 1}})
	cur, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	items := make([]models.Shift, 0)
	for cur.Next(ctx) {
		var item models.Shift
		if err := cur.Decode(&item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, cur.Err()
}

func (r *shiftRepo) FindByID(ctx context.Context, id string) (models.Shift, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var shift models.Shift
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return shift, err
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&shift)
	return shift, err
}

func (r *shiftRepo) Update(ctx context.Context, id string, shift models.Shift) (models.Shift, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.Shift{}, err
	}
	update := bson.M{"$set": bson.M{
		"name":             shift.Name,
		"startTime":        shift.StartTime,
		"endTime":          shift.EndTime,
		"breakMinutes":     shift.BreakMinutes,
		"graceMinutes":     shift.GraceMinutes,
		"minimumWorkHours": shift.MinimumWorkHours,
		"officeMinutes":    shift.OfficeMinutes,
		"effectiveMinutes": shift.EffectiveMinutes,
		"isActive":         shift.IsActive,
		"updatedAt":        time.Now(),
	}}
	if _, err := r.collection.UpdateByID(ctx, objectID, update); err != nil {
		return models.Shift{}, err
	}
	return r.FindByID(ctx, id)
}

func (r *shiftRepo) Delete(ctx context.Context, id string) error {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	return err
}

func (r *leaveRepo) CreateRequest(ctx context.Context, request models.LeaveRequest) (models.LeaveRequest, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	result, err := r.collection.InsertOne(ctx, request)
	if err != nil {
		return models.LeaveRequest{}, err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		request.ID = id
	}
	return request, nil
}

func (r *leaveRepo) ListByEmployee(ctx context.Context, employeeID string) ([]models.LeaveRequest, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(employeeID)
	if err != nil {
		return nil, err
	}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cur, err := r.collection.Find(ctx, bson.M{"employeeId": objectID}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	items := make([]models.LeaveRequest, 0)
	for cur.Next(ctx) {
		var item models.LeaveRequest
		if err := cur.Decode(&item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, cur.Err()
}

func (r *leaveRepo) List(ctx context.Context) ([]models.LeaveRequest, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cur, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	items := make([]models.LeaveRequest, 0)
	for cur.Next(ctx) {
		var item models.LeaveRequest
		if err := cur.Decode(&item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, cur.Err()
}

func (r *leaveRepo) FindByID(ctx context.Context, id string) (models.LeaveRequest, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var request models.LeaveRequest
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return request, err
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&request)
	return request, err
}

func (r *leaveRepo) Review(ctx context.Context, id string, status string, reviewerID string, reason string) (models.LeaveRequest, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.LeaveRequest{}, err
	}
	now := time.Now()
	updates := bson.M{"status": status, "reviewedAt": now, "updatedAt": now}
	if reviewerID != "" {
		if reviewerObjectID, err := primitive.ObjectIDFromHex(reviewerID); err == nil {
			updates["reviewedBy"] = reviewerObjectID
		}
	}
	if reason != "" {
		updates["rejectionReason"] = reason
	}
	if _, err := r.collection.UpdateByID(ctx, objectID, bson.M{"$set": updates}); err != nil {
		return models.LeaveRequest{}, err
	}
	return r.FindByID(ctx, id)
}

func (r *leaveRepo) GetBalance(ctx context.Context, employeeID string, year int) (models.LeaveBalance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var balance models.LeaveBalance
	objectID, err := primitive.ObjectIDFromHex(employeeID)
	if err != nil {
		return balance, err
	}
	err = r.balance.FindOne(ctx, bson.M{"employeeId": objectID, "year": year}).Decode(&balance)
	if errors.Is(err, mongo.ErrNoDocuments) {
		return models.LeaveBalance{EmployeeID: objectID, Year: year}, nil
	}
	return balance, err
}

func (r *leaveRepo) UpsertBalance(ctx context.Context, balance models.LeaveBalance) (models.LeaveBalance, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	filter := bson.M{"employeeId": balance.EmployeeID, "year": balance.Year}
	update := bson.M{"$set": bson.M{"sick": balance.Sick, "casual": balance.Casual, "paid": balance.Paid, "emergency": balance.Emergency}}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	if err := r.balance.FindOneAndUpdate(ctx, filter, update, opts).Decode(&balance); err != nil {
		return models.LeaveBalance{}, err
	}
	return balance, nil
}

func (r *officeLocationRepo) List(ctx context.Context) ([]models.OfficeLocation, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	opts := options.Find().SetSort(bson.D{{Key: "isActive", Value: -1}, {Key: "createdAt", Value: -1}})
	cur, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	items := make([]models.OfficeLocation, 0)
	for cur.Next(ctx) {
		var item models.OfficeLocation
		if err := cur.Decode(&item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, cur.Err()
}

func (r *officeLocationRepo) Upsert(ctx context.Context, location models.OfficeLocation) (models.OfficeLocation, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	now := time.Now()
	location.UpdatedAt = now
	if location.CreatedAt.IsZero() {
		location.CreatedAt = now
	}
	update := bson.M{"$set": bson.M{
		"name":         location.Name,
		"latitude":     location.Latitude,
		"longitude":    location.Longitude,
		"radiusMeters": location.RadiusMeters,
		"address":      location.Address,
		"isActive":     location.IsActive,
		"updatedAt":    location.UpdatedAt,
	}, "$setOnInsert": bson.M{"createdAt": location.CreatedAt}}
	opts := options.FindOneAndUpdate().SetUpsert(true).SetReturnDocument(options.After)
	if err := r.collection.FindOneAndUpdate(ctx, bson.M{"name": location.Name}, update, opts).Decode(&location); err != nil {
		return models.OfficeLocation{}, err
	}
	return location, nil
}

func (r *officeLocationRepo) GetActive(ctx context.Context) (models.OfficeLocation, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var location models.OfficeLocation
	err := r.collection.FindOne(ctx, bson.M{"isActive": true}).Decode(&location)
	return location, err
}

func (r *auditRepo) Create(ctx context.Context, log models.AuditLog) (models.AuditLog, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	if log.CreatedAt.IsZero() {
		log.CreatedAt = time.Now()
	}
	result, err := r.collection.InsertOne(ctx, log)
	if err != nil {
		return models.AuditLog{}, err
	}
	if id, ok := result.InsertedID.(primitive.ObjectID); ok {
		log.ID = id
	}
	return log, nil
}

func (r *auditRepo) List(ctx context.Context, limit int64) ([]models.AuditLog, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	if limit < 1 {
		limit = 50
	}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(limit)
	cur, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	items := make([]models.AuditLog, 0)
	for cur.Next(ctx) {
		var item models.AuditLog
		if err := cur.Decode(&item); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, cur.Err()
}
