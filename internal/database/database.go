package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"go-test/internal/config"

	_ "github.com/joho/godotenv/autoload"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Service interface {
	Health() map[string]string
	Client() *mongo.Client
	DB() *mongo.Database
	Collections() Collections
	Close(ctx context.Context) error
}

type Collections struct {
	Users           *mongo.Collection
	Sessions        *mongo.Collection
	Attendances     *mongo.Collection
	Departments     *mongo.Collection
	Shifts          *mongo.Collection
	Leaves          *mongo.Collection
	LeaveBalances   *mongo.Collection
	Office          *mongo.Collection
	OfficeLocations  *mongo.Collection
	AuditLogs       *mongo.Collection
}

type service struct {
	client      *mongo.Client
	db          *mongo.Database
	collections Collections
}

var (
	host = os.Getenv("BLUEPRINT_DB_HOST")
	port = os.Getenv("BLUEPRINT_DB_PORT")
)

func New() Service {
	cfg := config.Load()
	mongoURI := cfg.MongoURI
	if host != "" && port != "" && os.Getenv("MONGO_URI") == "" {
		mongoURI = fmt.Sprintf("mongodb://%s:%s", host, port)
	}
	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatal(err)
	}
	db := client.Database(cfg.MongoDatabase)
	svc := &service{
		client: client,
		db:     db,
		collections: Collections{
			Users:          db.Collection("users"),
			Sessions:       db.Collection("sessions"),
			Attendances:    db.Collection("attendances"),
			Departments:    db.Collection("departments"),
			Shifts:         db.Collection("shifts"),
			Leaves:         db.Collection("leave_requests"),
			LeaveBalances:  db.Collection("leave_balances"),
			Office:         db.Collection("office_settings"),
			OfficeLocations: db.Collection("office_locations"),
			AuditLogs:      db.Collection("audit_logs"),
		},
	}
	svc.ensureIndexes()
	return svc
}

func (s *service) Health() map[string]string {
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	if err := s.client.Ping(ctx, nil); err != nil {
		log.Fatalf("db down: %v", err)
	}

	return map[string]string{
		"message":  "It's healthy",
		"database": s.db.Name(),
	}
}

func (s *service) Client() *mongo.Client {
	return s.client
}

func (s *service) DB() *mongo.Database {
	return s.db
}

func (s *service) Collections() Collections {
	return s.collections
}

func (s *service) ensureIndexes() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	indexModels := []struct {
		collection *mongo.Collection
		model      mongo.IndexModel
	}{
		{
			collection: s.collections.Users,
			model: mongo.IndexModel{
				Keys:    bson.D{{Key: "employeeCode", Value: 1}},
				Options: options.Index().SetUnique(true).SetSparse(true).SetName("uniq_employee_code"),
			},
		},
		{
			collection: s.collections.Departments,
			model: mongo.IndexModel{
				Keys:    bson.D{{Key: "code", Value: 1}},
				Options: options.Index().SetUnique(true).SetSparse(true).SetName("uniq_department_code"),
			},
		},
	}

	for _, indexModel := range indexModels {
		if _, err := indexModel.collection.Indexes().CreateOne(ctx, indexModel.model); err != nil {
			log.Printf("warning: unable to ensure index on %s: %v", indexModel.collection.Name(), err)
		}
	}
}

func (s *service) Close(ctx context.Context) error {
	return s.client.Disconnect(ctx)
}
