// Package ws 實作 WebSocket 即時通訊功能。
// 此檔案負責 WebSocket 事件處理，包含所有 C2S 訊息的業務邏輯。
package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	lyredis "github.com/raymondchen/ly-backend/internal/redis"
	"github.com/raymondchen/ly-backend/internal/service"
)

// EventHandler 處理所有 WebSocket 事件
type EventHandler struct {
	hub         *Hub
	redisClient *lyredis.Client
	songService *service.SongService
}

// NewEventHandler 建立新的事件處理器
func NewEventHandler(hub *Hub, redisClient *lyredis.Client, songService *service.SongService) *EventHandler {
	return &EventHandler{
		hub:         hub,
		redisClient: redisClient,
		songService: songService,
	}
}

// HandleMessage 根據訊息類型分派至對應的處理函式
func (h *EventHandler) HandleMessage(client *Client, msg *Message) {
	ctx := context.Background()

	switch msg.Type {
	case MsgJoinSession:
		h.handleJoinSession(ctx, client, msg.Payload)
	case MsgLeaveSession:
		h.handleLeaveSession(ctx, client)
	case MsgChangeLine:
		h.handleChangeLine(ctx, client, msg.Payload)
	case MsgNextLine:
		h.handleNextLine(ctx, client)
	case MsgPrevLine:
		h.handlePrevLine(ctx, client)
	case MsgSetSong:
		h.handleSetSong(ctx, client, msg.Payload)
	case MsgUpdateSettings:
		h.handleUpdateSettings(ctx, client, msg.Payload)
	case MsgSetPlaying:
		h.handleSetPlaying(ctx, client, msg.Payload)
	default:
		h.sendError(client, "未知的訊息類型: "+string(msg.Type))
	}
}

// HandleDisconnect 處理客戶端斷線，清理 Redis 與 Hub 狀態
func (h *EventHandler) HandleDisconnect(client *Client) {
	if client.sessionID == "" {
		return
	}

	ctx := context.Background()
	sessionID := client.sessionID

	// 從 Redis 移除 client
	if err := h.redisClient.RemoveClient(ctx, sessionID, client.id); err != nil {
		slog.Error("移除 client 失敗", "error", err)
	}

	// 檢查 session 是否還有其他 client
	hasClients, err := h.redisClient.HasClients(ctx, sessionID)
	if err != nil {
		slog.Error("檢查 clients 失敗", "error", err)
		return
	}

	// 無其他 client 時清理 session
	if !hasClients {
		if err := h.redisClient.DeleteSession(ctx, sessionID); err != nil {
			slog.Error("刪除 session 失敗", "error", err)
		}
		return
	}

	// 更新 session 中的連線計數
	controllers, displays := h.hub.GetSessionCounts(sessionID)
	state, _ := h.redisClient.GetSession(ctx, sessionID)
	if state != nil {
		state.ControllerCount = controllers
		state.DisplayCount = displays
		_ = h.redisClient.SetSession(ctx, state)
	}

	// 廣播 client_left 事件
	h.broadcastJSON(sessionID, MsgClientLeft, ClientEventPayload{
		ClientID:        client.id,
		Role:            client.role,
		ControllerCount: controllers,
		DisplayCount:    displays,
	}, nil)
}

// handleJoinSession 處理加入 session
// 注意：lyredis.ClientInfo.Role 為 string，需將 ClientRole 轉型
func (h *EventHandler) handleJoinSession(ctx context.Context, client *Client, payload json.RawMessage) {
	var p JoinSessionPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		h.sendError(client, "無效的 join_session payload")
		return
	}
	if p.SessionID == "" || p.Role == "" {
		h.sendError(client, "sessionId 和 role 為必填欄位")
		return
	}

	client.role = p.Role
	client.userID = p.UserID

	// 將 client 加入 Hub 的 session 分組
	h.hub.JoinSession(client, p.SessionID)

	// 取得或建立 session 狀態
	state, err := h.redisClient.GetSession(ctx, p.SessionID)
	if err != nil {
		h.sendError(client, "無法取得 session 狀態")
		return
	}
	if state == nil {
		state = NewSessionState(p.SessionID)
	}

	// 將 client 資訊寫入 Redis（Role 為 string 型別）
	clientInfo := lyredis.ClientInfo{
		ClientID: client.id,
		Role:     string(p.Role),
		UserID:   p.UserID,
		JoinedAt: time.Now().UnixMilli(),
	}
	if err := h.redisClient.AddClient(ctx, p.SessionID, clientInfo); err != nil {
		slog.Error("加入 client 到 Redis 失敗", "error", err)
	}

	// 更新連線計數
	controllers, displays := h.hub.GetSessionCounts(p.SessionID)
	state.ControllerCount = controllers
	state.DisplayCount = displays

	if err := h.redisClient.SetSession(ctx, state); err != nil {
		slog.Error("儲存 session 失敗", "error", err)
	}

	// 回傳完整 session 狀態給加入的 client
	h.sendJSON(client, MsgSessionState, state)

	// 廣播 client_joined 事件
	h.broadcastJSON(p.SessionID, MsgClientJoined, ClientEventPayload{
		ClientID:        client.id,
		Role:            p.Role,
		ControllerCount: controllers,
		DisplayCount:    displays,
	}, nil)
}

