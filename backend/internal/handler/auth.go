// Package handler 定義 HTTP 請求處理器。
// 此檔案負責認證相關 API 的 HTTP 處理，包含登入、註冊、token 更新與使用者資訊端點。
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/service"
)

// AuthHandler 認證相關 HTTP handlers
type AuthHandler struct {
	userService *service.UserService
	jwtManager  *auth.JWTManager
}

// NewAuthHandler 建立 AuthHandler 實例
func NewAuthHandler(userService *service.UserService, jwtManager *auth.JWTManager) *AuthHandler {
	return &AuthHandler{userService: userService, jwtManager: jwtManager}
}

// Login POST /api/auth/login — 使用者登入
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "VALIDATION_ERROR", "無效的請求格式", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, "AUTH_MISSING_CREDENTIALS", "Email and password are required", http.StatusBadRequest)
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

	writeJSON(w, http.StatusOK, dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(h.jwtManager.AccessExpiry()),
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
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "VALIDATION_ERROR", "無效的請求格式", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, "AUTH_MISSING_CREDENTIALS", "Email and password are required", http.StatusBadRequest)
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

	writeJSON(w, http.StatusCreated, dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(h.jwtManager.AccessExpiry()),
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

// Refresh POST /api/auth/refresh — 更新 access token
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req dto.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "VALIDATION_ERROR", "無效的請求格式", http.StatusBadRequest)
		return
	}

	claims, err := h.jwtManager.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		writeError(w, "AUTH_TOKEN_EXPIRED", "Refresh token 無效或過期", http.StatusUnauthorized)
		return
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

	writeJSON(w, http.StatusOK, dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresAt:    time.Now().Add(h.jwtManager.AccessExpiry()),
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
