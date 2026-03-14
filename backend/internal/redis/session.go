// Package redis 封裝 Redis 客戶端操作。
// 此檔案負責使用 Redis 管理 session 資料，格式與 Node.js 端完全相容。
//
// Redis key 格式：
//   - session:{sessionId}          — JSON 字串，儲存 SessionState
//   - session:clients:{sessionId}  — Redis SET，每個成員為 ClientInfo 的 JSON 字串
//   - TTL: 3600 秒（1 小時）
package redis

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	goredis "github.com/redis/go-redis/v9"
)

const (
	sessionPrefix        = "session:"
	sessionClientsPrefix = "session:clients:"
	sessionTTL           = 3600 * time.Second // 1 小時
)

// SessionSong 為 session 中的歌曲資料，JSON tag 與 Node.js 格式完全一致。
type SessionSong struct {
	ID            string    `json:"id"`
	Title         string    `json:"title"`
	Artist        *string   `json:"artist"`
	Lyrics        []string  `json:"lyrics"`
	LrcTimestamps []float64 `json:"lrcTimestamps"`
	Language      *string   `json:"language"`
	UserID        string    `json:"userId"`
	CreatedAt     string    `json:"createdAt"` // ISO 8601 字串
	UpdatedAt     string    `json:"updatedAt"` // ISO 8601 字串
}

// SessionSettings 為 session 中的顯示設定，JSON tag 與 Node.js 格式完全一致。
type SessionSettings struct {
	DisplayLines    int     `json:"displayLines"`
	FontSize        int     `json:"fontSize"`
	FontFamily      string  `json:"fontFamily"`
	LineSpacing     float64 `json:"lineSpacing"`
	Theme           string  `json:"theme"`
	ShowBackground  bool   `json:"showBackground"`
	BackgroundColor string `json:"backgroundColor"`
	TextColor       string `json:"textColor"`
	HighlightColor  string `json:"highlightColor"`
	AutoScroll      bool   `json:"autoScroll"`
	ScrollDuration  int    `json:"scrollDuration"`
	EnableAnimation bool   `json:"enableAnimation"`
}

// SessionState 為完整 session 狀態，JSON tag 與 Node.js 格式完全一致。
type SessionState struct {
	SessionID        string          `json:"sessionId"`
	CurrentSong      *SessionSong    `json:"currentSong"`      // 可為 null
	CurrentLineIndex int             `json:"currentLineIndex"`
	IsPlaying        bool            `json:"isPlaying"`
	Settings         SessionSettings `json:"settings"`
	ControllerCount  int             `json:"controllerCount"`
	DisplayCount     int             `json:"displayCount"`
	CreatedAt        int64           `json:"createdAt"` // Unix 毫秒
	UpdatedAt        int64           `json:"updatedAt"` // Unix 毫秒
}

// ClientInfo 為連線客戶端資訊，JSON tag 與 Node.js 格式完全一致。
type ClientInfo struct {
	ClientID string  `json:"clientId"`
	Role     string  `json:"role"`     // "controller" | "display" | "admin"
	UserID   *string `json:"userId"`   // 可為 null
	JoinedAt int64   `json:"joinedAt"` // Unix 毫秒
}

// GetSession 從 Redis 取得指定 session。
// 若 session 不存在，回傳 (nil, nil)。
func (c *Client) GetSession(ctx context.Context, sessionID string) (*SessionState, error) {
	key := sessionPrefix + sessionID
	data, err := c.rdb.Get(ctx, key).Result()
	if err == goredis.Nil {
		return nil, nil // session 不存在
	}
	if err != nil {
		return nil, fmt.Errorf("redis get session: %w", err)
	}

	var state SessionState
	if err := json.Unmarshal([]byte(data), &state); err != nil {
		return nil, fmt.Errorf("unmarshal session: %w", err)
	}

	return &state, nil
}

// SetSession 將 session 狀態寫入 Redis，TTL 為 1 小時。
func (c *Client) SetSession(ctx context.Context, state *SessionState) error {
	key := sessionPrefix + state.SessionID
	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("marshal session: %w", err)
	}

	return c.rdb.Set(ctx, key, data, sessionTTL).Err()
}

// DeleteSession 刪除 session 及其關聯的 clients 集合。
// 使用 pipeline 確保兩個 key 在同一次 round-trip 中刪除。
func (c *Client) DeleteSession(ctx context.Context, sessionID string) error {
	pipe := c.rdb.Pipeline()
	pipe.Del(ctx, sessionPrefix+sessionID)
	pipe.Del(ctx, sessionClientsPrefix+sessionID)
	_, err := pipe.Exec(ctx)
	return err
}

// GetSessionClients 取得 session 的所有已連線客戶端。
// 無法反序列化的成員會被靜默跳過。
func (c *Client) GetSessionClients(ctx context.Context, sessionID string) ([]ClientInfo, error) {
	key := sessionClientsPrefix + sessionID
	members, err := c.rdb.SMembers(ctx, key).Result()
	if err != nil {
		return nil, fmt.Errorf("redis smembers: %w", err)
	}

	clients := make([]ClientInfo, 0, len(members))
	for _, m := range members {
		var info ClientInfo
		if err := json.Unmarshal([]byte(m), &info); err != nil {
			continue // 跳過無法解析的 client
		}
		clients = append(clients, info)
	}

	return clients, nil
}

// AddClient 將客戶端加入 session 的 clients 集合。
func (c *Client) AddClient(ctx context.Context, sessionID string, info ClientInfo) error {
	key := sessionClientsPrefix + sessionID
	data, err := json.Marshal(info)
	if err != nil {
		return fmt.Errorf("marshal client info: %w", err)
	}

	return c.rdb.SAdd(ctx, key, data).Err()
}

// HasClients 檢查指定 session 是否還有已連線的客戶端
func (c *Client) HasClients(ctx context.Context, sessionID string) (bool, error) {
	key := sessionClientsPrefix + sessionID
	count, err := c.rdb.SCard(ctx, key).Result()
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// RemoveClient 依 clientID 從 session 的 clients 集合中移除對應客戶端。
// 直接使用 SMembers 原始字串做 SREM，避免重新序列化 JSON 時因 key 順序不同導致 SREM 靜默失敗。
func (c *Client) RemoveClient(ctx context.Context, sessionID string, clientID string) error {
	key := sessionClientsPrefix + sessionID
	members, err := c.rdb.SMembers(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("redis smembers for removal: %w", err)
	}

	for _, raw := range members {
		var info ClientInfo
		if err := json.Unmarshal([]byte(raw), &info); err != nil {
			continue
		}
		if info.ClientID == clientID {
			// 用原始 raw 字串做 SREM，確保完全匹配
			return c.rdb.SRem(ctx, key, raw).Err()
		}
	}

	return nil
}
