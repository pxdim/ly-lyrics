// Package redis 測試 Redis session 管理功能。
// 使用 miniredis 提供記憶體內 Redis 伺服器，無需外部 Redis 服務。
package redis

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	goredis "github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestClient 使用 miniredis 建立測試用 Client
func newTestClient(t *testing.T) (*Client, *miniredis.Miniredis) {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := goredis.NewClient(&goredis.Options{
		Addr: mr.Addr(),
	})
	return &Client{rdb: rdb}, mr
}

// ─────────────────────────────────────────────────────────────────────────────
// GetSession / SetSession 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestSetSession_AndGetSession(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	state := &SessionState{
		SessionID:        "test-session-1",
		CurrentLineIndex: 5,
		IsPlaying:        true,
		Settings: SessionSettings{
			DisplayLines:    4,
			FontSize:        32,
			FontFamily:      "Inter",
			Theme:           "dark",
			ShowBackground:  true,
			BackgroundColor: "#000000",
			TextColor:       "#ffffff",
			HighlightColor:  "#0ea5e9",
			AutoScroll:      true,
			ScrollDuration:  300,
			EnableAnimation: true,
		},
		ControllerCount: 1,
		DisplayCount:    2,
		CreatedAt:       time.Now().UnixMilli(),
		UpdatedAt:       time.Now().UnixMilli(),
	}

	// 寫入 session
	err := c.SetSession(ctx, state)
	require.NoError(t, err)

	// 讀取 session
	got, err := c.GetSession(ctx, "test-session-1")
	require.NoError(t, err)
	require.NotNil(t, got)

	assert.Equal(t, state.SessionID, got.SessionID)
	assert.Equal(t, state.CurrentLineIndex, got.CurrentLineIndex)
	assert.Equal(t, state.IsPlaying, got.IsPlaying)
	assert.Equal(t, state.Settings.FontSize, got.Settings.FontSize)
	assert.Equal(t, state.Settings.Theme, got.Settings.Theme)
	assert.Equal(t, state.ControllerCount, got.ControllerCount)
	assert.Equal(t, state.DisplayCount, got.DisplayCount)
}

func TestSetSession_WithCurrentSong(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	artist := "藝人"
	lang := "zh"
	state := &SessionState{
		SessionID: "test-session-song",
		CurrentSong: &SessionSong{
			ID:            "song-uuid-1",
			Title:         "測試歌曲",
			Artist:        &artist,
			Lyrics:        []string{"第一行", "第二行"},
			LrcTimestamps: []float64{0.0, 5.5},
			Language:      &lang,
			UserID:        "user-uuid-1",
			CreatedAt:     "2024-01-01T00:00:00Z",
			UpdatedAt:     "2024-01-01T00:00:00Z",
		},
		CurrentLineIndex: 0,
		IsPlaying:        false,
		Settings: SessionSettings{
			DisplayLines: 4,
			FontSize:     32,
		},
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
	}

	err := c.SetSession(ctx, state)
	require.NoError(t, err)

	got, err := c.GetSession(ctx, "test-session-song")
	require.NoError(t, err)
	require.NotNil(t, got)
	require.NotNil(t, got.CurrentSong)
	assert.Equal(t, "測試歌曲", got.CurrentSong.Title)
	require.NotNil(t, got.CurrentSong.Artist)
	assert.Equal(t, "藝人", *got.CurrentSong.Artist)
	assert.Equal(t, []string{"第一行", "第二行"}, got.CurrentSong.Lyrics)
	assert.Equal(t, []float64{0.0, 5.5}, got.CurrentSong.LrcTimestamps)
}

func TestGetSession_NonExistent(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	// 查詢不存在的 session 應回傳 (nil, nil)
	got, err := c.GetSession(ctx, "non-existent-session")
	assert.NoError(t, err)
	assert.Nil(t, got, "不存在的 session 應回傳 nil")
}

