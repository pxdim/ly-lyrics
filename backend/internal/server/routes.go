package server

import (
	"github.com/go-chi/chi/v5"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/raymondchen/ly-backend/internal/service"
)

func (s *Server) setupRoutes() {
	h := handler.NewHealth(s.sqlDB)

	// 健康檢查
	s.router.Get("/api/go-health", h.Check)

	// 歌曲 CRUD 路由
	songSvc := service.NewSongService(s.db)
	songHandler := handler.NewSong(songSvc)
	lrcHandler := handler.NewLRC(songSvc)

	s.router.Route("/api/songs", func(r chi.Router) {
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

	// 播放清單 CRUD 路由
	playlistSvc := service.NewPlaylistService(s.db)
	playlistHandler := handler.NewPlaylist(playlistSvc)

	s.router.Route("/api/playlists", func(r chi.Router) {
		r.Get("/", playlistHandler.List)
		r.Post("/", playlistHandler.Create)
	})

	// 設定路由
	settingsSvc := service.NewSettingsService(s.db)
	settingsHandler := handler.NewSettings(settingsSvc)

	s.router.Route("/api/settings", func(r chi.Router) {
		r.Get("/", settingsHandler.Get)
		r.Put("/", settingsHandler.Update)
		r.Post("/", settingsHandler.Reset)
	})
}
