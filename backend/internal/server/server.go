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
	"github.com/raymondchen/ly-backend/internal/config"
	"github.com/raymondchen/ly-backend/internal/ent"
)

// Server 封裝 HTTP server 及其依賴
type Server struct {
	cfg    *config.Config
	router *chi.Mux
	db     *ent.Client
	sqlDB  *sql.DB
	http   *http.Server
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
	return s.http.Shutdown(ctx)
}
