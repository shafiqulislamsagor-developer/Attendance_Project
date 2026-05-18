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

func (r *sessionRepo) Create(ctx context.Context, session models.Session) (models.Session, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	result, err := r.collection.InsertOne(ctx, session)
	if err != nil {
		return models.Session{}, err
	}
	objectID, ok := result.InsertedID.(primitive.ObjectID)
	if !ok {
		return models.Session{}, errors.New("failed to parse inserted id")
	}
	session.ID = objectID
	return session, nil
}

func (r *sessionRepo) FindByID(ctx context.Context, id string) (models.Session, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var session models.Session
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return session, err
	}
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&session)
	return session, err
}

func (r *sessionRepo) FindByRefreshTokenHash(ctx context.Context, refreshTokenHash string) (models.Session, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	var session models.Session
	err := r.collection.FindOne(ctx, bson.M{
		"refreshTokenHash": refreshTokenHash,
		"revokedAt":        bson.M{"$exists": false},
		"expiresAt":        bson.M{"$gt": time.Now()},
	}).Decode(&session)
	return session, err
}

func (r *sessionRepo) UpdateRefreshToken(ctx context.Context, id string, refreshTokenHash string, expiresAt time.Time, lastUsedAt time.Time) (models.Session, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return models.Session{}, err
	}
	update := bson.M{"$set": bson.M{
		"refreshTokenHash": refreshTokenHash,
		"expiresAt":        expiresAt,
		"lastUsedAt":       lastUsedAt,
		"updatedAt":        lastUsedAt,
	}}
	result, err := r.collection.UpdateByID(ctx, objectID, update)
	if err != nil {
		return models.Session{}, err
	}
	if result.MatchedCount == 0 {
		return models.Session{}, mongo.ErrNoDocuments
	}
	return r.FindByID(ctx, id)
}

func (r *sessionRepo) Revoke(ctx context.Context, id string, revokedAt time.Time) error {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}
	_, err = r.collection.UpdateByID(ctx, objectID, bson.M{"$set": bson.M{"revokedAt": revokedAt, "updatedAt": revokedAt}})
	return err
}

func (r *sessionRepo) RevokeAllByUser(ctx context.Context, userID string, revokedAt time.Time) error {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return err
	}
	_, err = r.collection.UpdateMany(ctx, bson.M{"userId": objectID, "revokedAt": bson.M{"$exists": false}}, bson.M{"$set": bson.M{"revokedAt": revokedAt, "updatedAt": revokedAt}})
	return err
}

func (r *sessionRepo) ListActiveByUser(ctx context.Context, userID string) ([]models.Session, error) {
	ctx, cancel := timeoutContext(ctx)
	defer cancel()
	objectID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, err
	}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cur, err := r.collection.Find(ctx, bson.M{"userId": objectID, "revokedAt": bson.M{"$exists": false}}, opts)
	if err != nil {
		return nil, err
	}
	defer cur.Close(ctx)
	sessions := make([]models.Session, 0)
	for cur.Next(ctx) {
		var session models.Session
		if err := cur.Decode(&session); err != nil {
			return nil, err
		}
		sessions = append(sessions, session)
	}
	return sessions, cur.Err()
}
