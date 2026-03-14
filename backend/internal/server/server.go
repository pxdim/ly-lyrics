// Package server 負責 HTTP 伺服器的初始化與生命週期管理。
package server

import (
	"context"
	"crypto/tls"
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
	"github.com/raymondchen/ly-backend/internal/provider"
	lyredis "github.com/raymondchen/ly-backend/internal/redis"
	"github.com/raymondchen/ly-backend/internal/service"
	"github.com/raymondchen/ly-backend/internal/ws"
)

// Server 封裝 HTTP server 及其依賴
type Server struct {
	cfg            *config.Config
	router         *chi.Mux
	db             *ent.Client
	sqlDB          *sql.DB
	http           *http.Server
	jwtManager     *auth.JWTManager
	userService    *service.UserService
	sessionService *service.SessionService
	hub             *ws.Hub
	wsHandler       *handler.WSHandler
	authLimiter     *middleware.RateLimiter
	lyricsSearchSvc *service.LyricsSearchService
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
			Addr:    fmt.Sprintf(":%d", cfg.Port),
			Handler: r,
			// 使用 ReadHeaderTimeout 而非 ReadTimeout：
			// ReadTimeout 會在底層 net.Conn 設定 deadline，影響 WebSocket 長連線。
			// ReadHeaderTimeout 只限制 HTTP header 讀取階段，不影響後續 body stream。
			ReadHeaderTimeout: 15 * time.Second,
			// 不設定 WriteTimeout：WebSocket 是長連線，WriteTimeout 會導致連線被強制關閉。
			// 各 handler 可透過 context.WithTimeout 自行控制寫入逾時。
			IdleTimeout: 60 * time.Second,
			// 禁用 HTTP/2，確保 reverse proxy（Railway edge）使用 HTTP/1.1 與後端通訊，
			// 保留 WebSocket upgrade 所需的 Connection 和 Upgrade hop-by-hop headers
			TLSNextProto: make(map[string]func(*http.Server, *tls.Conn, http.Handler)),
		},
	}

	// 初始化認證與使用者服務
	s.jwtManager = auth.NewJWTManager(cfg.JWTSecret, cfg.JWTExpiry)
	s.userService = service.NewUserService(db)
	s.sessionService = service.NewSessionService(db)

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

	// 歌詞搜尋 — 根據環境變數動態組裝 providers
	httpClient := &http.Client{Timeout: 10 * time.Second}
	var lyricsProviders []provider.Provider
	lyricsProviders = append(lyricsProviders, provider.NewLRClib(httpClient, ""))
	if cfg.LrcApiURL != "" {
		lyricsProviders = append(lyricsProviders, provider.NewLrcApi(httpClient, cfg.LrcApiURL, cfg.LrcApiAuthKey))
	}
	if cfg.GeniusAPIToken != "" {
		lyricsProviders = append(lyricsProviders, provider.NewGenius(httpClient, cfg.GeniusAPIToken, ""))
	}
	var geminiProvider provider.Provider
	if cfg.GeminiAPIKey != "" {
		geminiProvider = provider.NewGemini(httpClient, cfg.GeminiAPIKey, "")
	}
	s.lyricsSearchSvc = service.NewLyricsSearchService(lyricsProviders, geminiProvider, 8*time.Second)

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
