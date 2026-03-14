package server

import (
	"github.com/go-chi/chi/v5"
	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/raymondchen/ly-backend/internal/service"
)

func (s *Server) setupRoutes() {
	h := handler.NewHealth(s.sqlDB)

	// 健康檢查
	s.router.Get("/api/go-health", h.Check)

	// Auth 路由（公開，套用速率限制，含 refresh token 撤銷）
	authHandler := handler.NewAuthHandlerFull(s.userService, s.jwtManager, s.sessionService)
	s.router.Group(func(r chi.Router) {
		r.Use(s.authLimiter.Middleware)
		r.Post("/api/auth/login", authHandler.Login)
		r.Post("/api/auth/register", authHandler.Register)
		r.Post("/api/auth/refresh", authHandler.Refresh)
	})

	// Auth 路由（需認證）
	s.router.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth(s.jwtManager))
		r.Get("/api/auth/me", authHandler.Me)
	})

	// STT token（OptionalAuth — demo 使用者也需要 STT 功能）
	sttHandler := handler.NewSTT(s.cfg.DeepgramAPIKey)
	s.router.Group(func(r chi.Router) {
		r.Use(auth.OptionalAuth(s.jwtManager))
		r.Get("/api/stt/token", sttHandler.GetToken)
	})

	// CRUD 路由（OptionalAuth — 未認證使用 demo user）
	s.router.Group(func(r chi.Router) {
		r.Use(auth.OptionalAuth(s.jwtManager))

		songSvc := service.NewSongService(s.db)
		songHandler := handler.NewSong(songSvc)
		lrcHandler := handler.NewLRC(songSvc)
		r.Route("/api/songs", func(r chi.Router) {
			r.Get("/", songHandler.List)
			r.Post("/", songHandler.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Get("/", songHandler.Get)
				r.Put("/", songHandler.Update)
				r.Delete("/", songHandler.Delete)
				r.Get("/export", lrcHandler.Export)
				r.Post("/import", lrcHandler.Import)
			})
		})

		playlistSvc := service.NewPlaylistService(s.db)
		playlistHandler := handler.NewPlaylist(playlistSvc)
		r.Route("/api/playlists", func(r chi.Router) {
			r.Get("/", playlistHandler.List)
			r.Post("/", playlistHandler.Create)
			r.Route("/{id}", func(r chi.Router) {
				r.Put("/", playlistHandler.Update)
				r.Delete("/", playlistHandler.Delete)
			})
		})

		settingsSvc := service.NewSettingsService(s.db)
		settingsHandler := handler.NewSettings(settingsSvc)
		r.Route("/api/settings", func(r chi.Router) {
			r.Get("/", settingsHandler.Get)
			r.Put("/", settingsHandler.Update)
			r.Post("/", settingsHandler.Reset)
		})
	})

	// WebSocket 路由
	if s.wsHandler != nil {
		s.router.Get("/ws", s.wsHandler.ServeWS)
	}
}
