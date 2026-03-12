// Package ws 實作 WebSocket 即時通訊功能。
// 此檔案定義 WebSocket Hub，負責管理所有連線與 session 內的訊息廣播。
package ws

import (
	"log/slog"
	"sync"
)

// Hub 管理所有 WebSocket 連線及 session 分組
type Hub struct {
	// 所有已連線的 client
	clients map[*Client]bool
	// 以 sessionID 分組的 client 集合
	sessions map[string]map[*Client]bool
	// client 註冊通道
	register chan *Client
	// client 登出通道
	unregister chan *Client
	// session 廣播通道
	broadcast chan *SessionBroadcast
	mu        sync.RWMutex
}

// SessionBroadcast 表示一則要廣播到特定 session 的訊息
type SessionBroadcast struct {
	SessionID string
	Message   []byte
	Exclude   *Client // 排除的 client（例如訊息發送者）
}

// NewHub 建立新的 Hub 實例
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		sessions:   make(map[string]map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan *SessionBroadcast, 256),
	}
}

// Run 啟動 Hub 的主迴圈，應在獨立的 goroutine 中執行
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			slog.Debug("WebSocket client 已連線", "clientID", client.id)

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				if client.sessionID != "" {
					if sc, ok := h.sessions[client.sessionID]; ok {
						delete(sc, client)
						if len(sc) == 0 {
							delete(h.sessions, client.sessionID)
						}
					}
				}
				close(client.send)
			}
			h.mu.Unlock()
			slog.Debug("WebSocket client 已斷線", "clientID", client.id)

		case msg := <-h.broadcast:
			h.mu.RLock()
			if sc, ok := h.sessions[msg.SessionID]; ok {
				for client := range sc {
					if msg.Exclude != nil && client == msg.Exclude {
						continue
					}
					select {
					case client.send <- msg.Message:
					default:
						// send buffer 已滿，清理該 client
						close(client.send)
						delete(sc, client)
						delete(h.clients, client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// Register 將 client 加入 Hub
func (h *Hub) Register(client *Client) {
	h.register <- client
}

// JoinSession 將 client 加入指定 session，若已在其他 session 則先離開
func (h *Hub) JoinSession(client *Client, sessionID string) {
	h.mu.Lock()
	defer h.mu.Unlock()

	// 若已在其他 session，先離開
	if client.sessionID != "" && client.sessionID != sessionID {
		if old, ok := h.sessions[client.sessionID]; ok {
			delete(old, client)
			if len(old) == 0 {
				delete(h.sessions, client.sessionID)
			}
		}
	}

	client.sessionID = sessionID
	if _, ok := h.sessions[sessionID]; !ok {
		h.sessions[sessionID] = make(map[*Client]bool)
	}
	h.sessions[sessionID][client] = true
}

// LeaveSession 將 client 從目前 session 移除
func (h *Hub) LeaveSession(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if client.sessionID == "" {
		return
	}
	if sc, ok := h.sessions[client.sessionID]; ok {
		delete(sc, client)
		if len(sc) == 0 {
			delete(h.sessions, client.sessionID)
		}
	}
	client.sessionID = ""
}

// BroadcastToSession 向指定 session 的所有 client 廣播訊息
func (h *Hub) BroadcastToSession(sessionID string, message []byte, exclude *Client) {
	h.broadcast <- &SessionBroadcast{
		SessionID: sessionID,
		Message:   message,
		Exclude:   exclude,
	}
}

// SendToClient 向單一 client 發送訊息
func (h *Hub) SendToClient(client *Client, message []byte) {
	select {
	case client.send <- message:
	default:
		slog.Warn("client send buffer 已滿", "clientID", client.id)
	}
}

// GetSessionCounts 取得指定 session 的 controller 和 display 數量
func (h *Hub) GetSessionCounts(sessionID string) (controllers, displays int) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if sc, ok := h.sessions[sessionID]; ok {
		for client := range sc {
			switch client.role {
			case RoleController:
				controllers++
			case RoleDisplay:
				displays++
			}
		}
	}
	return
}