func TestSetSession_OverwriteExisting(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	state1 := &SessionState{
		SessionID:        "overwrite-session",
		CurrentLineIndex: 1,
		IsPlaying:        false,
		Settings:         SessionSettings{FontSize: 24},
		CreatedAt:        time.Now().UnixMilli(),
		UpdatedAt:        time.Now().UnixMilli(),
	}
	state2 := &SessionState{
		SessionID:        "overwrite-session",
		CurrentLineIndex: 10,
		IsPlaying:        true,
		Settings:         SessionSettings{FontSize: 48},
		CreatedAt:        time.Now().UnixMilli(),
		UpdatedAt:        time.Now().UnixMilli(),
	}

	// 寫入第一次
	require.NoError(t, c.SetSession(ctx, state1))

	// 覆蓋寫入
	require.NoError(t, c.SetSession(ctx, state2))

	got, err := c.GetSession(ctx, "overwrite-session")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, 10, got.CurrentLineIndex, "應為覆蓋後的值")
	assert.True(t, got.IsPlaying, "應為覆蓋後的值")
	assert.Equal(t, 48, got.Settings.FontSize, "應為覆蓋後的值")
}

func TestSetSession_TTL(t *testing.T) {
	t.Parallel()
	c, mr := newTestClient(t)
	ctx := context.Background()

	state := &SessionState{
		SessionID: "ttl-session",
		Settings:  SessionSettings{FontSize: 32},
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
	}

	require.NoError(t, c.SetSession(ctx, state))

	// 驗證 TTL 已設定（應為 3600 秒）
	ttl := mr.TTL(sessionPrefix + "ttl-session")
	assert.Equal(t, sessionTTL, ttl, "TTL 應為 3600 秒")
}

// ─────────────────────────────────────────────────────────────────────────────
// DeleteSession 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestDeleteSession_ExistingSession(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	// 先寫入 session 和 client
	state := &SessionState{
		SessionID: "delete-session",
		Settings:  SessionSettings{FontSize: 32},
		CreatedAt: time.Now().UnixMilli(),
		UpdatedAt: time.Now().UnixMilli(),
	}
	require.NoError(t, c.SetSession(ctx, state))
	require.NoError(t, c.AddClient(ctx, "delete-session", ClientInfo{
		ClientID: "client-1",
		Role:     "controller",
		JoinedAt: time.Now().UnixMilli(),
	}))

	// 刪除 session
	err := c.DeleteSession(ctx, "delete-session")
	require.NoError(t, err)

	// 驗證 session 已刪除
	got, err := c.GetSession(ctx, "delete-session")
	assert.NoError(t, err)
	assert.Nil(t, got, "刪除後 session 應不存在")

	// 驗證 clients 也已刪除
	clients, err := c.GetSessionClients(ctx, "delete-session")
	assert.NoError(t, err)
	assert.Empty(t, clients, "刪除後 clients 應為空")
}

func TestDeleteSession_NonExistent(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	// 刪除不存在的 session 不應出錯
	err := c.DeleteSession(ctx, "non-existent")
	assert.NoError(t, err)
}

// ─────────────────────────────────────────────────────────────────────────────
// AddClient / GetSessionClients 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestAddClient_AndGetSessionClients(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	sessionID := "client-test-session"
	userID := "user-uuid-1"
	client1 := ClientInfo{
		ClientID: "client-1",
		Role:     "controller",
		UserID:   &userID,
		JoinedAt: time.Now().UnixMilli(),
	}
	client2 := ClientInfo{
		ClientID: "client-2",
		Role:     "display",
		UserID:   nil,
		JoinedAt: time.Now().UnixMilli(),
	}

	// 新增兩個 client
	require.NoError(t, c.AddClient(ctx, sessionID, client1))
	require.NoError(t, c.AddClient(ctx, sessionID, client2))

	// 查詢所有 clients
	clients, err := c.GetSessionClients(ctx, sessionID)
	require.NoError(t, err)
	assert.Len(t, clients, 2)

	// 驗證包含兩個 client（順序不確定，使用 map 檢查）
	clientMap := make(map[string]ClientInfo)
	for _, cl := range clients {
		clientMap[cl.ClientID] = cl
	}

	assert.Contains(t, clientMap, "client-1")
	assert.Contains(t, clientMap, "client-2")
	assert.Equal(t, "controller", clientMap["client-1"].Role)
	assert.Equal(t, "display", clientMap["client-2"].Role)
	require.NotNil(t, clientMap["client-1"].UserID)
	assert.Equal(t, "user-uuid-1", *clientMap["client-1"].UserID)
	assert.Nil(t, clientMap["client-2"].UserID)
}

