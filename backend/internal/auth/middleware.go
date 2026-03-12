// Package auth 處理認證與授權相關功能。
// 此檔案定義認證中介軟體，包含必要認證（RequireAuth）與可選認證（OptionalAuth），
// 以及從 context 取得使用者 ID 的工具函式。
package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

type contextKey string

const userIDKey contextKey = "userID"

// UserIDFromContext 從 context 取得已認證使用者的 UUID，未認證時回傳 nil
func UserIDFromContext(ctx context.Context) *uuid.UUID {
	v, ok := ctx.Value(userIDKey).(uuid.UUID)
	if !ok {
		return nil
	}
	return &v
}

// RequireAuth 回傳中介軟體，強制要求有效的 Bearer token，未認證直接回傳 401
func RequireAuth(jwtMgr *JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := extractAndValidateAccessToken(r, jwtMgr)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":{"code":"AUTH_UNAUTHORIZED","message":"Authentication required"}}`))
				return
			}

			userID, err := uuid.Parse(claims.Subject)
			if err != nil {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":{"code":"AUTH_UNAUTHORIZED","message":"Invalid token"}}`))
				return
			}

			ctx := context.WithValue(r.Context(), userIDKey, userID)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// OptionalAuth 回傳中介軟體，若有合法 Bearer token 則將 userID 注入 context，無 token 時仍放行
func OptionalAuth(jwtMgr *JWTManager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, err := extractAndValidateToken(r, jwtMgr)
			if err == nil {
				userID, parseErr := uuid.Parse(claims.Subject)
				if parseErr == nil {
					ctx := context.WithValue(r.Context(), userIDKey, userID)
					r = r.WithContext(ctx)
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// extractAndValidateToken 從 Authorization header 提取並驗證 Bearer token
func extractAndValidateToken(r *http.Request, jwtMgr *JWTManager) (*Claims, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, fmt.Errorf("missing authorization header")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, fmt.Errorf("invalid authorization format")
	}

	return jwtMgr.ValidateToken(parts[1])
}

// extractAndValidateAccessToken 從 Authorization header 提取並驗證 access token
func extractAndValidateAccessToken(r *http.Request, jwtMgr *JWTManager) (*Claims, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return nil, fmt.Errorf("missing authorization header")
	}

	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
		return nil, fmt.Errorf("invalid authorization format")
	}

	return jwtMgr.ValidateAccessToken(parts[1])
}
