// Package server 負責 HTTP 伺服器的初始化與生命週期管理。
package server

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/config"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/raymondchen/ly-backend/internal/middleware"
	lyredis "github.com/raymondchen/ly-backend/internal/redis"
	"github.com/raymondchen/ly-backend/internal/service"
	"github.com/raymondchen/ly-backend/internal/ws"
)

// Server 封裝 HTTP server 及其依賴
type Server struct {
	cfg         *config.Config
	router      *chi.Mux
	db          *ent.Client
	sqlDB       *sql.DB
	http        *http.Server
	jwtManager  *auth.JWTManager
	userService *service.UserService
	hub         *ws.Hub
	wsHandler   *handler.WSHandler
	authLimiter *middleware.RateLimiter
}

// New 建立新的 Server 實例
func New(cfg *config.Config, db *ent.Client, sqlDB *sql.DB) *Server {
	r := chi.NewRouter()

	s := &Server{
		cfg:    cfg,
		router: r,
		db:     db,
		sqlDB:  sqlDB,
		http: &http.Server{
			Addr:         fmt.Sprintf(":%d", cfg.Port),
			Handler:      r,
			ReadTimeout:  15 * time.Second,
			WriteTimeout: 15 * time.Second,
			IdleTimeout:  60 * time.Second,
		},
	}

	// 初始化認證與使用者服務
	s.jwtManager = auth.NewJWTManager(cfg.JWTSecret, cfg.JWTExpiry)
	s.userService = service.NewUserService(db)

	// 初始化 Auth 速率限制器（每分鐘 10 次）
	s.authLimiter = middleware.NewRateLimiter(10, 60)

	// Redis 連線（WebSocket 必需）
	if cfg.RedisURL != "" {
		redisClient, err := lyredis.New(cfg.RedisURL)
		if err != nil {
			slog.Error("Redis 連線失敗，WebSocket 功能將停用", "error", err)
		} else {
			hub := ws.NewHub()
			go hub.Run()

			songSvc := service.NewSongService(db)
			eventHandler := ws.NewEventHandler(hub, redisClient, songSvc)
			s.hub = hub
			s.wsHandler = handler.NewWSHandler(hub, eventHandler, cfg.CORSOrigins)
			slog.Info("WebSocket Hub 已啟動")
		}
	}

	s.setupMiddleware()
	s.setupRoutes()

	return s
}

// Start 啟動 HTTP server
func (s *Server) Start() error {
	slog.Info("HTTP server starting", "addr", s.http.Addr)
	return s.http.ListenAndServe()
}

// Shutdown 優雅關閉 server
func (s *Server) Shutdown(ctx context.Context) error {
	if s.authLimiter != nil {
		s.authLimiter.Stop()
	}
	return s.http.Shutdown(ctx)
}
