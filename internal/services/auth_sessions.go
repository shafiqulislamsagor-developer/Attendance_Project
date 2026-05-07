package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"go-test/internal/models"
	"go-test/internal/utils"

	"go.mongodb.org/mongo-driver/mongo"
)

func (s *authService) Refresh(ctx context.Context, input models.RefreshTokenInput, metadata models.SessionMetadata) (models.AuthResponse, error) {
	refreshToken := strings.TrimSpace(input.RefreshToken)
	if refreshToken == "" {
		return models.AuthResponse{}, errors.New("refresh token is required")
	}
	refreshHash := utils.HashToken(refreshToken)
	session, err := s.sessions.FindByRefreshTokenHash(ctx, refreshHash)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return models.AuthResponse{}, errors.New("invalid refresh token")
		}
		return models.AuthResponse{}, err
	}
	user, err := s.users.FindByID(ctx, session.UserID.Hex())
	if err != nil {
		return models.AuthResponse{}, err
	}
	if !user.IsActive {
		return models.AuthResponse{}, errors.New("account is inactive")
	}
	now := time.Now()
	newRefreshToken, err := utils.RandomToken(48)
	if err != nil {
		return models.AuthResponse{}, err
	}
	updatedSession, err := s.sessions.UpdateRefreshToken(ctx, session.ID.Hex(), utils.HashToken(newRefreshToken), now.Add(s.cfg.RefreshTokenTTL), now)
	if err != nil {
		return models.AuthResponse{}, err
	}
	accessToken, err := utils.GenerateToken(s.secret, user, s.cfg.TokenTTL, "access", updatedSession.ID.Hex())
	if err != nil {
		return models.AuthResponse{}, err
	}
	_ = metadata
	return models.AuthResponse{
		Token:        accessToken,
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    int64(s.cfg.TokenTTL.Seconds()),
		User:         user,
	}, nil
}

func (s *authService) Logout(ctx context.Context, sessionID string) error {
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return errors.New("session id is required")
	}
	return s.sessions.Revoke(ctx, sessionID, time.Now())
}

func (s *authService) LogoutAll(ctx context.Context, userID string) error {
	userID = strings.TrimSpace(userID)
	if userID == "" {
		return errors.New("user id is required")
	}
	return s.sessions.RevokeAllByUser(ctx, userID, time.Now())
}