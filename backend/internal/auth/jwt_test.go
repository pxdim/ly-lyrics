// Package auth 測試 JWT token 產生與驗證功能。
package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestJWTManager 建立測試用的 JWTManager（1 小時過期）
func newTestJWTManager() *JWTManager {
	return NewJWTManager("test-secret-key-for-unit-tests-only", 1)
}

func TestNewJWTManager(t *testing.T) {
	t.Parallel()

	t.Run("建立 JWTManager 並確認設定正確", func(t *testing.T) {
		t.Parallel()
		m := NewJWTManager("secret", 2)
		assert.NotNil(t, m)
		assert.Equal(t, 2*time.Hour, m.AccessExpiry())
	})
}

func TestGenerateAccessToken(t *testing.T) {
	t.Parallel()

	m := newTestJWTManager()
	userID := uuid.New()
	email := "test@example.com"
	name := "測試用戶"

	t.Run("產生 access token 成功", func(t *testing.T) {
		t.Parallel()
		token, err := m.GenerateAccessToken(userID, email, &name)
		require.NoError(t, err)
		assert.NotEmpty(t, token)
	})

	t.Run("name 為 nil 時也能成功產生", func(t *testing.T) {
		t.Parallel()
		token, err := m.GenerateAccessToken(userID, email, nil)
		require.NoError(t, err)
		assert.NotEmpty(t, token)
	})

	t.Run("token 可解析且 claims 正確", func(t *testing.T) {
		t.Parallel()
		token, err := m.GenerateAccessToken(userID, email, &name)
		require.NoError(t, err)

		claims, err := m.ValidateToken(token)
		require.NoError(t, err)

		assert.Equal(t, userID.String(), claims.Subject)
		assert.Equal(t, email, claims.Email)
		assert.Equal(t, "access", claims.TokenType)
		assert.NotNil(t, claims.Name)
		assert.Equal(t, name, *claims.Name)
	})

	t.Run("token 包含有效的 JTI（唯一 ID）", func(t *testing.T) {
		t.Parallel()
		token1, err1 := m.GenerateAccessToken(userID, email, nil)
		token2, err2 := m.GenerateAccessToken(userID, email, nil)
		require.NoError(t, err1)
		require.NoError(t, err2)

		claims1, _ := m.ValidateToken(token1)
		claims2, _ := m.ValidateToken(token2)
		// 每個 token 的 JTI 應不同
		assert.NotEqual(t, claims1.ID, claims2.ID)
	})
}

func TestGenerateRefreshToken(t *testing.T) {
	t.Parallel()

	m := newTestJWTManager()
	userID := uuid.New()

	t.Run("產生 refresh token 成功", func(t *testing.T) {
		t.Parallel()
		token, err := m.GenerateRefreshToken(userID)
		require.NoError(t, err)
		assert.NotEmpty(t, token)
	})

	t.Run("token claims 含正確的 subject 與 token_type", func(t *testing.T) {
		t.Parallel()
		token, err := m.GenerateRefreshToken(userID)
		require.NoError(t, err)

		claims, err := m.ValidateToken(token)
		require.NoError(t, err)

		assert.Equal(t, userID.String(), claims.Subject)
		assert.Equal(t, "refresh", claims.TokenType)
		// refresh token 不包含 email（因為 GenerateRefreshToken 未設定）
		assert.Empty(t, claims.Email)
	})

	t.Run("refresh token 過期時間約 30 天", func(t *testing.T) {
		t.Parallel()
		before := time.Now()
		token, err := m.GenerateRefreshToken(userID)
		require.NoError(t, err)
		after := time.Now()

		claims, err := m.ValidateToken(token)
		require.NoError(t, err)

		expectedExpiry := before.Add(30 * 24 * time.Hour)
		actualExpiry := claims.ExpiresAt.Time

		// 允許幾秒鐘的誤差
		assert.True(t, actualExpiry.After(expectedExpiry.Add(-5*time.Second)),
			"過期時間 %v 應晚於 %v", actualExpiry, expectedExpiry.Add(-5*time.Second))
		assert.True(t, actualExpiry.Before(after.Add(30*24*time.Hour+5*time.Second)),
			"過期時間 %v 應早於 %v", actualExpiry, after.Add(30*24*time.Hour+5*time.Second))
	})
}

func TestValidateAccessToken(t *testing.T) {
	t.Parallel()

	m := newTestJWTManager()
	userID := uuid.New()

	t.Run("有效的 access token 驗證成功", func(t *testing.T) {
		t.Parallel()
		token, err := m.GenerateAccessToken(userID, "user@example.com", nil)
		require.NoError(t, err)

		claims, err := m.ValidateAccessToken(token)
		require.NoError(t, err)
		assert.Equal(t, "access", claims.TokenType)
		assert.Equal(t, userID.String(), claims.Subject)
	})

	t.Run("refresh token 不能通過 ValidateAccessToken（type 檢查）", func(t *testing.T) {
		t.Parallel()
		refreshToken, err := m.GenerateRefreshToken(userID)
		require.NoError(t, err)

		_, err = m.ValidateAccessToken(refreshToken)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "access")
	})
}