// handleLeaveSession 處理離開 session
func (h *EventHandler) handleLeaveSession(ctx context.Context, client *Client) {
	if client.sessionID == "" {
		return
	}

	sessionID := client.sessionID

	// 從 Redis 移除 client
	if err := h.redisClient.RemoveClient(ctx, sessionID, client.id); err != nil {
		slog.Error("移除 client 失敗", "error", err)
	}

	// 檢查是否還有其他 client
	hasClients, err := h.redisClient.HasClients(ctx, sessionID)
	if err != nil {
		slog.Error("檢查 clients 失敗", "error", err)
	}

	if !hasClients {
		// 無其他 client，清理 session
		_ = h.redisClient.DeleteSession(ctx, sessionID)
	} else {
		// 更新連線計數並廣播
		controllers, displays := h.hub.GetSessionCounts(sessionID)
		state, _ := h.redisClient.GetSession(ctx, sessionID)
		if state != nil {
			state.ControllerCount = controllers
			state.DisplayCount = displays
			_ = h.redisClient.SetSession(ctx, state)
		}
		h.broadcastJSON(sessionID, MsgClientLeft, ClientEventPayload{
			ClientID:        client.id,
			Role:            client.role,
			ControllerCount: controllers,
			DisplayCount:    displays,
		}, nil)
	}

	// 從 Hub 的 session 分組中移除
	h.hub.LeaveSession(client)
}

// handleChangeLine 處理指定行切換（僅 controller 可操作）
func (h *EventHandler) handleChangeLine(ctx context.Context, client *Client, payload json.RawMessage) {
	if client.role != RoleController {
		h.sendError(client, "僅 controller 可變更行號")
		return
	}

	var p ChangeLinePayload
	if err := json.Unmarshal(payload, &p); err != nil || p.LineIndex < 0 {
		h.sendError(client, "無效的 lineIndex")
		return
	}

	state, err := h.redisClient.GetSession(ctx, client.sessionID)
	if err != nil || state == nil {
		h.sendError(client, "Session 不存在")
		return
	}

	state.CurrentLineIndex = p.LineIndex
	_ = h.redisClient.SetSession(ctx, state)

	h.broadcastJSON(client.sessionID, MsgLineChanged, LineChangedPayload{
		LineIndex: p.LineIndex,
		Timestamp: time.Now().UnixMilli(),
	}, nil)
}

// handleNextLine 處理下一行（僅 controller 可操作）
func (h *EventHandler) handleNextLine(ctx context.Context, client *Client) {
	if client.role != RoleController {
		h.sendError(client, "僅 controller 可變更行號")
		return
	}

	state, err := h.redisClient.GetSession(ctx, client.sessionID)
	if err != nil || state == nil {
		return
	}

	state.CurrentLineIndex++
	_ = h.redisClient.SetSession(ctx, state)

	h.broadcastJSON(client.sessionID, MsgLineChanged, LineChangedPayload{
		LineIndex: state.CurrentLineIndex,
		Timestamp: time.Now().UnixMilli(),
	}, nil)
}

// handlePrevLine 處理上一行（僅 controller 可操作）
func (h *EventHandler) handlePrevLine(ctx context.Context, client *Client) {
	if client.role != RoleController {
		h.sendError(client, "僅 controller 可變更行號")
		return
	}

	state, err := h.redisClient.GetSession(ctx, client.sessionID)
	if err != nil || state == nil {
		return
	}

	if state.CurrentLineIndex > 0 {
		state.CurrentLineIndex--
	}
	_ = h.redisClient.SetSession(ctx, state)

	h.broadcastJSON(client.sessionID, MsgLineChanged, LineChangedPayload{
		LineIndex: state.CurrentLineIndex,
		Timestamp: time.Now().UnixMilli(),
	}, nil)
}

// handleSetSong 處理設定歌曲（僅 controller 可操作）
// 從 SongService 取得歌曲資料後轉換為 SessionSong 格式
func (h *EventHandler) handleSetSong(ctx context.Context, client *Client, payload json.RawMessage) {
	if client.role != RoleController {
		h.sendError(client, "僅 controller 可設定歌曲")
		return
	}

	var p SetSongPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		h.sendError(client, "無效的 set_song payload")
		return
	}

	songID, err := uuid.Parse(p.SongID)
	if err != nil {
		h.sendError(client, "無效的 songId 格式")
		return
	}

	songResp, err := h.songService.GetByID(ctx, songID)
	if err != nil {
		h.sendError(client, "取得歌曲失敗")
		return
	}
	if songResp == nil {
		h.sendError(client, "歌曲不存在")
		return
	}

	// 將 dto.SongResponse 轉換為 lyredis.SessionSong
	sessionSong := &lyredis.SessionSong{
		ID:            songResp.ID.String(),
		Title:         songResp.Title,
		Artist:        songResp.Artist,
		Lyrics:        songResp.Lyrics,
		LrcTimestamps: songResp.LrcTimestamps,
		Language:      songResp.Language,
		UserID:        songResp.UserID.String(),
		CreatedAt:     songResp.CreatedAt.Format(time.RFC3339Nano),
		UpdatedAt:     songResp.UpdatedAt.Format(time.RFC3339Nano),
	}

	state, _ := h.redisClient.GetSession(ctx, client.sessionID)
	if state == nil {
		state = NewSessionState(client.sessionID)
	}

	state.CurrentSong = sessionSong
	state.CurrentLineIndex = 0
	_ = h.redisClient.SetSession(ctx, state)

	h.broadcastJSON(client.sessionID, MsgSongChanged, SongChangedPayload{
		SongID:    p.SongID,
		Song:      sessionSong,
		Timestamp: time.Now().UnixMilli(),
	}, nil)
}

