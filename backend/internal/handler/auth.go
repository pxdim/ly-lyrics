// Package handler 定義 HTTP 請求處理器。
// 此檔案負責認證相關 API 的 HTTP 處理，包含登入、註冊、token 更新與使用者資訊端點。
package handler

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/raymondchen/ly-backend/internal/service"
)

// UserServicer 定義 AuthHandler 所需的使用者服務介面，便於測試時替換為 mock
type UserServicer interface {
	VerifyCredentials(ctx context.Context, email, password string) (*ent.User, error)
	CreateUser(ctx context.Context, email, password string, name *string) (*ent.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (*ent.User, error)
}

// SessionStore 定義 refresh token 撤銷所需的 session 儲存介面。
// 當提供此介面時，refresh handler 會驗證 token JTI 是否有效，並在輪換後撤銷舊 token。
type SessionStore interface {
	// StoreRefreshToken 將 refresh token 的 JTI 寫入儲存，記錄 userID 及過期時間
	StoreRefreshToken(ctx context.Context, jti string, userID uuid.UUID, expiresAt time.Time) error
	// ValidateRefreshToken 驗證 JTI 是否存在且有效
	ValidateRefreshToken(ctx context.Context, jti string) (bool, error)
	// RevokeRefreshToken 撤銷指定 JTI 的 refresh token
	RevokeRefreshToken(ctx context.Context, jti string) error
}

// AuthHandler 認證相關 HTTP handlers
type AuthHandler struct {
	userService  UserServicer
	jwtManager   *auth.JWTManager
	sessionStore SessionStore // 可選：為 nil 時 refresh 不驗證 JTI（向下相容測試）
}

// NewAuthHandler 建立 AuthHandler 實例（使用具體的 *service.UserService）
func NewAuthHandler(userService *service.UserService, jwtManager *auth.JWTManager) *AuthHandler {
	return &AuthHandler{userService: userService, jwtManager: jwtManager}
}

// NewAuthHandlerWithService 建立 AuthHandler 實例，接受 UserServicer 介面（便於測試注入 mock）
func NewAuthHandlerWithService(userService UserServicer, jwtManager *auth.JWTManager) *AuthHandler {
	return &AuthHandler{userService: userService, jwtManager: jwtManager}
}

// NewAuthHandlerFull 建立完整的 AuthHandler，包含 session store 以支援 refresh token 撤銷
func NewAuthHandlerFull(userService *service.UserService, jwtManager *auth.JWTManager, sessionStore SessionStore) *AuthHandler {
	return &AuthHandler{userService: userService, jwtManager: jwtManager, sessionStore: sessionStore}
}

// storeRefreshTokenJTI 將 refresh token 的 JTI 存入 session store（若 store 可用）
func (h *AuthHandler) storeRefreshTokenJTI(ctx context.Context, refreshToken string, userID uuid.UUID) {
	if h.sessionStore == nil {
		return
	}
	claims, err := h.jwtManager.ValidateRefreshToken(refreshToken)
	if err != nil {
		slog.Error("解析新 refresh token 以儲存 JTI 失敗", "error", err)
		return
	}
	expiresAt := claims.ExpiresAt.Time
	if err := h.sessionStore.StoreRefreshToken(ctx, claims.ID, userID, expiresAt); err != nil {
		slog.Error("儲存 refresh token JTI 失敗", "error", err)
	}
}

// setCookies 設定 HttpOnly cookie 傳遞 token，避免前端 JavaScript 存取明文 token
func (h *AuthHandler) setCookies(w http.ResponseWriter, accessToken, refreshToken string) {
	// 開發環境不要求 Secure（localhost 無 HTTPS）
	secure := os.Getenv("ENVIRONMENT") != "development"

	http.SetCookie(w, &http.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Path:     "/",
		MaxAge:   86400, // 24 小時
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Path:     "/api/auth/refresh",
		MaxAge:   2592000, // 30 天
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteStrictMode,
	})
}

// Login POST /api/auth/login — 使用者登入
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	u, err := h.userService.VerifyCredentials(r.Context(), req.Email, req.Password)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "內部錯誤", http.StatusInternalServerError)
		return
	}
	if u == nil {
		writeError(w, "AUTH_INVALID_CREDENTIALS", "Invalid email or password", http.StatusUnauthorized)
		return
	}

	accessToken, err := h.jwtManager.GenerateAccessToken(u.ID, u.Email, u.Name)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Token 生成失敗", http.StatusInternalServerError)
		return
	}

	refreshToken, err := h.jwtManager.GenerateRefreshToken(u.ID)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Token 生成失敗", http.StatusInternalServerError)
		return
	}

	// 將 refresh token JTI 寫入 session store（若可用）
	h.storeRefreshTokenJTI(r.Context(), refreshToken, u.ID)

	// 透過 HttpOnly cookie 傳遞 token，body 不包含明文 token
	h.setCookies(w, accessToken, refreshToken)

	writeJSON(w, http.StatusOK, dto.AuthCookieResponse{
		ExpiresAt: time.Now().Add(h.jwtManager.AccessExpiry()),
		User: dto.UserResponse{
			ID:            u.ID,
			Email:         u.Email,
			Name:          u.Name,
			EmailVerified: u.EmailVerified,
			CreatedAt:     u.CreatedAt,
			UpdatedAt:     u.UpdatedAt,
		},
	})
}

