package main

import (
	"context"
	"database/sql"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	entsql "entgo.io/ent/dialect/sql"
	_ "github.com/jackc/pgx/v5/stdlib" // pgx driver 註冊為 "pgx"

	"github.com/raymondchen/ly-backend/internal/config"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/raymondchen/ly-backend/internal/server"
)

func main() {
	// 載入設定
	cfg, err := config.Load()
	if err != nil {
		slog.Error("設定載入失敗", "error", err)
		os.Exit(1)
	}

	// 設定結構化日誌
	var logLevel slog.Level
	if cfg.Environment == "production" {
		logLevel = slog.LevelInfo
	} else {
		logLevel = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: logLevel,
	})))

	slog.Info("LY Backend starting",
		"port", cfg.Port,
		"environment", cfg.Environment,
	)

	// 開啟 database/sql 連線
	sqlDB, err := sql.Open("pgx", cfg.DatabaseURL)
	if err != nil {
		slog.Error("資料庫連線失敗", "error", err)
		os.Exit(1)
	}
	defer sqlDB.Close()

	// 從 sql.DB 建立 Ent client
	drv := entsql.OpenDB("postgres", sqlDB)
	client := ent.NewClient(ent.Driver(drv))
	defer client.Close()

	// 建立 HTTP server
	srv := server.New(cfg, client, sqlDB)

	// 啟動 server 並監聽錯誤
	serverErr := make(chan error, 1)
	go func() {
		if err := srv.Start(); err != nil && err != http.ErrServerClosed {
			serverErr <- err
		}
	}()

	// 等待中斷信號或 server 錯誤
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	select {
	case <-quit:
		// 正常中斷
	case err := <-serverErr:
		slog.Error("HTTP server 錯誤", "error", err)
	}

	slog.Info("正在關閉 server...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("Server 關閉失敗", "error", err)
	}

	slog.Info("Server 已關閉")
}
