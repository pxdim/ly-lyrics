// Package config_test 測試環境變數設定載入邏輯。
package config_test

import (
	"os"
	"testing"

	"github.com/raymondchen/ly-backend/internal/config"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// helper：設定必要環境變數，並在測試結束後還原
func setRequiredEnv(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://test:test@localhost:5432/testdb?sslmode=disable")
}

func TestLoad_Defaults(t *testing.T) {
	setRequiredEnv(t)

	cfg, err := config.Load()
	require.NoError(t, err)

	assert.Equal(t, 8080, cfg.Port, "預設 Port 應為 8080")
	assert.Equal(t, "development", cfg.Environment, "預設環境應為 development")
	assert.Equal(t, "*", cfg.CORSOrigins, "預設 CORS 應為 *")
	assert.Equal(t, 24, cfg.JWTExpiry, "預設 JWT Expiry 應為 24 小時")
	assert.Equal(t, "", cfg.RedisURL, "預設 RedisURL 應為空")
}

func TestLoad_DevFallbackJWTSecret(t *testing.T) {
	setRequiredEnv(t)
	// 不設 JWT_SECRET，開發環境應使用安全預設值

	cfg, err := config.Load()
	require.NoError(t, err)

	assert.Equal(t, "dev-insecure-jwt-secret-do-not-use-in-production", cfg.JWTSecret,
		"開發環境未設 JWT_SECRET 應有 fallback 預設值")
}

func TestLoad_ProductionRequiresJWTSecret(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("ENVIRONMENT", "production")
	// 不設 JWT_SECRET

	_, err := config.Load()
	require.Error(t, err, "生產環境未設 JWT_SECRET 應回傳錯誤")
	assert.Contains(t, err.Error(), "JWT_SECRET", "錯誤訊息應提及 JWT_SECRET")
}

func TestLoad_ProductionWithJWTSecret(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("JWT_SECRET", "my-super-secret-production-key")

	cfg, err := config.Load()
	require.NoError(t, err)

	assert.Equal(t, "my-super-secret-production-key", cfg.JWTSecret)
	assert.Equal(t, "production", cfg.Environment)
}

func TestLoad_CustomPort(t *testing.T) {
	setRequiredEnv(t)
	t.Setenv("PORT", "3000")

	cfg, err := config.Load()
	require.NoError(t, err)

	assert.Equal(t, 3000, cfg.Port)
}

func TestLoad_MissingDatabaseURL(t *testing.T) {
	// 確保 DATABASE_URL 未設定
	os.Unsetenv("DATABASE_URL")

	_, err := config.Load()
	require.Error(t, err, "未設 DATABASE_URL 應回傳錯誤")
}

func TestLoad_AllCustomValues(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://custom:custom@db:5432/mydb?sslmode=require")
	t.Setenv("REDIS_URL", "redis://redis:6379/0")
	t.Setenv("JWT_SECRET", "custom-jwt-secret")
	t.Setenv("JWT_EXPIRY_HOURS", "48")
	t.Setenv("ENVIRONMENT", "staging")
	t.Setenv("CORS_ORIGINS", "https://example.com,https://app.example.com")
	t.Setenv("PORT", "9090")

	cfg, err := config.Load()
	require.NoError(t, err)

	assert.Equal(t, 9090, cfg.Port)
	assert.Equal(t, "postgres://custom:custom@db:5432/mydb?sslmode=require", cfg.DatabaseURL)
	assert.Equal(t, "redis://redis:6379/0", cfg.RedisURL)
	assert.Equal(t, "custom-jwt-secret", cfg.JWTSecret)
	assert.Equal(t, 48, cfg.JWTExpiry)
	assert.Equal(t, "staging", cfg.Environment)
	assert.Equal(t, "https://example.com,https://app.example.com", cfg.CORSOrigins)
}