// Register POST /api/auth/register — 使用者註冊
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req dto.RegisterRequest
	if !decodeAndValidate(w, r, &req) {
		return
	}

	u, err := h.userService.CreateUser(r.Context(), req.Email, req.Password, req.Name)
	if err != nil {
		if errors.Is(err, service.ErrEmailExists) {
			writeError(w, "AUTH_EMAIL_EXISTS", "Email already registered", http.StatusConflict)
			return
		}
		writeError(w, "SYS_INTERNAL_ERROR", "註冊失敗", http.StatusInternalServerError)
		return
	}

	accessToken, err := h.jwtManager.GenerateAccessToken(u.ID, u.Email, u.Name)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Token 生成失敗", http.StatusInternalServerError)
		return
	}

	refreshToken, err := h.jwtManager.GenerateRefreshToken(u.ID)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Token 生成失敗", http.StatusInternalServerError)
		return
	}

	// 將 refresh token JTI 寫入 session store（若可用）
	h.storeRefreshTokenJTI(r.Context(), refreshToken, u.ID)

	// 透過 HttpOnly cookie 傳遞 token，body 不包含明文 token
	h.setCookies(w, accessToken, refreshToken)

	writeJSON(w, http.StatusCreated, dto.AuthCookieResponse{
		ExpiresAt: time.Now().Add(h.jwtManager.AccessExpiry()),
		User: dto.UserResponse{
			ID:            u.ID,
			Email:         u.Email,
			Name:          u.Name,
			EmailVerified: u.EmailVerified,
			CreatedAt:     u.CreatedAt,
			UpdatedAt:     u.UpdatedAt,
		},
	})
}

// Me GET /api/auth/me — 取得當前使用者資訊
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := auth.UserIDFromContext(r.Context())
	if userID == nil {
		writeError(w, "AUTH_UNAUTHORIZED", "未認證", http.StatusUnauthorized)
		return
	}

	u, err := h.userService.GetByID(r.Context(), *userID)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "內部錯誤", http.StatusInternalServerError)
		return
	}
	if u == nil {
		writeError(w, "AUTH_UNAUTHORIZED", "使用者不存在", http.StatusUnauthorized)
		return
	}

	writeJSON(w, http.StatusOK, dto.MeResponse{
		User: dto.UserResponse{
			ID:            u.ID,
			Email:         u.Email,
			Name:          u.Name,
			EmailVerified: u.EmailVerified,
			CreatedAt:     u.CreatedAt,
			UpdatedAt:     u.UpdatedAt,
		},
	})
}

// Refresh POST /api/auth/refresh — 更新 access token（含 token 輪換與撤銷）
// refresh token 從 HttpOnly cookie 讀取，因為 JavaScript 無法存取 HttpOnly cookie
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	// 從 HttpOnly cookie 讀取 refresh token
	cookie, err := r.Cookie("refresh_token")
	if err != nil || cookie.Value == "" {
		writeError(w, "AUTH_TOKEN_EXPIRED", "Refresh token 缺失", http.StatusUnauthorized)
		return
	}
	refreshTokenValue := cookie.Value

	claims, err := h.jwtManager.ValidateRefreshToken(refreshTokenValue)
	if err != nil {
		writeError(w, "AUTH_TOKEN_EXPIRED", "Refresh token 無效或過期", http.StatusUnauthorized)
		return
	}

	// 若有 session store，驗證 JTI 是否仍有效（防止已撤銷的 token 被重用）
	if h.sessionStore != nil && claims.ID != "" {
		valid, err := h.sessionStore.ValidateRefreshToken(r.Context(), claims.ID)
		if err != nil {
			slog.Error("驗證 refresh token JTI 失敗", "error", err)
			writeError(w, "SYS_INTERNAL_ERROR", "內部錯誤", http.StatusInternalServerError)
			return
		}
		if !valid {
			writeError(w, "AUTH_TOKEN_REVOKED", "Refresh token 已被撤銷", http.StatusUnauthorized)
			return
		}
	}

	userID, err := uuid.Parse(claims.Subject)
	if err != nil {
		writeError(w, "AUTH_TOKEN_EXPIRED", "Token 格式錯誤", http.StatusUnauthorized)
		return
	}

	u, err := h.userService.GetByID(r.Context(), userID)
	if err != nil || u == nil {
		writeError(w, "AUTH_UNAUTHORIZED", "使用者不存在", http.StatusUnauthorized)
		return
	}

	accessToken, err := h.jwtManager.GenerateAccessToken(u.ID, u.Email, u.Name)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Token 生成失敗", http.StatusInternalServerError)
		return
	}

	newRefreshToken, err := h.jwtManager.GenerateRefreshToken(u.ID)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Token 生成失敗", http.StatusInternalServerError)
		return
	}

	// Token 輪換：撤銷舊 token，儲存新 token
	if h.sessionStore != nil && claims.ID != "" {
		if err := h.sessionStore.RevokeRefreshToken(r.Context(), claims.ID); err != nil {
			slog.Error("撤銷舊 refresh token 失敗", "error", err)
		}
	}
	h.storeRefreshTokenJTI(r.Context(), newRefreshToken, u.ID)

	// 透過 HttpOnly cookie 傳遞 token，body 不包含明文 token
	h.setCookies(w, accessToken, newRefreshToken)

	writeJSON(w, http.StatusOK, dto.AuthCookieResponse{
		ExpiresAt: time.Now().Add(h.jwtManager.AccessExpiry()),
		User: dto.UserResponse{
			ID:            u.ID,
			Email:         u.Email,
			Name:          u.Name,
			EmailVerified: u.EmailVerified,
			CreatedAt:     u.CreatedAt,
			UpdatedAt:     u.UpdatedAt,
		},
	})
}
