// Package ws 測試 EventHandler 的各種事件處理邏輯。
// 使用 miniredis 提供記憶體內 Redis 伺服器，無需外部 Redis 服務。
// SongService 需要 Ent Client + 資料庫，因此 set_song 相關測試標記為整合測試。
package ws

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	goredis "github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	lyredis "github.com/raymondchen/ly-backend/internal/redis"
)

// newTestRedisClient 使用 miniredis 建立測試用 lyredis.Client
// 回傳 Client 供 EventHandler 使用，miniredis 實例在測試結束時自動清理
func newTestRedisClient(t *testing.T) *lyredis.Client {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := goredis.NewClient(&goredis.Options{
		Addr: mr.Addr(),
	})
	// 使用 lyredis 套件的內部結構建構 Client
	// lyredis.Client 的 rdb 欄位是非導出的，需要透過 NewForTest 或其他方式
	// 因為 lyredis.Client 只有 New(url) 建構函式且會 Ping，
	// 我們利用 miniredis 的 addr 透過 New 建構
	_ = rdb // 不直接使用，改用 New
	rdb.Close()

	client, err := lyredis.New("redis://" + mr.Addr())
	require.NoError(t, err)
	t.Cleanup(func() { client.Close() })
	return client
}

// newTestEventHandler 建立測試用 EventHandler（不含 SongService）
func newTestEventHandler(t *testing.T) (*EventHandler, *Hub) {
	t.Helper()
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	redisClient := newTestRedisClient(t)
	handler := NewEventHandler(hub, redisClient, nil)
	return handler, hub
}

// newTestClientWithRole 建立帶有角色的測試用 client 並註冊到 hub
func newTestClientWithRole(t *testing.T, hub *Hub, handler *EventHandler, role ClientRole, sessionID string) *Client {
	t.Helper()
	client := NewClient(hub, nil, handler)
	client.role = role
	hub.Register(client)
	time.Sleep(10 * time.Millisecond)

	if sessionID != "" {
		// 透過 JoinSession 註冊到 session
		hub.JoinSession(client, sessionID)

		// 同時在 Redis 建立 session 狀態
		state := NewSessionState(sessionID)
		handler.redisClient.SetSession(t.Context(), state)
		handler.redisClient.AddClient(t.Context(), sessionID, lyredis.ClientInfo{
			ClientID: client.id,
			Role:     string(role),
			JoinedAt: time.Now().UnixMilli(),
		})
	}
	return client
}