func TestGetSessionClients_Empty(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	clients, err := c.GetSessionClients(ctx, "empty-session")
	assert.NoError(t, err)
	assert.Empty(t, clients, "無 clients 時應回傳空陣列")
}

func TestGetSessionClients_SkipInvalidJSON(t *testing.T) {
	t.Parallel()
	c, mr := newTestClient(t)
	ctx := context.Background()

	sessionID := "invalid-json-session"
	key := sessionClientsPrefix + sessionID

	// 手動寫入一筆有效和一筆無效的 client JSON
	validClient := ClientInfo{
		ClientID: "valid-client",
		Role:     "controller",
		JoinedAt: time.Now().UnixMilli(),
	}
	validJSON, _ := json.Marshal(validClient)
	mr.SAdd(key, string(validJSON))
	mr.SAdd(key, "not-valid-json")

	clients, err := c.GetSessionClients(ctx, sessionID)
	require.NoError(t, err)
	assert.Len(t, clients, 1, "應只回傳有效的 client")
	assert.Equal(t, "valid-client", clients[0].ClientID)
}

// ─────────────────────────────────────────────────────────────────────────────
// HasClients 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestHasClients_WithClients(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	sessionID := "has-clients-session"
	require.NoError(t, c.AddClient(ctx, sessionID, ClientInfo{
		ClientID: "client-1",
		Role:     "display",
		JoinedAt: time.Now().UnixMilli(),
	}))

	has, err := c.HasClients(ctx, sessionID)
	require.NoError(t, err)
	assert.True(t, has, "有 clients 時應回傳 true")
}

func TestHasClients_Empty(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	has, err := c.HasClients(ctx, "empty-session")
	require.NoError(t, err)
	assert.False(t, has, "無 clients 時應回傳 false")
}

// ─────────────────────────────────────────────────────────────────────────────
// RemoveClient 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestRemoveClient_ExistingClient(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	sessionID := "remove-client-session"
	client1 := ClientInfo{
		ClientID: "client-to-remove",
		Role:     "controller",
		JoinedAt: time.Now().UnixMilli(),
	}
	client2 := ClientInfo{
		ClientID: "client-to-keep",
		Role:     "display",
		JoinedAt: time.Now().UnixMilli(),
	}

	require.NoError(t, c.AddClient(ctx, sessionID, client1))
	require.NoError(t, c.AddClient(ctx, sessionID, client2))

	// 移除 client-to-remove
	err := c.RemoveClient(ctx, sessionID, "client-to-remove")
	require.NoError(t, err)

	// 驗證只剩下 client-to-keep
	clients, err := c.GetSessionClients(ctx, sessionID)
	require.NoError(t, err)
	assert.Len(t, clients, 1)
	assert.Equal(t, "client-to-keep", clients[0].ClientID)
}

func TestRemoveClient_NonExistentClient(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	sessionID := "remove-nonexistent"
	require.NoError(t, c.AddClient(ctx, sessionID, ClientInfo{
		ClientID: "existing-client",
		Role:     "display",
		JoinedAt: time.Now().UnixMilli(),
	}))

	// 移除不存在的 clientID，不應出錯
	err := c.RemoveClient(ctx, sessionID, "non-existent-client")
	assert.NoError(t, err)

	// 原有 client 應仍存在
	clients, err := c.GetSessionClients(ctx, sessionID)
	require.NoError(t, err)
	assert.Len(t, clients, 1)
	assert.Equal(t, "existing-client", clients[0].ClientID)
}

func TestRemoveClient_EmptySession(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	// 從空 session 移除，不應出錯
	err := c.RemoveClient(ctx, "empty-session", "any-client")
	assert.NoError(t, err)
}

