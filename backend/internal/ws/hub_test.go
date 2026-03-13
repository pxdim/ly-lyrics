// Package ws_test 測試 WebSocket Hub 的核心功能。
// 所有測試均不使用真實 WebSocket 連線，透過 NewClient(hub, nil, nil) 建立測試用 client。
package ws

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// newTestClient 建立不需要真實 WebSocket 連線的測試用 client
func newTestClient(hub *Hub) *Client {
	return NewClient(hub, nil, nil)
}

// drainSend 從 client 的 send 通道讀取所有待傳訊息，回傳讀取到的訊息清單
func drainSend(client *Client, timeout time.Duration) [][]byte {
	var messages [][]byte
	deadline := time.After(timeout)
	for {
		select {
		case msg, ok := <-client.send:
			if !ok {
				return messages
			}
			messages = append(messages, msg)
		case <-deadline:
			return messages
		}
	}
}

// TestHub_RegisterAndUnregister 驗證 client 可以成功註冊並取消註冊
func TestHub_RegisterAndUnregister(t *testing.T) {
	hub := NewHub()
	go hub.Run()

	client := newTestClient(hub)

	// 註冊 client
	hub.Register(client)

	// 等待 Run() goroutine 處理
	time.Sleep(10 * time.Millisecond)

	hub.mu.RLock()
	_, exists := hub.clients[client]
	hub.mu.RUnlock()
	assert.True(t, exists, "client 應已存在於 hub.clients")

	// 取消註冊（透過 unregister channel）
	hub.unregister <- client

	time.Sleep(10 * time.Millisecond)

	hub.mu.RLock()
	_, exists = hub.clients[client]
	hub.mu.RUnlock()
	assert.False(t, exists, "client 應已從 hub.clients 移除")
}

// TestHub_JoinSession 驗證 client 可以加入指定 session
func TestHub_JoinSession(t *testing.T) {
	hub := NewHub()
	client := newTestClient(hub)

	hub.JoinSession(client, "session-001")

	hub.mu.RLock()
	sessionClients, sessionExists := hub.sessions["session-001"]
	_, clientExists := sessionClients[client]
	hub.mu.RUnlock()

	assert.True(t, sessionExists, "session-001 應已建立")
	assert.True(t, clientExists, "client 應已加入 session-001")
	assert.Equal(t, "session-001", client.sessionID)
}

// TestHub_JoinSessionMultiple 驗證多個 client 可以加入同一 session
func TestHub_JoinSessionMultiple(t *testing.T) {
	hub := NewHub()
	clientA := newTestClient(hub)
	clientB := newTestClient(hub)

	hub.JoinSession(clientA, "session-multi")
	hub.JoinSession(clientB, "session-multi")

	hub.mu.RLock()
	sessionClients := hub.sessions["session-multi"]
	hub.mu.RUnlock()

	require.NotNil(t, sessionClients)
	assert.Len(t, sessionClients, 2, "session 應有 2 個 client")
	assert.True(t, sessionClients[clientA], "clientA 應在 session 中")
	assert.True(t, sessionClients[clientB], "clientB 應在 session 中")
}

// TestHub_LeaveSession 驗證 client 離開 session 後從 session 中被移除
func TestHub_LeaveSession(t *testing.T) {
	hub := NewHub()
	clientA := newTestClient(hub)
	clientB := newTestClient(hub)

	hub.JoinSession(clientA, "session-leave")
	hub.JoinSession(clientB, "session-leave")

	hub.LeaveSession(clientA)

	hub.mu.RLock()
	sessionClients := hub.sessions["session-leave"]
	hub.mu.RUnlock()

	require.NotNil(t, sessionClients, "session 應仍存在（還有 clientB）")
	assert.False(t, sessionClients[clientA], "clientA 應已離開 session")
	assert.True(t, sessionClients[clientB], "clientB 應仍在 session 中")
	assert.Equal(t, "", clientA.sessionID, "clientA.sessionID 應被清空")
}

// TestHub_LeaveSessionLastClient 驗證最後一個 client 離開後 session 應被清理
func TestHub_LeaveSessionLastClient(t *testing.T) {
	hub := NewHub()
	client := newTestClient(hub)

	hub.JoinSession(client, "session-last")

	hub.mu.RLock()
	_, exists := hub.sessions["session-last"]
	hub.mu.RUnlock()
	require.True(t, exists, "session 應已存在")

	hub.LeaveSession(client)

	hub.mu.RLock()
	_, exists = hub.sessions["session-last"]
	hub.mu.RUnlock()
	assert.False(t, exists, "session 應在最後一個 client 離開後被清理")
}

