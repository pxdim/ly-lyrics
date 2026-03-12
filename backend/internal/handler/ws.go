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
	hub     *ws.Hub
	handler *ws.EventHandler
}

// NewWSHandler 建立 WSHandler 實例
func NewWSHandler(hub *ws.Hub, handler *ws.EventHandler) *WSHandler {
	return &WSHandler{hub: hub, handler: handler}
}

// ServeWS 處理 WebSocket upgrade 請求
func (h *WSHandler) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // 允許所有來源（遷移期間）
	})
	if err != nil {
		slog.Error("WebSocket accept 失敗", "error", err)
		return
	}

	client := ws.NewClient(h.hub, conn, h.handler)
	h.hub.Register(client)

	go client.WritePump(r.Context())
	client.ReadPump(r.Context())
}
