package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/joho/godotenv/autoload"
)

type Config struct {
	Port             string
	MongoURI         string
	MongoDatabase    string
	JWTSecret        string
	FrontendURL      string
	UploadDir        string
	MaxUploadSize    int64
	TokenTTL         time.Duration
	RefreshTokenTTL  time.Duration
	AdminEmail       string
	AdminPassword    string
	AdminSetupToken  string
}

func Load() Config {
	port := envOrDefault("PORT", "8080")
	mongoURI := envOrDefault("MONGO_URI", "")
	if mongoURI == "" {
		host := envOrDefault("BLUEPRINT_DB_HOST", "localhost")
		dbPort := envOrDefault("BLUEPRINT_DB_PORT", "27017")
		username := strings.TrimSpace(os.Getenv("BLUEPRINT_DB_USERNAME"))
		password := strings.TrimSpace(os.Getenv("BLUEPRINT_DB_ROOT_PASSWORD"))
		if username != "" && password != "" {
			mongoURI = fmt.Sprintf("mongodb://%s:%s@%s:%s/?authSource=admin", username, password, host, dbPort)
		} else {
			mongoURI = fmt.Sprintf("mongodb://%s:%s", host, dbPort)
		}
	}

	return Config{
		Port:            port,
		MongoURI:        mongoURI,
		MongoDatabase:   envOrDefault("MONGO_DATABASE", "attendance_management"),
		JWTSecret:       envOrDefault("JWT_SECRET", "dev-secret-change-me"),
		FrontendURL:     envOrDefault("FRONTEND_URL", "http://localhost:5173"),
		UploadDir:       envOrDefault("UPLOAD_DIR", "uploads"),
		MaxUploadSize:   int64(envIntOrDefault("MAX_UPLOAD_MB", 10) * 1024 * 1024),
		TokenTTL:        time.Duration(envIntOrDefault("JWT_TTL_HOURS", 24)) * time.Hour,
		RefreshTokenTTL: time.Duration(envIntOrDefault("JWT_REFRESH_TTL_HOURS", 168)) * time.Hour,
		AdminEmail:      strings.TrimSpace(os.Getenv("ADMIN_EMAIL")),
		AdminPassword:   strings.TrimSpace(os.Getenv("ADMIN_PASSWORD")),
		AdminSetupToken: strings.TrimSpace(os.Getenv("ADMIN_SETUP_TOKEN")),
	}
}

func envOrDefault(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	return value
}

func envIntOrDefault(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