func TestRemoveClient_LastClient(t *testing.T) {
	t.Parallel()
	c, _ := newTestClient(t)
	ctx := context.Background()

	sessionID := "last-client-session"
	require.NoError(t, c.AddClient(ctx, sessionID, ClientInfo{
		ClientID: "only-client",
		Role:     "controller",
		JoinedAt: time.Now().UnixMilli(),
	}))

	// 移除最後一個 client
	err := c.RemoveClient(ctx, sessionID, "only-client")
	require.NoError(t, err)

	// 驗證 HasClients 回傳 false
	has, err := c.HasClients(ctx, sessionID)
	require.NoError(t, err)
	assert.False(t, has, "移除最後一個 client 後應回傳 false")
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON 序列化格式驗證（確保與 Node.js 相容）
// ─────────────────────────────────────────────────────────────────────────────

func TestSessionState_JSONFormat(t *testing.T) {
	t.Parallel()

	state := SessionState{
		SessionID:        "json-test",
		CurrentSong:      nil,
		CurrentLineIndex: 0,
		IsPlaying:        false,
		Settings: SessionSettings{
			DisplayLines: 4,
			FontSize:     32,
		},
		ControllerCount: 1,
		DisplayCount:    0,
		CreatedAt:       1700000000000,
		UpdatedAt:       1700000000000,
	}

	data, err := json.Marshal(state)
	require.NoError(t, err)

	// 驗證 JSON key 使用 camelCase（與 Node.js 相容）
	jsonStr := string(data)
	assert.Contains(t, jsonStr, `"sessionId"`)
	assert.Contains(t, jsonStr, `"currentSong"`)
	assert.Contains(t, jsonStr, `"currentLineIndex"`)
	assert.Contains(t, jsonStr, `"isPlaying"`)
	assert.Contains(t, jsonStr, `"controllerCount"`)
	assert.Contains(t, jsonStr, `"displayCount"`)
	assert.Contains(t, jsonStr, `"createdAt"`)
	assert.Contains(t, jsonStr, `"updatedAt"`)

	// 驗證 null 值正確（currentSong 為 nil 應序列化為 null）
	assert.Contains(t, jsonStr, `"currentSong":null`)
}

func TestClientInfo_JSONFormat(t *testing.T) {
	t.Parallel()

	userID := "user-123"
	info := ClientInfo{
		ClientID: "client-456",
		Role:     "controller",
		UserID:   &userID,
		JoinedAt: 1700000000000,
	}

	data, err := json.Marshal(info)
	require.NoError(t, err)

	jsonStr := string(data)
	assert.Contains(t, jsonStr, `"clientId"`)
	assert.Contains(t, jsonStr, `"role"`)
	assert.Contains(t, jsonStr, `"userId"`)
	assert.Contains(t, jsonStr, `"joinedAt"`)
}

func TestClientInfo_NullUserID(t *testing.T) {
	t.Parallel()

	info := ClientInfo{
		ClientID: "anon-client",
		Role:     "display",
		UserID:   nil,
		JoinedAt: 1700000000000,
	}

	data, err := json.Marshal(info)
	require.NoError(t, err)

	jsonStr := string(data)
	assert.Contains(t, jsonStr, `"userId":null`, "null userId 應序列化為 null")
}

func TestSessionSong_JSONRoundTrip(t *testing.T) {
	t.Parallel()

	artist := "測試藝人"
	lang := "zh"
	song := SessionSong{
		ID:            "song-id-1",
		Title:         "測試歌曲",
		Artist:        &artist,
		Lyrics:        []string{"第一行", "第二行"},
		LrcTimestamps: []float64{0.0, 5.5},
		Language:      &lang,
		UserID:        "user-id-1",
		CreatedAt:     "2024-01-01T00:00:00Z",
		UpdatedAt:     "2024-01-01T00:00:00Z",
	}

	// 序列化
	data, err := json.Marshal(song)
	require.NoError(t, err)

	// 反序列化
	var decoded SessionSong
	require.NoError(t, json.Unmarshal(data, &decoded))

	assert.Equal(t, song.ID, decoded.ID)
	assert.Equal(t, song.Title, decoded.Title)
	require.NotNil(t, decoded.Artist)
	assert.Equal(t, *song.Artist, *decoded.Artist)
	assert.Equal(t, song.Lyrics, decoded.Lyrics)
	assert.Equal(t, song.LrcTimestamps, decoded.LrcTimestamps)
}
