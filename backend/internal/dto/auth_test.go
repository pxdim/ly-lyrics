// Package dto 測試認證相關資料傳輸物件的 JSON 序列化與反序列化。
package dto

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─────────────────────────────────────────────────────────────────────────────
// LoginRequest 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestLoginRequest_JSON(t *testing.T) {
	t.Parallel()

	t.Run("正常反序列化", func(t *testing.T) {
		t.Parallel()
		jsonStr := `{"email":"user@example.com","password":"securePass123"}`
		var req LoginRequest
		err := json.Unmarshal([]byte(jsonStr), &req)
		require.NoError(t, err)
		assert.Equal(t, "user@example.com", req.Email)
		assert.Equal(t, "securePass123", req.Password)
	})

	t.Run("缺少 password 欄位解析成空字串", func(t *testing.T) {
		t.Parallel()
		jsonStr := `{"email":"user@example.com"}`
		var req LoginRequest
		err := json.Unmarshal([]byte(jsonStr), &req)
		require.NoError(t, err)
		assert.Equal(t, "user@example.com", req.Email)
		assert.Empty(t, req.Password)
	})

	t.Run("序列化後包含正確的 JSON key", func(t *testing.T) {
		t.Parallel()
		req := LoginRequest{
			Email:    "test@example.com",
			Password: "password123",
		}
		data, err := json.Marshal(req)
		require.NoError(t, err)

		var result map[string]interface{}
		err = json.Unmarshal(data, &result)
		require.NoError(t, err)
		assert.Equal(t, "test@example.com", result["email"])
		assert.Equal(t, "password123", result["password"])
	})

	t.Run("無效 JSON 應回傳錯誤", func(t *testing.T) {
		t.Parallel()
		var req LoginRequest
		err := json.Unmarshal([]byte(`{invalid json}`), &req)
		assert.Error(t, err)
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// RegisterRequest 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestRegisterRequest_JSON(t *testing.T) {
	t.Parallel()

	t.Run("含 name 的完整反序列化", func(t *testing.T) {
		t.Parallel()
		jsonStr := `{"email":"new@example.com","password":"newPass456","name":"新使用者"}`
		var req RegisterRequest
		err := json.Unmarshal([]byte(jsonStr), &req)
		require.NoError(t, err)
		assert.Equal(t, "new@example.com", req.Email)
		assert.Equal(t, "newPass456", req.Password)
		require.NotNil(t, req.Name)
		assert.Equal(t, "新使用者", *req.Name)
	})

	t.Run("name 為 omitempty，不傳時為 nil", func(t *testing.T) {
		t.Parallel()
		jsonStr := `{"email":"new@example.com","password":"newPass456"}`
		var req RegisterRequest
		err := json.Unmarshal([]byte(jsonStr), &req)
		require.NoError(t, err)
		assert.Nil(t, req.Name)
	})

	t.Run("name 為 null 時解析為 nil", func(t *testing.T) {
		t.Parallel()
		jsonStr := `{"email":"new@example.com","password":"newPass456","name":null}`
		var req RegisterRequest
		err := json.Unmarshal([]byte(jsonStr), &req)
		require.NoError(t, err)
		assert.Nil(t, req.Name)
	})

	t.Run("name 為 nil 時序列化不輸出 name 欄位（omitempty）", func(t *testing.T) {
		t.Parallel()
		req := RegisterRequest{
			Email:    "new@example.com",
			Password: "newPass456",
			Name:     nil,
		}
		data, err := json.Marshal(req)
		require.NoError(t, err)
		// omitempty 應讓 nil pointer 不被輸出
		assert.NotContains(t, string(data), `"name"`)
	})

	t.Run("name 有值時序列化包含 name 欄位", func(t *testing.T) {
		t.Parallel()
		name := "使用者名稱"
		req := RegisterRequest{
			Email:    "new@example.com",
			Password: "newPass456",
			Name:     &name,
		}
		data, err := json.Marshal(req)
		require.NoError(t, err)
		assert.Contains(t, string(data), `"name":"使用者名稱"`)
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// AuthResponse 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestAuthResponse_JSON(t *testing.T) {
	t.Parallel()

	t.Run("序列化包含所有必要欄位", func(t *testing.T) {
		t.Parallel()
		userID := uuid.New()
		now := time.Now().Truncate(time.Second) // 截斷毫秒避免精度問題
		name := "測試用戶"

		resp := AuthResponse{
			AccessToken:  "access.token.here",
			RefreshToken: "refresh.token.here",
			ExpiresAt:    now.Add(time.Hour),
			User: UserResponse{
				ID:            userID,
				Email:         "user@example.com",
				Name:          &name,
				EmailVerified: true,
				CreatedAt:     now,
				UpdatedAt:     now,
			},
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		var result map[string]interface{}
		err = json.Unmarshal(data, &result)
		require.NoError(t, err)

		assert.Equal(t, "access.token.here", result["accessToken"])
		assert.Equal(t, "refresh.token.here", result["refreshToken"])
		assert.Contains(t, result, "expiresAt")
		assert.Contains(t, result, "user")
	})

	t.Run("user 欄位包含正確的 camelCase key", func(t *testing.T) {
		t.Parallel()
		userID := uuid.New()
		now := time.Now()
		resp := AuthResponse{
			User: UserResponse{
				ID:            userID,
				Email:         "user@example.com",
				EmailVerified: false,
				CreatedAt:     now,
				UpdatedAt:     now,
			},
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		jsonStr := string(data)
		assert.Contains(t, jsonStr, `"emailVerified"`)
		assert.Contains(t, jsonStr, `"createdAt"`)
		assert.Contains(t, jsonStr, `"updatedAt"`)
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// UserResponse 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestUserResponse_JSON(t *testing.T) {
	t.Parallel()

	t.Run("name 為 nil 時不輸出 name 欄位（omitempty）", func(t *testing.T) {
		t.Parallel()
		userID := uuid.New()
		resp := UserResponse{
			ID:            userID,
			Email:         "user@example.com",
			Name:          nil,
			EmailVerified: false,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)
		assert.NotContains(t, string(data), `"name"`)
	})

	t.Run("name 有值時輸出 name 欄位", func(t *testing.T) {
		t.Parallel()
		name := "使用者"
		userID := uuid.New()
		resp := UserResponse{
			ID:            userID,
			Email:         "user@example.com",
			Name:          &name,
			EmailVerified: true,
			CreatedAt:     time.Now(),
			UpdatedAt:     time.Now(),
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)
		assert.Contains(t, string(data), `"name":"使用者"`)
	})

	t.Run("UUID 以字串格式序列化", func(t *testing.T) {
		t.Parallel()
		userID := uuid.MustParse("550e8400-e29b-41d4-a716-446655440000")
		resp := UserResponse{
			ID:        userID,
			Email:     "user@example.com",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)
		assert.Contains(t, string(data), "550e8400-e29b-41d4-a716-446655440000")
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// RefreshRequest 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestRefreshRequest_JSON(t *testing.T) {
	t.Parallel()

	t.Run("正常反序列化", func(t *testing.T) {
		t.Parallel()
		jsonStr := `{"refreshToken":"some.refresh.token"}`
		var req RefreshRequest
		err := json.Unmarshal([]byte(jsonStr), &req)
		require.NoError(t, err)
		assert.Equal(t, "some.refresh.token", req.RefreshToken)
	})

	t.Run("序列化 key 為 refreshToken", func(t *testing.T) {
		t.Parallel()
		req := RefreshRequest{RefreshToken: "token.value"}
		data, err := json.Marshal(req)
		require.NoError(t, err)
		assert.Contains(t, string(data), `"refreshToken"`)
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// MeResponse 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestMeResponse_JSON(t *testing.T) {
	t.Parallel()

	t.Run("MeResponse 包含 user 欄位", func(t *testing.T) {
		t.Parallel()
		userID := uuid.New()
		resp := MeResponse{
			User: UserResponse{
				ID:        userID,
				Email:     "me@example.com",
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		}

		data, err := json.Marshal(resp)
		require.NoError(t, err)

		var result map[string]interface{}
		err = json.Unmarshal(data, &result)
		require.NoError(t, err)

		assert.Contains(t, result, "user")
		userMap, ok := result["user"].(map[string]interface{})
		require.True(t, ok)
		assert.Equal(t, "me@example.com", userMap["email"])
	})
}
