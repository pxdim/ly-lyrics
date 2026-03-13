// Package ws_test 測試 WebSocket 協定的訊息格式與常數定義。
package ws

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestMessage_JSONSerialization 驗證 Message 能正確序列化為 JSON
func TestMessage_JSONSerialization(t *testing.T) {
	payload := map[string]interface{}{
		"lineIndex": 5,
		"timestamp": 1700000000000,
	}
	payloadBytes, err := json.Marshal(payload)
	require.NoError(t, err)

	msg := Message{
		Type:    MsgLineChanged,
		Payload: json.RawMessage(payloadBytes),
	}

	data, err := json.Marshal(msg)
	require.NoError(t, err)

	// 驗證 JSON 包含正確的 type 欄位
	var raw map[string]json.RawMessage
	err = json.Unmarshal(data, &raw)
	require.NoError(t, err)

	var msgType string
	err = json.Unmarshal(raw["type"], &msgType)
	require.NoError(t, err)
	assert.Equal(t, "line_changed", msgType, "type 欄位應為 line_changed")

	// 驗證 payload 存在
	assert.NotNil(t, raw["payload"], "payload 欄位不應為空")
}

// TestMessage_JSONDeserialization 驗證 JSON 能正確反序列化為 Message struct
func TestMessage_JSONDeserialization(t *testing.T) {
	rawJSON := `{"type":"join_session","payload":{"sessionId":"abc123","role":"controller"}}`

	var msg Message
	err := json.Unmarshal([]byte(rawJSON), &msg)
	require.NoError(t, err)

	assert.Equal(t, MsgJoinSession, msg.Type, "type 應解析為 MsgJoinSession")
	assert.NotNil(t, msg.Payload, "payload 不應為 nil")

	// 進一步反序列化 payload
	var joinPayload JoinSessionPayload
	err = json.Unmarshal(msg.Payload, &joinPayload)
	require.NoError(t, err)

	assert.Equal(t, "abc123", joinPayload.SessionID)
	assert.Equal(t, RoleController, joinPayload.Role)
}

// TestClientRole_Constants 驗證 ClientRole 常數的字串值正確
func TestClientRole_Constants(t *testing.T) {
	assert.Equal(t, ClientRole("controller"), RoleController, "RoleController 應為 'controller'")
	assert.Equal(t, ClientRole("display"), RoleDisplay, "RoleDisplay 應為 'display'")
	assert.Equal(t, ClientRole("admin"), RoleAdmin, "RoleAdmin 應為 'admin'")
}

// TestMessageTypes_Values 驗證所有 C2S 與 S2C 訊息類型常數的字串值正確
func TestMessageTypes_Values(t *testing.T) {
	// C2S 事件類型
	c2sExpected := map[MessageType]string{
		MsgJoinSession:    "join_session",
		MsgLeaveSession:   "leave_session",
		MsgChangeLine:     "change_line",
		MsgNextLine:       "next_line",
		MsgPrevLine:       "prev_line",
		MsgSetSong:        "set_song",
		MsgUpdateSettings: "update_settings",
		MsgSetPlaying:     "set_playing",
	}
	for msgType, expected := range c2sExpected {
		assert.Equal(t, MessageType(expected), msgType, "C2S 常數值應符合預期")
	}

	// S2C 事件類型
	s2cExpected := map[MessageType]string{
		MsgSessionState:    "session_state",
		MsgLineChanged:     "line_changed",
		MsgSongChanged:     "song_changed",
		MsgSettingsUpdated: "settings_updated",
		MsgPlayingChanged:  "playing_changed",
		MsgClientJoined:    "client_joined",
		MsgClientLeft:      "client_left",
		MsgError:           "error",
	}
	for msgType, expected := range s2cExpected {
		assert.Equal(t, MessageType(expected), msgType, "S2C 常數值應符合預期")
	}
}

// TestMessage_EmptyPayload 驗證 payload 為空時序列化與反序列化不會 panic
func TestMessage_EmptyPayload(t *testing.T) {
	// 空 payload 的 Message
	msg := Message{
		Type: MsgLeaveSession,
	}

	data, err := json.Marshal(msg)
	require.NoError(t, err, "序列化空 payload 的 Message 不應出錯")

	var decoded Message
	err = json.Unmarshal(data, &decoded)
	require.NoError(t, err, "反序列化不應 panic 或出錯")

	assert.Equal(t, MsgLeaveSession, decoded.Type)
	// 空 payload 經 omitempty 序列化後，反序列化結果應為 nil
	assert.Nil(t, decoded.Payload, "空 payload 反序列化後應為 nil")
}
