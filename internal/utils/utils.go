package utils

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/mail"
	"os"
	"path/filepath"
	"strings"
	"time"

	"go-test/internal/models"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

type Claims struct {
	UserID    string `json:"userId"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	TokenType string `json:"tokenType"`
	SessionID string `json:"sessionId"`
	jwt.RegisteredClaims
}

func JSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func JSONError(w http.ResponseWriter, status int, message string) {
	JSON(w, status, ErrorResponse{Error: message})
}

func HashPassword(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

func ComparePassword(hashedPassword, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(password))
}

func GenerateToken(secret string, user models.User, ttl time.Duration, tokenType, sessionID string) (string, error) {
	claims := Claims{
		UserID:    user.ID.Hex(),
		Email:     user.Email,
		Role:      string(user.Role),
		TokenType: tokenType,
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   user.ID.Hex(),
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ParseToken(secret, tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}
	return claims, nil
}

func HashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func RandomToken(length int) (string, error) {
	if length < 16 {
		length = 32
	}
	buffer := make([]byte, length)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	return hex.EncodeToString(buffer), nil
}

func GeneratePassword(length int) (string, error) {
	if length < 12 {
		length = 12
	}
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
	buffer := make([]byte, length)
	if _, err := rand.Read(buffer); err != nil {
		return "", err
	}
	for index := range buffer {
		buffer[index] = charset[int(buffer[index])%len(charset)]
	}
	return string(buffer), nil
}

func ValidateName(value string) error {
	if strings.TrimSpace(value) == "" {
		return errors.New("name is required")
	}
	return nil
}

func ValidateEmail(value string) error {
	if strings.TrimSpace(value) == "" {
		return errors.New("email is required")
	}
	if _, err := mail.ParseAddress(value); err != nil {
		return errors.New("email is invalid")
	}
	return nil
}

func ValidatePassword(value string) error {
	if len(strings.TrimSpace(value)) < 8 {
		return errors.New("password must be at least 8 characters")
	}
	return nil
}

func EnsureDir(path string) error {
	return os.MkdirAll(path, 0o755)
}

func SaveUploadedImage(dir, name string, data []byte) (string, error) {
	if err := EnsureDir(dir); err != nil {
		return "", err
	}
	if name == "" {
		name = fmt.Sprintf("capture-%d.jpg", time.Now().UnixNano())
	}
	cleanName := strings.ReplaceAll(filepath.Base(name), " ", "-")
	path := filepath.Join(dir, cleanName)
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return "", err
	}
	return path, nil
}

func DecodeDataURL(input string) ([]byte, string, error) {
	if !strings.HasPrefix(input, "data:") {
		return nil, "", fmt.Errorf("invalid data url")
	}
	parts := strings.SplitN(input, ",", 2)
	if len(parts) != 2 {
		return nil, "", fmt.Errorf("invalid data url")
	}
	head := parts[0]
	data := parts[1]
	comma := strings.Index(head, ";")
	if comma == -1 {
		return nil, "", fmt.Errorf("invalid data url header")
	}
	mime := strings.TrimPrefix(head[:comma], "data:")
	decoded, err := base64.StdEncoding.DecodeString(data)
	if err != nil {
		return nil, "", err
	}
	return decoded, mime, nil
}
