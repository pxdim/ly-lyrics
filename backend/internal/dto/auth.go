// Package dto 定義資料傳輸物件（Data Transfer Objects）。
// 此檔案定義認證相關的請求與回應結構。
package dto

import (
	"time"

	"github.com/google/uuid"
)

// LoginRequest 登入請求
type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

// RegisterRequest 註冊請求
type RegisterRequest struct {
	Email    string  `json:"email" validate:"required,email"`
	Password string  `json:"password" validate:"required,min=6"`
	Name     *string `json:"name,omitempty" validate:"omitempty,max=100"`
}

// AuthResponse 認證回應（包含 access/refresh token 及使用者資訊）
type AuthResponse struct {
	AccessToken  string       `json:"accessToken"`
	RefreshToken string       `json:"refreshToken"`
	ExpiresAt    time.Time    `json:"expiresAt"`
	User         UserResponse `json:"user"`
}

// UserResponse 使用者資訊回應
type UserResponse struct {
	ID            uuid.UUID `json:"id"`
	Email         string    `json:"email"`
	Name          *string   `json:"name,omitempty"`
	EmailVerified bool      `json:"emailVerified"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// RefreshRequest 更新 token 請求
type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" validate:"required"`
}

// MeResponse 當前使用者資訊回應
type MeResponse struct {
	User UserResponse `json:"user"`
}
