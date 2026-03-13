// Package handler 提供 HTTP handler。
package handler

import (
	"log/slog"
	"net/http"

	"github.com/coder/websocket"
	"github.com/raymondchen/ly-backend/internal/ws"
)

// WSHandler WebSocket HTTP upgrade handler
type WSHandler struct {
	hub         *ws.Hub
	handler     *ws.EventHandler
	corsOrigins string
}

// NewWSHandler 建立 WSHandler 實例
func NewWSHandler(hub *ws.Hub, handler *ws.EventHandler, corsOrigins string) *WSHandler {
	return &WSHandler{hub: hub, handler: handler, corsOrigins: corsOrigins}
}

// ServeWS 處理 WebSocket upgrade 請求
func (h *WSHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	opts := &websocket.AcceptOptions{}

	// 僅在開發模式（CORS_ORIGINS="*"）才跳過 origin 驗證
	if h.corsOrigins == "*" {
		opts.InsecureSkipVerify = true
	}
	// 生產模式讓 coder/websocket 自動驗證 origin（預設行為）

	conn, err := websocket.Accept(w, r, opts)
	if err != nil {
		slog.Error("WebSocket accept 失敗", "error", err)
		return
	}

	client := ws.NewClient(h.hub, conn, h.handler)
	h.hub.Register(client)

	go client.WritePump(r.Context())
	client.ReadPump(r.Context())
}