// readMessage 從 client 的 send 通道讀取一則訊息並解析為 Message
func readMessage(t *testing.T, client *Client, timeout time.Duration) *Message {
	t.Helper()
	select {
	case data, ok := <-client.send:
		if !ok {
			t.Fatal("send channel 已關閉")
		}
		var msg Message
		require.NoError(t, json.Unmarshal(data, &msg))
		return &msg
	case <-time.After(timeout):
		return nil
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// HandleMessage 分派測試
// ─────────────────────────────────────────────────────────────────────────────

func TestHandleMessage_UnknownType(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	client := newTestClientWithRole(t, hub, handler, RoleController, "session-unknown")

	msg := &Message{
		Type:    MessageType("unknown_event"),
		Payload: nil,
	}
	handler.HandleMessage(client, msg)

	// 應收到 error 訊息
	received := readMessage(t, client, 100*time.Millisecond)
	require.NotNil(t, received, "應收到回應訊息")
	assert.Equal(t, MsgError, received.Type, "應為 error 類型")

	var errPayload ErrorPayload
	require.NoError(t, json.Unmarshal(received.Payload, &errPayload))
	assert.Contains(t, errPayload.Message, "未知的訊息類型")
}

// ─────────────────────────────────────────────────────────────────────────────
// JoinSession 事件測試
// ─────────────────────────────────────────────────────────────────────────────

func TestHandleJoinSession_Success(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	client := NewClient(hub, nil, handler)
	hub.Register(client)
	time.Sleep(10 * time.Millisecond)

	payload, _ := json.Marshal(JoinSessionPayload{
		SessionID: "test-join-session",
		Role:      RoleController,
	})
	msg := &Message{
		Type:    MsgJoinSession,
		Payload: payload,
	}
	handler.HandleMessage(client, msg)

	// 等待 broadcast channel 處理
	time.Sleep(20 * time.Millisecond)

	// 應收到 session_state 回應
	received := readMessage(t, client, 200*time.Millisecond)
	require.NotNil(t, received, "應收到 session_state")
	assert.Equal(t, MsgSessionState, received.Type)

	// 驗證 client 已加入 session
	assert.Equal(t, "test-join-session", client.sessionID)
	assert.Equal(t, RoleController, client.role)
}

func TestHandleJoinSession_InvalidPayload(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	client := NewClient(hub, nil, handler)
	hub.Register(client)
	time.Sleep(10 * time.Millisecond)

	msg := &Message{
		Type:    MsgJoinSession,
		Payload: json.RawMessage(`{invalid json`),
	}
	handler.HandleMessage(client, msg)

	received := readMessage(t, client, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

func TestHandleJoinSession_MissingFields(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	client := NewClient(hub, nil, handler)
	hub.Register(client)
	time.Sleep(10 * time.Millisecond)

	// sessionId 為空
	payload, _ := json.Marshal(JoinSessionPayload{
		SessionID: "",
		Role:      RoleController,
	})
	msg := &Message{
		Type:    MsgJoinSession,
		Payload: payload,
	}
	handler.HandleMessage(client, msg)

	received := readMessage(t, client, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)

	var errPayload ErrorPayload
	require.NoError(t, json.Unmarshal(received.Payload, &errPayload))
	assert.Contains(t, errPayload.Message, "必填")
}

func TestHandleJoinSession_WithUserID(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	client := NewClient(hub, nil, handler)
	hub.Register(client)
	time.Sleep(10 * time.Millisecond)

	userID := "user-123"
	payload, _ := json.Marshal(JoinSessionPayload{
		SessionID: "session-userid",
		Role:      RoleDisplay,
		UserID:    &userID,
	})
	msg := &Message{
		Type:    MsgJoinSession,
		Payload: payload,
	}
	handler.HandleMessage(client, msg)
	time.Sleep(20 * time.Millisecond)

	assert.Equal(t, RoleDisplay, client.role)
	require.NotNil(t, client.userID)
	assert.Equal(t, "user-123", *client.userID)
}

// ─────────────────────────────────────────────────────────────────────────────
// LeaveSession 事件測試
// ─────────────────────────────────────────────────────────────────────────────

func TestHandleLeaveSession_NotInSession(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	client := NewClient(hub, nil, handler)
	hub.Register(client)
	time.Sleep(10 * time.Millisecond)

	// client 未加入 session，呼叫 leave_session 不應 panic
	msg := &Message{Type: MsgLeaveSession}
	assert.NotPanics(t, func() {
		handler.HandleMessage(client, msg)
	})
}

func TestHandleLeaveSession_WithOtherClients(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-leave-other"

	clientA := newTestClientWithRole(t, hub, handler, RoleController, sessionID)
	clientB := newTestClientWithRole(t, hub, handler, RoleDisplay, sessionID)

	// clientA 離開
	msg := &Message{Type: MsgLeaveSession}
	handler.HandleMessage(clientA, msg)
	time.Sleep(30 * time.Millisecond)

	// clientA 的 sessionID 應被清空
	assert.Equal(t, "", clientA.sessionID)

	// session 仍應存在（clientB 仍在）
	state, err := handler.redisClient.GetSession(ctx, sessionID)
	assert.NoError(t, err)
	assert.NotNil(t, state, "session 應仍存在")

	// clientB 應收到 client_left 廣播
	received := readMessage(t, clientB, 200*time.Millisecond)
	require.NotNil(t, received, "clientB 應收到 client_left 廣播")
	assert.Equal(t, MsgClientLeft, received.Type)
}

// ─────────────────────────────────────────────────────────────────────────────
// ChangeLine 事件測試
// ─────────────────────────────────────────────────────────────────────────────

func TestHandleChangeLine_Success(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-change-line"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)
	disp := newTestClientWithRole(t, hub, handler, RoleDisplay, sessionID)

	payload, _ := json.Marshal(ChangeLinePayload{LineIndex: 3})
	msg := &Message{
		Type:    MsgChangeLine,
		Payload: payload,
	}
	handler.HandleMessage(ctrl, msg)
	time.Sleep(30 * time.Millisecond)

	// 驗證 Redis 中的行號更新
	state, err := handler.redisClient.GetSession(ctx, sessionID)
	require.NoError(t, err)
	require.NotNil(t, state)
	assert.Equal(t, 3, state.CurrentLineIndex)

	// ctrl 和 disp 都應收到 line_changed 廣播
	received := readMessage(t, ctrl, 200*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgLineChanged, received.Type)

	receivedDisp := readMessage(t, disp, 200*time.Millisecond)
	require.NotNil(t, receivedDisp)
	assert.Equal(t, MsgLineChanged, receivedDisp.Type)
}

func TestHandleChangeLine_DisplayRejected(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-change-reject"

	disp := newTestClientWithRole(t, hub, handler, RoleDisplay, sessionID)

	payload, _ := json.Marshal(ChangeLinePayload{LineIndex: 5})
	msg := &Message{
		Type:    MsgChangeLine,
		Payload: payload,
	}
	handler.HandleMessage(disp, msg)

	// 應收到 error（僅 controller 可操作）
	received := readMessage(t, disp, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

func TestHandleChangeLine_NegativeIndex(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-neg-index"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	payload, _ := json.Marshal(map[string]int{"lineIndex": -1})
	msg := &Message{
		Type:    MsgChangeLine,
		Payload: payload,
	}
	handler.HandleMessage(ctrl, msg)

	// lineIndex < 0 應回傳 error
	received := readMessage(t, ctrl, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

func TestHandleChangeLine_ExceedsLyricsRange(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-exceed-range"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	// 設定 session 中有歌曲（3 行歌詞）
	state, _ := handler.redisClient.GetSession(ctx, sessionID)
	state.CurrentSong = &lyredis.SessionSong{
		ID:     "song-1",
		Title:  "測試歌曲",
		Lyrics: []string{"行一", "行二", "行三"},
	}
	handler.redisClient.SetSession(ctx, state)

	// lineIndex = 3（超出 0-2 範圍）
	payload, _ := json.Marshal(ChangeLinePayload{LineIndex: 3})
	msg := &Message{
		Type:    MsgChangeLine,
		Payload: payload,
	}
	handler.HandleMessage(ctrl, msg)

	received := readMessage(t, ctrl, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)

	var errPayload ErrorPayload
	require.NoError(t, json.Unmarshal(received.Payload, &errPayload))
	assert.Contains(t, errPayload.Message, "超出")
}

func TestHandleChangeLine_InvalidPayload(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-invalid-payload"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	msg := &Message{
		Type:    MsgChangeLine,
		Payload: json.RawMessage(`{bad json`),
	}
	handler.HandleMessage(ctrl, msg)

	received := readMessage(t, ctrl, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

// ─────────────────────────────────────────────────────────────────────────────
// NextLine / PrevLine 事件測試
// ─────────────────────────────────────────────────────────────────────────────

func TestHandleNextLine_Success(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-next"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	// 設定初始行號為 0
	state, _ := handler.redisClient.GetSession(ctx, sessionID)
	state.CurrentLineIndex = 0
	state.CurrentSong = &lyredis.SessionSong{
		Lyrics: []string{"行一", "行二", "行三"},
	}
	handler.redisClient.SetSession(ctx, state)

	msg := &Message{Type: MsgNextLine}
	handler.HandleMessage(ctrl, msg)
	time.Sleep(20 * time.Millisecond)

	// 行號應變為 1
	state, _ = handler.redisClient.GetSession(ctx, sessionID)
	assert.Equal(t, 1, state.CurrentLineIndex)

	// 應收到 line_changed 廣播
	received := readMessage(t, ctrl, 200*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgLineChanged, received.Type)
}

func TestHandleNextLine_AtLastLine(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-next-last"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	// 設定行號已在最後一行
	state, _ := handler.redisClient.GetSession(ctx, sessionID)
	state.CurrentLineIndex = 2
	state.CurrentSong = &lyredis.SessionSong{
		Lyrics: []string{"行一", "行二", "行三"},
	}
	handler.redisClient.SetSession(ctx, state)

	msg := &Message{Type: MsgNextLine}
	handler.HandleMessage(ctrl, msg)
	time.Sleep(20 * time.Millisecond)

	// 行號不應變動
	state, _ = handler.redisClient.GetSession(ctx, sessionID)
	assert.Equal(t, 2, state.CurrentLineIndex, "已在最後一行，行號不應改變")
}

func TestHandleNextLine_DisplayRejected(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-next-reject"

	disp := newTestClientWithRole(t, hub, handler, RoleDisplay, sessionID)

	msg := &Message{Type: MsgNextLine}
	handler.HandleMessage(disp, msg)

	received := readMessage(t, disp, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

func TestHandlePrevLine_Success(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-prev"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	// 設定初始行號為 2
	state, _ := handler.redisClient.GetSession(ctx, sessionID)
	state.CurrentLineIndex = 2
	handler.redisClient.SetSession(ctx, state)

	msg := &Message{Type: MsgPrevLine}
	handler.HandleMessage(ctrl, msg)
	time.Sleep(20 * time.Millisecond)

	// 行號應變為 1
	state, _ = handler.redisClient.GetSession(ctx, sessionID)
	assert.Equal(t, 1, state.CurrentLineIndex)
}

func TestHandlePrevLine_AtFirstLine(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-prev-first"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	// 設定行號已在第一行
	state, _ := handler.redisClient.GetSession(ctx, sessionID)
	state.CurrentLineIndex = 0
	handler.redisClient.SetSession(ctx, state)

	msg := &Message{Type: MsgPrevLine}
	handler.HandleMessage(ctrl, msg)
	time.Sleep(20 * time.Millisecond)

	// 行號不應改變
	state, _ = handler.redisClient.GetSession(ctx, sessionID)
	assert.Equal(t, 0, state.CurrentLineIndex, "已在第一行，行號不應改變")
}

func TestHandlePrevLine_DisplayRejected(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-prev-reject"

	disp := newTestClientWithRole(t, hub, handler, RoleDisplay, sessionID)

	msg := &Message{Type: MsgPrevLine}
	handler.HandleMessage(disp, msg)

	received := readMessage(t, disp, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

// ─────────────────────────────────────────────────────────────────────────────
// UpdateSettings 事件測試
// ─────────────────────────────────────────────────────────────────────────────

func TestHandleUpdateSettings_PartialUpdate(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-settings"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	fontSize := 48
	theme := "light"
	payload, _ := json.Marshal(UpdateSettingsPayload{
		FontSize: &fontSize,
		Theme:    &theme,
	})
	msg := &Message{
		Type:    MsgUpdateSettings,
		Payload: payload,
	}
	handler.HandleMessage(ctrl, msg)
	time.Sleep(20 * time.Millisecond)

	// 驗證 Redis 中的設定更新
	state, err := handler.redisClient.GetSession(ctx, sessionID)
	require.NoError(t, err)
	require.NotNil(t, state)
	assert.Equal(t, 48, state.Settings.FontSize, "FontSize 應更新為 48")
	assert.Equal(t, "light", state.Settings.Theme, "Theme 應更新為 light")
	// 未更新的欄位應保持預設值
	assert.Equal(t, 4, state.Settings.DisplayLines, "DisplayLines 應保持預設值")

	// 應收到 settings_updated 廣播
	received := readMessage(t, ctrl, 200*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgSettingsUpdated, received.Type)
}

func TestHandleUpdateSettings_AllFields(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-settings-all"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	displayLines := 6
	fontSize := 36
	fontFamily := "Noto Sans TC"
	lineSpacing := 1.5
	theme := "transparent"
	showBg := false
	bgColor := "#111111"
	textColor := "#eeeeee"
	highlightColor := "#ff0000"
	autoScroll := false
	scrollDuration := 500
	enableAnimation := false

	payload, _ := json.Marshal(UpdateSettingsPayload{
		DisplayLines:    &displayLines,
		FontSize:        &fontSize,
		FontFamily:      &fontFamily,
		LineSpacing:     &lineSpacing,
		Theme:           &theme,
		ShowBackground:  &showBg,
		BackgroundColor: &bgColor,
		TextColor:       &textColor,
		HighlightColor:  &highlightColor,
		AutoScroll:      &autoScroll,
		ScrollDuration:  &scrollDuration,
		EnableAnimation: &enableAnimation,
	})
	msg := &Message{
		Type:    MsgUpdateSettings,
		Payload: payload,
	}
	handler.HandleMessage(ctrl, msg)
	time.Sleep(20 * time.Millisecond)

	state, err := handler.redisClient.GetSession(ctx, sessionID)
	require.NoError(t, err)
	s := state.Settings
	assert.Equal(t, 6, s.DisplayLines)
	assert.Equal(t, 36, s.FontSize)
	assert.Equal(t, "Noto Sans TC", s.FontFamily)
	assert.Equal(t, 1.5, s.LineSpacing)
	assert.Equal(t, "transparent", s.Theme)
	assert.False(t, s.ShowBackground)
	assert.Equal(t, "#111111", s.BackgroundColor)
	assert.Equal(t, "#eeeeee", s.TextColor)
	assert.Equal(t, "#ff0000", s.HighlightColor)
	assert.False(t, s.AutoScroll)
	assert.Equal(t, 500, s.ScrollDuration)
	assert.False(t, s.EnableAnimation)
}

func TestHandleUpdateSettings_DisplayRejected(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-settings-reject"

	disp := newTestClientWithRole(t, hub, handler, RoleDisplay, sessionID)

	fontSize := 48
	payload, _ := json.Marshal(UpdateSettingsPayload{
		FontSize: &fontSize,
	})
	msg := &Message{
		Type:    MsgUpdateSettings,
		Payload: payload,
	}
	handler.HandleMessage(disp, msg)

	received := readMessage(t, disp, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

func TestHandleUpdateSettings_InvalidPayload(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-settings-invalid"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	msg := &Message{
		Type:    MsgUpdateSettings,
		Payload: json.RawMessage(`{bad`),
	}
	handler.HandleMessage(ctrl, msg)

	received := readMessage(t, ctrl, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

// ─────────────────────────────────────────────────────────────────────────────
// SetPlaying 事件測試
// ─────────────────────────────────────────────────────────────────────────────

func TestHandleSetPlaying_Start(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-playing-start"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	payload, _ := json.Marshal(SetPlayingPayload{IsPlaying: true})
	msg := &Message{
		Type:    MsgSetPlaying,
		Payload: payload,
	}
	handler.HandleMessage(ctrl, msg)
	time.Sleep(20 * time.Millisecond)

	state, _ := handler.redisClient.GetSession(ctx, sessionID)
	assert.True(t, state.IsPlaying, "IsPlaying 應為 true")

	// 應收到 playing_changed 廣播
	received := readMessage(t, ctrl, 200*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgPlayingChanged, received.Type)
}

func TestHandleSetPlaying_Stop(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-playing-stop"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	// 先設定為播放中
	state, _ := handler.redisClient.GetSession(ctx, sessionID)
	state.IsPlaying = true
	handler.redisClient.SetSession(ctx, state)

	payload, _ := json.Marshal(SetPlayingPayload{IsPlaying: false})
	msg := &Message{
		Type:    MsgSetPlaying,
		Payload: payload,
	}
	handler.HandleMessage(ctrl, msg)
	time.Sleep(20 * time.Millisecond)

	state, _ = handler.redisClient.GetSession(ctx, sessionID)
	assert.False(t, state.IsPlaying, "IsPlaying 應為 false")
}

func TestHandleSetPlaying_DisplayRejected(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-playing-reject"

	disp := newTestClientWithRole(t, hub, handler, RoleDisplay, sessionID)

	payload, _ := json.Marshal(SetPlayingPayload{IsPlaying: true})
	msg := &Message{
		Type:    MsgSetPlaying,
		Payload: payload,
	}
	handler.HandleMessage(disp, msg)

	received := readMessage(t, disp, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

func TestHandleSetPlaying_InvalidPayload(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-playing-invalid"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	msg := &Message{
		Type:    MsgSetPlaying,
		Payload: json.RawMessage(`{not json`),
	}
	handler.HandleMessage(ctrl, msg)

	received := readMessage(t, ctrl, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

// ─────────────────────────────────────────────────────────────────────────────
// SetSong 事件測試（不含 SongService 的部分測試）
// ─────────────────────────────────────────────────────────────────────────────

func TestHandleSetSong_DisplayRejected(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-song-reject"

	disp := newTestClientWithRole(t, hub, handler, RoleDisplay, sessionID)

	payload, _ := json.Marshal(SetSongPayload{SongID: "00000000-0000-0000-0000-000000000001"})
	msg := &Message{
		Type:    MsgSetSong,
		Payload: payload,
	}
	handler.HandleMessage(disp, msg)

	received := readMessage(t, disp, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

func TestHandleSetSong_InvalidPayload(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-song-invalid"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	msg := &Message{
		Type:    MsgSetSong,
		Payload: json.RawMessage(`{bad`),
	}
	handler.HandleMessage(ctrl, msg)

	received := readMessage(t, ctrl, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)
}

func TestHandleSetSong_InvalidUUID(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	sessionID := "session-song-bad-uuid"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	payload, _ := json.Marshal(SetSongPayload{SongID: "not-a-uuid"})
	msg := &Message{
		Type:    MsgSetSong,
		Payload: payload,
	}
	handler.HandleMessage(ctrl, msg)

	received := readMessage(t, ctrl, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)

	var errPayload ErrorPayload
	require.NoError(t, json.Unmarshal(received.Payload, &errPayload))
	assert.Contains(t, errPayload.Message, "songId")
}

// ─────────────────────────────────────────────────────────────────────────────
// HandleDisconnect 事件測試
// ─────────────────────────────────────────────────────────────────────────────

func TestHandleDisconnect_NotInSession(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	client := NewClient(hub, nil, handler)

	// client 未加入 session，HandleDisconnect 不應 panic
	assert.NotPanics(t, func() {
		handler.HandleDisconnect(client)
	})
}

func TestHandleDisconnect_LastClient(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-disconnect-last"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)

	handler.HandleDisconnect(ctrl)
	time.Sleep(20 * time.Millisecond)

	// session 應被清理
	state, err := handler.redisClient.GetSession(ctx, sessionID)
	assert.NoError(t, err)
	assert.Nil(t, state, "最後一個 client 斷線後 session 應被刪除")
}

func TestHandleDisconnect_OtherClientsRemain(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	ctx := t.Context()
	sessionID := "session-disconnect-remain"

	ctrl := newTestClientWithRole(t, hub, handler, RoleController, sessionID)
	disp := newTestClientWithRole(t, hub, handler, RoleDisplay, sessionID)

	handler.HandleDisconnect(ctrl)
	time.Sleep(30 * time.Millisecond)

	// session 應仍存在
	state, err := handler.redisClient.GetSession(ctx, sessionID)
	assert.NoError(t, err)
	assert.NotNil(t, state)

	// disp 應收到 client_left 廣播
	received := readMessage(t, disp, 200*time.Millisecond)
	require.NotNil(t, received, "剩餘 client 應收到 client_left 廣播")
	assert.Equal(t, MsgClientLeft, received.Type)

	var payload ClientEventPayload
	require.NoError(t, json.Unmarshal(received.Payload, &payload))
	assert.Equal(t, ctrl.id, payload.ClientID)
	assert.Equal(t, RoleController, payload.Role)
}

// ─────────────────────────────────────────────────────────────────────────────
// NewSessionState 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestNewSessionState_DefaultValues(t *testing.T) {
	state := NewSessionState("test-session")

	assert.Equal(t, "test-session", state.SessionID)
	assert.Nil(t, state.CurrentSong, "CurrentSong 預設應為 nil")
	assert.Equal(t, 0, state.CurrentLineIndex)
	assert.False(t, state.IsPlaying)
	assert.Equal(t, 0, state.ControllerCount)
	assert.Equal(t, 0, state.DisplayCount)

	// 驗證 Settings 預設值
	s := state.Settings
	assert.Equal(t, 4, s.DisplayLines)
	assert.Equal(t, 24, s.FontSize)
	assert.Equal(t, "Inter", s.FontFamily)
	assert.Equal(t, 0.5, s.LineSpacing)
	assert.Equal(t, "dark", s.Theme)
	assert.True(t, s.ShowBackground)
	assert.Equal(t, "#000000", s.BackgroundColor)
	assert.Equal(t, "#ffffff", s.TextColor)
	assert.Equal(t, "#0ea5e9", s.HighlightColor)
	assert.True(t, s.AutoScroll)
	assert.Equal(t, 300, s.ScrollDuration)
	assert.True(t, s.EnableAnimation)

	// 驗證 timestamp 已設定
	assert.Greater(t, state.CreatedAt, int64(0))
	assert.Greater(t, state.UpdatedAt, int64(0))
}

// ─────────────────────────────────────────────────────────────────────────────
// sendJSON / broadcastJSON 輔助方法測試
// ─────────────────────────────────────────────────────────────────────────────

func TestSendError(t *testing.T) {
	handler, hub := newTestEventHandler(t)
	client := NewClient(hub, nil, handler)

	handler.sendError(client, "測試錯誤訊息")

	received := readMessage(t, client, 100*time.Millisecond)
	require.NotNil(t, received)
	assert.Equal(t, MsgError, received.Type)

	var errPayload ErrorPayload
	require.NoError(t, json.Unmarshal(received.Payload, &errPayload))
	assert.Equal(t, "測試錯誤訊息", errPayload.Message)
}