func TestValidateRefreshToken(t *testing.T) {
	t.Parallel()

	m := newTestJWTManager()
	userID := uuid.New()

	t.Run("有效的 refresh token 驗證成功", func(t *testing.T) {
		t.Parallel()
		token, err := m.GenerateRefreshToken(userID)
		require.NoError(t, err)

		claims, err := m.ValidateRefreshToken(token)
		require.NoError(t, err)
		assert.Equal(t, "refresh", claims.TokenType)
		assert.Equal(t, userID.String(), claims.Subject)
	})

	t.Run("access token 不能通過 ValidateRefreshToken（type 檢查）", func(t *testing.T) {
		t.Parallel()
		accessToken, err := m.GenerateAccessToken(userID, "user@example.com", nil)
		require.NoError(t, err)

		_, err = m.ValidateRefreshToken(accessToken)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "refresh")
	})
}

func TestValidateToken_InvalidCases(t *testing.T) {
	t.Parallel()

	m := newTestJWTManager()
	userID := uuid.New()

	t.Run("無效的 token 字串應回傳錯誤", func(t *testing.T) {
		t.Parallel()
		_, err := m.ValidateToken("this.is.not.a.valid.token")
		assert.Error(t, err)
	})

	t.Run("空字串應回傳錯誤", func(t *testing.T) {
		t.Parallel()
		_, err := m.ValidateToken("")
		assert.Error(t, err)
	})

	t.Run("不同 secret 簽名的 token 應被拒絕", func(t *testing.T) {
		t.Parallel()
		// 用另一個 secret 產生的 token
		otherManager := NewJWTManager("completely-different-secret", 1)
		token, err := otherManager.GenerateAccessToken(userID, "user@example.com", nil)
		require.NoError(t, err)

		// 用原始 manager 驗證應失敗
		_, err = m.ValidateToken(token)
		assert.Error(t, err)
	})

	t.Run("已過期的 token 應被拒絕", func(t *testing.T) {
		t.Parallel()
		// 建立一個使用負數過期時間的 manager（立即過期）
		// 直接手動產生一個已過期的 token
		expiredClaims := Claims{
			Email:     "user@example.com",
			TokenType: "access",
			RegisteredClaims: jwt.RegisteredClaims{
				Subject:   userID.String(),
				IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
				ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)), // 1 小時前已過期
				ID:        uuid.New().String(),
			},
		}
		token := jwt.NewWithClaims(jwt.SigningMethodHS256, expiredClaims)
		// 使用相同的 secret 簽名
		signed, err := token.SignedString([]byte("test-secret-key-for-unit-tests-only"))
		require.NoError(t, err)

		_, err = m.ValidateToken(signed)
		assert.Error(t, err)
	})

	t.Run("篡改 payload 的 token 應被拒絕（簽名不符）", func(t *testing.T) {
		t.Parallel()
		token, err := m.GenerateAccessToken(userID, "user@example.com", nil)
		require.NoError(t, err)

		// 在 token 末尾加幾個字元模擬篡改
		tamperedToken := token + "tampered"
		_, err = m.ValidateToken(tamperedToken)
		assert.Error(t, err)
	})
}

func TestTokenTypeSeparation(t *testing.T) {
	t.Parallel()

	m := newTestJWTManager()
	userID := uuid.New()
	email := "user@example.com"

	t.Run("access token 與 refresh token 類型互不相容", func(t *testing.T) {
		t.Parallel()
		accessToken, err := m.GenerateAccessToken(userID, email, nil)
		require.NoError(t, err)

		refreshToken, err := m.GenerateRefreshToken(userID)
		require.NoError(t, err)

		// access token 必須通過 ValidateAccessToken
		_, err = m.ValidateAccessToken(accessToken)
		assert.NoError(t, err, "access token 應通過 ValidateAccessToken")

		// access token 不得通過 ValidateRefreshToken
		_, err = m.ValidateRefreshToken(accessToken)
		assert.Error(t, err, "access token 不應通過 ValidateRefreshToken")

		// refresh token 必須通過 ValidateRefreshToken
		_, err = m.ValidateRefreshToken(refreshToken)
		assert.NoError(t, err, "refresh token 應通過 ValidateRefreshToken")

		// refresh token 不得通過 ValidateAccessToken
		_, err = m.ValidateAccessToken(refreshToken)
		assert.Error(t, err, "refresh token 不應通過 ValidateAccessToken")
	})
}

func TestAccessExpiry(t *testing.T) {
	t.Parallel()

	t.Run("AccessExpiry 回傳正確的過期時間", func(t *testing.T) {
		t.Parallel()
		m := NewJWTManager("secret", 24)
		assert.Equal(t, 24*time.Hour, m.AccessExpiry())
	})
}
