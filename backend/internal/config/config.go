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
	// JWTSecret JWT 簽名密鑰（Phase 2 Auth 遷移時使用）
	JWTSecret string `env:"JWT_SECRET" envDefault:""`
	// Environment 執行環境（development / production）
	Environment string `env:"ENVIRONMENT" envDefault:"development"`
	// CORSOrigins 允許的跨域來源
	CORSOrigins string `env:"CORS_ORIGINS" envDefault:"*"`
}

// Load 從環境變數載入設定
func Load() (*Config, error) {
	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("解析設定失敗: %w", err)
	}
	return cfg, nil
}
