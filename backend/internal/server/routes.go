package server

import (
	"github.com/go-chi/chi/v5"
	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/raymondchen/ly-backend/internal/service"
)

func (s *Server) setupRoutes() {
	h := handler.NewHealth(s.sqlDB)

	// 健康檢查（不限速 — 供監控系統使用）
	s.router.Get("/api/go-health", h.Check)

	// Auth 路由（公開，10 req/min — 防暴力破解）
	authHandler := handler.NewAuthHandlerFull(s.userService, s.jwtManager, s.sessionService)
	s.router.Group(func(r chi.Router) {
		r.Use(s.authLimiter.Middleware)
		r.Post("/api/auth/login", authHandler.Login)
		r.Post("/api/auth/register", authHandler.Register)
		r.Post("/api/auth/refresh", authHandler.Refresh)
	})

	// Auth 路由（需認證，60 req/min）
	s.router.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth(s.jwtManager))
		r.Use(s.crudLimiter.Middleware)
		r.Get("/api/auth/me", authHandler.Me)
	})

	// STT 路由（需認證，5 req/min — 最昂貴的 API）
	sttHandler := handler.NewSTT(s.cfg.DeepgramAPIKey, s.cfg.GoogleSTTAPIKey)
	s.router.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth(s.jwtManager))
		r.Use(s.sttLimiter.Middleware)
		r.Get("/api/stt/token", sttHandler.GetToken)
		r.Get("/api/stt/stream", sttHandler.StreamSTT)
	})

	// CRUD 路由 — Songs、Playlists、Lyrics Search（OptionalAuth，60 req/min）
	s.router.Group(func(r chi.Router) {
		r.Use(auth.OptionalAuth(s.jwtManager))
		r.Use(s.crudLimiter.Middleware)

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

		// 歌詞搜尋
		lyricsSearchHandler := handler.NewLyricsSearch(s.lyricsSearchSvc)
		r.Route("/api/lyrics", func(r chi.Router) {
			r.Post("/search", lyricsSearchHandler.Search)
			r.Get("/search/{id}", lyricsSearchHandler.GetLyrics)
		})
	})

	// Settings 路由（OptionalAuth，30 req/min）
	s.router.Group(func(r chi.Router) {
		r.Use(auth.OptionalAuth(s.jwtManager))
		r.Use(s.settingsLimiter.Middleware)

		settingsSvc := service.NewSettingsService(s.db)
		settingsHandler := handler.NewSettings(settingsSvc)
		r.Route("/api/settings", func(r chi.Router) {
			r.Get("/", settingsHandler.Get)
			r.Put("/", settingsHandler.Update)
			r.Post("/", settingsHandler.Reset)
		})
	})

	// WebSocket 路由（不限速 — 長連線，由 Hub 管理連線數）
	if s.wsHandler != nil {
		s.router.Get("/ws", s.wsHandler.ServeWS)
	}
}