// TestHub_BroadcastToSession 驗證廣播訊息能送達 session 內所有 client
func TestHub_BroadcastToSession(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond) // 等待 Run() 啟動

	clientA := newTestClient(hub)
	clientB := newTestClient(hub)

	hub.Register(clientA)
	hub.Register(clientB)
	time.Sleep(10 * time.Millisecond)

	hub.JoinSession(clientA, "session-broadcast")
	hub.JoinSession(clientB, "session-broadcast")

	msg := []byte(`{"type":"test","payload":"hello"}`)
	hub.BroadcastToSession("session-broadcast", msg, nil)

	// 等待廣播處理
	time.Sleep(20 * time.Millisecond)

	// 從 send 通道讀取訊息（設定短暫 timeout 避免阻塞）
	msgsA := drainSend(clientA, 50*time.Millisecond)
	msgsB := drainSend(clientB, 50*time.Millisecond)

	assert.Len(t, msgsA, 1, "clientA 應收到 1 則廣播訊息")
	assert.Len(t, msgsB, 1, "clientB 應收到 1 則廣播訊息")
	assert.Equal(t, msg, msgsA[0])
	assert.Equal(t, msg, msgsB[0])
}

// TestHub_BroadcastExcludeSender 驗證廣播時可排除指定的發送者 client
func TestHub_BroadcastExcludeSender(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	sender := newTestClient(hub)
	receiver := newTestClient(hub)

	hub.Register(sender)
	hub.Register(receiver)
	time.Sleep(10 * time.Millisecond)

	hub.JoinSession(sender, "session-exclude")
	hub.JoinSession(receiver, "session-exclude")

	msg := []byte(`{"type":"change_line","payload":{"lineIndex":3}}`)
	hub.BroadcastToSession("session-exclude", msg, sender)

	time.Sleep(20 * time.Millisecond)

	msgsS := drainSend(sender, 50*time.Millisecond)
	msgsR := drainSend(receiver, 50*time.Millisecond)

	assert.Len(t, msgsS, 0, "sender 不應收到自己發送的廣播訊息")
	assert.Len(t, msgsR, 1, "receiver 應收到廣播訊息")
}

// TestHub_SendToClient 驗證 SendToClient 只有目標 client 收到訊息
func TestHub_SendToClient(t *testing.T) {
	hub := NewHub()
	target := newTestClient(hub)
	other := newTestClient(hub)

	msg := []byte(`{"type":"session_state","payload":{}}`)
	hub.SendToClient(target, msg)

	msgsTarget := drainSend(target, 50*time.Millisecond)
	msgsOther := drainSend(other, 50*time.Millisecond)

	assert.Len(t, msgsTarget, 1, "target 應收到訊息")
	assert.Equal(t, msg, msgsTarget[0])
	assert.Len(t, msgsOther, 0, "other client 不應收到訊息")
}

// TestHub_GetSessionCounts 驗證 GetSessionCounts 回傳正確的 controller 與 display 數量
func TestHub_GetSessionCounts(t *testing.T) {
	hub := NewHub()

	ctrl1 := newTestClient(hub)
	ctrl2 := newTestClient(hub)
	disp1 := newTestClient(hub)
	disp2 := newTestClient(hub)
	disp3 := newTestClient(hub)

	ctrl1.role = RoleController
	ctrl2.role = RoleController
	disp1.role = RoleDisplay
	disp2.role = RoleDisplay
	disp3.role = RoleDisplay

	hub.JoinSession(ctrl1, "session-counts")
	hub.JoinSession(ctrl2, "session-counts")
	hub.JoinSession(disp1, "session-counts")
	hub.JoinSession(disp2, "session-counts")
	hub.JoinSession(disp3, "session-counts")

	controllers, displays := hub.GetSessionCounts("session-counts")

	assert.Equal(t, 2, controllers, "controller 數量應為 2")
	assert.Equal(t, 3, displays, "display 數量應為 3")
}

// TestHub_CrossSessionIsolation 驗證不同 session 之間的訊息不會互相洩漏
func TestHub_CrossSessionIsolation(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	clientA := newTestClient(hub)
	clientB := newTestClient(hub)

	hub.Register(clientA)
	hub.Register(clientB)
	time.Sleep(10 * time.Millisecond)

	hub.JoinSession(clientA, "session-alpha")
	hub.JoinSession(clientB, "session-beta")

	msgAlpha := []byte(`{"type":"line_changed","payload":{"lineIndex":1}}`)
	hub.BroadcastToSession("session-alpha", msgAlpha, nil)

	time.Sleep(20 * time.Millisecond)

	msgsA := drainSend(clientA, 50*time.Millisecond)
	msgsB := drainSend(clientB, 50*time.Millisecond)

	assert.Len(t, msgsA, 1, "session-alpha 的 clientA 應收到訊息")
	assert.Len(t, msgsB, 0, "session-beta 的 clientB 不應收到 session-alpha 的訊息")
}
