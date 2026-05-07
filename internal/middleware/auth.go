package middleware

import (
	"context"
	"net/http"
	"strings"

	"go-test/internal/models"
	"go-test/internal/utils"
)

type contextKey string

const authUserKey contextKey = "authUser"

type AuthUser struct {
	ID        string
	Email     string
	Role      models.Role
	SessionID string
}

func WithAuth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				utils.JSONError(w, http.StatusUnauthorized, "missing authorization header")
				return
			}
			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				utils.JSONError(w, http.StatusUnauthorized, "invalid authorization header")
				return
			}
			claims, err := utils.ParseToken(secret, parts[1])
			if err != nil {
				utils.JSONError(w, http.StatusUnauthorized, "invalid token")
				return
			}
			if claims.TokenType != "access" {
				utils.JSONError(w, http.StatusUnauthorized, "invalid token type")
				return
			}
			user := AuthUser{ID: claims.UserID, Email: claims.Email, Role: models.Role(claims.Role), SessionID: claims.SessionID}
			next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), authUserKey, user)))
		})
	}
}

func RequireRole(roles ...models.Role) func(http.Handler) http.Handler {
	allowed := map[models.Role]struct{}{}
	for _, role := range roles {
		allowed[role] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := UserFromContext(r.Context())
			if !ok {
				utils.JSONError(w, http.StatusUnauthorized, "unauthorized")
				return
			}
			if _, ok := allowed[user.Role]; !ok {
				utils.JSONError(w, http.StatusForbidden, "forbidden")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func UserFromContext(ctx context.Context) (AuthUser, bool) {
	value := ctx.Value(authUserKey)
	user, ok := value.(AuthUser)
	return user, ok
}