// handleUpdateSettings 處理更新設定（僅 controller 可操作）
// 使用 partial update，僅更新有提供的欄位
func (h *EventHandler) handleUpdateSettings(ctx context.Context, client *Client, payload json.RawMessage) {
	if client.role != RoleController {
		h.sendError(client, "僅 controller 可更新設定")
		return
	}

	var p UpdateSettingsPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		h.sendError(client, "無效的 settings payload")
		return
	}

	state, _ := h.redisClient.GetSession(ctx, client.sessionID)
	if state == nil {
		state = NewSessionState(client.sessionID)
	}

	// 僅更新有提供的欄位（partial update）
	s := &state.Settings
	if p.DisplayLines != nil {
		s.DisplayLines = *p.DisplayLines
	}
	if p.FontSize != nil {
		s.FontSize = *p.FontSize
	}
	if p.FontFamily != nil {
		s.FontFamily = *p.FontFamily
	}
	if p.Theme != nil {
		s.Theme = *p.Theme
	}
	if p.ShowBackground != nil {
		s.ShowBackground = *p.ShowBackground
	}
	if p.BackgroundColor != nil {
		s.BackgroundColor = *p.BackgroundColor
	}
	if p.TextColor != nil {
		s.TextColor = *p.TextColor
	}
	if p.HighlightColor != nil {
		s.HighlightColor = *p.HighlightColor
	}
	if p.AutoScroll != nil {
		s.AutoScroll = *p.AutoScroll
	}
	if p.ScrollDuration != nil {
		s.ScrollDuration = *p.ScrollDuration
	}
	if p.EnableAnimation != nil {
		s.EnableAnimation = *p.EnableAnimation
	}

	_ = h.redisClient.SetSession(ctx, state)

	h.broadcastJSON(client.sessionID, MsgSettingsUpdated, SettingsUpdatedPayload{
		Settings:  state.Settings,
		Timestamp: time.Now().UnixMilli(),
	}, nil)
}

// handleSetPlaying 處理播放狀態切換（僅 controller 可操作）
func (h *EventHandler) handleSetPlaying(ctx context.Context, client *Client, payload json.RawMessage) {
	if client.role != RoleController {
		h.sendError(client, "僅 controller 可設定播放狀態")
		return
	}

	var p SetPlayingPayload
	if err := json.Unmarshal(payload, &p); err != nil {
		h.sendError(client, "無效的 set_playing payload")
		return
	}

	state, _ := h.redisClient.GetSession(ctx, client.sessionID)
	if state == nil {
		return
	}

	state.IsPlaying = p.IsPlaying
	_ = h.redisClient.SetSession(ctx, state)

	h.broadcastJSON(client.sessionID, MsgPlayingChanged, PlayingChangedPayload{
		IsPlaying: p.IsPlaying,
		Timestamp: time.Now().UnixMilli(),
	}, nil)
}

// sendJSON 將結構化訊息序列化後發送給單一 client
func (h *EventHandler) sendJSON(client *Client, msgType MessageType, payload interface{}) {
	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("序列化 payload 失敗", "error", err)
		return
	}

	msg := Message{Type: msgType, Payload: data}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		slog.Error("序列化訊息失敗", "error", err)
		return
	}

	h.hub.SendToClient(client, msgBytes)
}

// broadcastJSON 將結構化訊息序列化後廣播至指定 session
func (h *EventHandler) broadcastJSON(sessionID string, msgType MessageType, payload interface{}, exclude *Client) {
	data, err := json.Marshal(payload)
	if err != nil {
		slog.Error("序列化 payload 失敗", "error", err)
		return
	}

	msg := Message{Type: msgType, Payload: data}
	msgBytes, err := json.Marshal(msg)
	if err != nil {
		slog.Error("序列化訊息失敗", "error", err)
		return
	}

	h.hub.BroadcastToSession(sessionID, msgBytes, exclude)
}

// sendError 向 client 發送錯誤訊息
func (h *EventHandler) sendError(client *Client, message string) {
	h.sendJSON(client, MsgError, ErrorPayload{Message: message})
}
