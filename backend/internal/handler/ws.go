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

	if h.corsOrigins == "*" {
		// 開發模式：跳過 origin 驗證
		opts.InsecureSkipVerify = true
	} else {
		// 生產模式：允許前端域名的 WebSocket 連線
		// OriginPatterns 支援 glob 模式
		opts.OriginPatterns = []string{
			"lys.pxdim.com",
			"*.up.railway.app",
			"localhost:*",
		}
	}

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
