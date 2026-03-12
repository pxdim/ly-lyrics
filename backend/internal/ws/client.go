// Package ws 實作 WebSocket 即時通訊功能。
// 此檔案定義 WebSocket 客戶端連線，負責讀寫訊息與心跳偵測。
package ws

import (
	"context"
	"log/slog"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"
	"github.com/google/uuid"
)

const (
	// writeTimeout 寫入訊息的逾時時間
	writeTimeout = 10 * time.Second
	// maxMessageSize 單則訊息的最大位元組數
	maxMessageSize = 32768
	// sendBufferSize client 發送通道的緩衝大小
	sendBufferSize = 256
	// pingInterval 心跳偵測間隔
	pingInterval = 30 * time.Second
)

// Client 代表一個 WebSocket 連線
type Client struct {
	id        string
	hub       *Hub
	conn      *websocket.Conn
	send      chan []byte
	sessionID string
	role      ClientRole
	userID    *string
	handler   *EventHandler
}

// NewClient 建立新的 WebSocket client
func NewClient(hub *Hub, conn *websocket.Conn, handler *EventHandler) *Client {
	return &Client{
		id:      uuid.New().String(),
		hub:     hub,
		conn:    conn,
		send:    make(chan []byte, sendBufferSize),
		handler: handler,
	}
}

// ReadPump 從 WebSocket 連線持續讀取訊息，應在獨立 goroutine 中執行。
// 連線關閉或讀取錯誤時會自動觸發斷線處理。
func (c *Client) ReadPump(ctx context.Context) {
	defer func() {
		c.handler.HandleDisconnect(c)
		c.hub.unregister <- c
		c.conn.Close(websocket.StatusNormalClosure, "")
	}()

	c.conn.SetReadLimit(maxMessageSize)

	for {
		var msg Message
		err := wsjson.Read(ctx, c.conn, &msg)
		if err != nil {
			if websocket.CloseStatus(err) == websocket.StatusNormalClosure ||
				websocket.CloseStatus(err) == websocket.StatusGoingAway {
				slog.Debug("WebSocket 正常關閉", "clientID", c.id)
			} else {
				slog.Debug("WebSocket 讀取錯誤", "clientID", c.id, "error", err)
			}
			return
		}
		c.handler.HandleMessage(c, &msg)
	}
}

// WritePump 持續將訊息從 send 通道寫入 WebSocket 連線，應在獨立 goroutine 中執行。
// 同時負責定期 ping 以偵測連線是否存活。
func (c *Client) WritePump(ctx context.Context) {
	ticker := time.NewTicker(pingInterval)
	defer func() {
		ticker.Stop()
		c.conn.Close(websocket.StatusNormalClosure, "")
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				return
			}
			writeCtx, cancel := context.WithTimeout(ctx, writeTimeout)
			err := c.conn.Write(writeCtx, websocket.MessageText, message)
			cancel()
			if err != nil {
				slog.Debug("WebSocket 寫入錯誤", "clientID", c.id, "error", err)
				return
			}

		case <-ticker.C:
			pingCtx, cancel := context.WithTimeout(ctx, writeTimeout)
			err := c.conn.Ping(pingCtx)
			cancel()
			if err != nil {
				slog.Debug("WebSocket ping 失敗", "clientID", c.id, "error", err)
				return
			}

		case <-ctx.Done():
			return
		}
	}
}
