// Package ws 實作 WebSocket 即時通訊功能。
// 此檔案定義 WebSocket 訊息協定格式與 payload 類型。
// 所有 session 相關型別皆從 redis 套件匯入，不在此重複定義。
package ws

import (
	"encoding/json"
	"time"

	lyredis "github.com/raymondchen/ly-backend/internal/redis"
)

// MessageType 定義 WebSocket 訊息類型
type MessageType string

// C2S（Client-to-Server）事件類型
const (
	MsgJoinSession    MessageType = "join_session"
	MsgLeaveSession   MessageType = "leave_session"
	MsgChangeLine     MessageType = "change_line"
	MsgNextLine       MessageType = "next_line"
	MsgPrevLine       MessageType = "prev_line"
	MsgSetSong        MessageType = "set_song"
	MsgUpdateSettings MessageType = "update_settings"
	MsgSetPlaying     MessageType = "set_playing"
)

// S2C（Server-to-Client）事件類型
const (
	MsgSessionState    MessageType = "session_state"
	MsgLineChanged     MessageType = "line_changed"
	MsgSongChanged     MessageType = "song_changed"
	MsgSettingsUpdated MessageType = "settings_updated"
	MsgPlayingChanged  MessageType = "playing_changed"
	MsgClientJoined    MessageType = "client_joined"
	MsgClientLeft      MessageType = "client_left"
	MsgError           MessageType = "error"
)

// Message 為 WebSocket 訊息信封，所有訊息都使用此格式
type Message struct {
	Type    MessageType     `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// ClientRole 定義客戶端角色
type ClientRole string

const (
	RoleController ClientRole = "controller"
	RoleDisplay    ClientRole = "display"
	RoleAdmin      ClientRole = "admin"
)

// --- C2S Payloads ---

// JoinSessionPayload 加入 session 的請求 payload
type JoinSessionPayload struct {
	SessionID string     `json:"sessionId"`
	Role      ClientRole `json:"role"`
	UserID    *string    `json:"userId,omitempty"`
}

// ChangeLinePayload 變更目前行的請求 payload
type ChangeLinePayload struct {
	LineIndex int `json:"lineIndex"`
}

// SetSongPayload 設定歌曲的請求 payload
type SetSongPayload struct {
	SongID string `json:"songId"`
}

// SetPlayingPayload 設定播放狀態的請求 payload
type SetPlayingPayload struct {
	IsPlaying bool `json:"isPlaying"`
}

// UpdateSettingsPayload 更新設定的請求 payload，所有欄位皆為可選
type UpdateSettingsPayload struct {
	DisplayLines    *int      `json:"displayLines,omitempty"`
	FontSize        *int      `json:"fontSize,omitempty"`
	FontFamily      *string   `json:"fontFamily,omitempty"`
	LineSpacing     *float64  `json:"lineSpacing,omitempty"`
	Theme           *string   `json:"theme,omitempty"`
	ShowBackground  *bool   `json:"showBackground,omitempty"`
	BackgroundColor *string `json:"backgroundColor,omitempty"`
	TextColor       *string `json:"textColor,omitempty"`
	HighlightColor  *string `json:"highlightColor,omitempty"`
	AutoScroll      *bool   `json:"autoScroll,omitempty"`
	ScrollDuration  *int    `json:"scrollDuration,omitempty"`
	EnableAnimation *bool   `json:"enableAnimation,omitempty"`
}

// --- S2C Payloads ---

// LineChangedPayload 行變更的廣播 payload
type LineChangedPayload struct {
	LineIndex int   `json:"lineIndex"`
	Timestamp int64 `json:"timestamp"`
}

// SongChangedPayload 歌曲變更的廣播 payload
type SongChangedPayload struct {
	SongID    string              `json:"songId"`
	Song      *lyredis.SessionSong `json:"song"`
	Timestamp int64               `json:"timestamp"`
}

// SettingsUpdatedPayload 設定更新的廣播 payload
type SettingsUpdatedPayload struct {
	Settings  lyredis.SessionSettings `json:"settings"`
	Timestamp int64                   `json:"timestamp"`
}

// PlayingChangedPayload 播放狀態變更的廣播 payload
type PlayingChangedPayload struct {
	IsPlaying bool  `json:"isPlaying"`
	Timestamp int64 `json:"timestamp"`
}

// ClientEventPayload 客戶端加入/離開的廣播 payload
type ClientEventPayload struct {
	ClientID        string     `json:"clientId"`
	Role            ClientRole `json:"role"`
	ControllerCount int        `json:"controllerCount"`
	DisplayCount    int        `json:"displayCount"`
}

// ErrorPayload 錯誤訊息 payload
type ErrorPayload struct {
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

// NewSessionState 建立帶有預設值的新 session 狀態
func NewSessionState(sessionID string) *lyredis.SessionState {
	now := time.Now().UnixMilli()
	return &lyredis.SessionState{
		SessionID:        sessionID,
		CurrentSong:      nil,
		CurrentLineIndex: 0,
		IsPlaying:        false,
		Settings: lyredis.SessionSettings{
			DisplayLines:    4,
			FontSize:        24,
			FontFamily:      "Inter",
			LineSpacing:     0.5,
			Theme:           "dark",
			ShowBackground:  true,
			BackgroundColor: "#000000",
			TextColor:       "#ffffff",
			HighlightColor:  "#0ea5e9",
			AutoScroll:      true,
			ScrollDuration:  300,
			EnableAnimation: true,
		},
		ControllerCount: 0,
		DisplayCount:    0,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
}
