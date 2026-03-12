// Package dto 定義資料傳輸物件（Data Transfer Objects）。
// 此檔案定義認證相關的請求與回應結構（Phase 2 使用）。
package dto

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

// AuthResponse 認證回應
type AuthResponse struct {
	Token string       `json:"token"`
	User  UserResponse `json:"user"`
}

// UserResponse 使用者回應
type UserResponse struct {
	ID    string  `json:"id"`
	Email string  `json:"email"`
	Name  *string `json:"name"`
}
