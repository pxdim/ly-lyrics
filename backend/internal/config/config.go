package config

import (
	"fmt"

	"github.com/caarlos0/env/v11"
)

// Config 定義應用程式所需的環境變數設定
type Config struct {
	// Port 伺服器監聽埠號
	Port int `env:"PORT" envDefault:"8080"`
	// DatabaseURL 資料庫連線字串
	DatabaseURL string `env:"DATABASE_URL,required"`
	// RedisURL Redis 連線字串（Phase 2/3 WebSocket 遷移時使用）
	RedisURL string `env:"REDIS_URL" envDefault:""`
	// JWTSecret JWT 簽名密鑰（生產環境必填）
	JWTSecret string `env:"JWT_SECRET" envDefault:""`
	// JWTExpiry JWT access token 有效時間（小時）
	JWTExpiry int `env:"JWT_EXPIRY_HOURS" envDefault:"24"`
	// Environment 執行環境（development / production）
	Environment string `env:"ENVIRONMENT" envDefault:"development"`
	// CORSOrigins 允許的跨域來源
	CORSOrigins string `env:"CORS_ORIGINS" envDefault:"*"`
	// DeepgramAPIKey Deepgram STT API 金鑰（選填，未設定時前端需自行提供）
	DeepgramAPIKey string `env:"DEEPGRAM_API_KEY" envDefault:""`
	// GoogleSTTAPIKey Google Cloud Speech-to-Text API 金鑰
	GoogleSTTAPIKey string `env:"GOOGLE_STT_API_KEY" envDefault:""`
}

// Load 從環境變數載入設定
func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("解析設定失敗: %w", err)
	}

	// 生產環境必須設定 JWT_SECRET，防止空密鑰導致 token 可被偽造
	if cfg.Environment == "production" && cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET 在生產環境中為必填項")
	}
	// 開發環境給予預設值避免啟動失敗，但仍記錄警告
	if cfg.JWTSecret == "" {
		cfg.JWTSecret = "dev-insecure-jwt-secret-do-not-use-in-production"
	}

	return cfg, nil
}
