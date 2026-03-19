// Package ws_test 測試 WebSocket Hub 的核心功能。
// 所有測試均不使用真實 WebSocket 連線，透過 NewClient(hub, nil, nil) 建立測試用 client。
package ws

import (
	"fmt"
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

// TestHub_JoinSession_SwitchSession 驗證 client 從舊 session 切換到新 session 時，自動離開舊 session
func TestHub_JoinSession_SwitchSession(t *testing.T) {
	hub := NewHub()
	client := newTestClient(hub)

	// 先加入 session-A
	hub.JoinSession(client, "session-A")

	hub.mu.RLock()
	_, existsA := hub.sessions["session-A"][client]
	hub.mu.RUnlock()
	assert.True(t, existsA, "client 應在 session-A 中")

	// 切換到 session-B
	hub.JoinSession(client, "session-B")

	hub.mu.RLock()
	// 舊 session 應被清理（最後一個 client 離開）
	_, oldSessionExists := hub.sessions["session-A"]
	_, existsB := hub.sessions["session-B"][client]
	hub.mu.RUnlock()

	assert.False(t, oldSessionExists, "session-A 應在最後一個 client 離開後被清理")
	assert.True(t, existsB, "client 應在 session-B 中")
	assert.Equal(t, "session-B", client.sessionID)
}

// TestHub_JoinSession_SwitchSessionOldSessionNotEmpty 驗證切換 session 時，舊 session 仍有其他 client 不會被清理
func TestHub_JoinSession_SwitchSessionOldSessionNotEmpty(t *testing.T) {
	hub := NewHub()
	clientA := newTestClient(hub)
	clientB := newTestClient(hub)

	// 兩個 client 都加入 session-old
	hub.JoinSession(clientA, "session-old")
	hub.JoinSession(clientB, "session-old")

	// clientA 切換到 session-new
	hub.JoinSession(clientA, "session-new")

	hub.mu.RLock()
	oldClients := hub.sessions["session-old"]
	newClients := hub.sessions["session-new"]
	hub.mu.RUnlock()

	assert.Len(t, oldClients, 1, "session-old 應仍有 1 個 client")
	assert.True(t, oldClients[clientB], "clientB 應仍在 session-old 中")
	assert.Len(t, newClients, 1, "session-new 應有 1 個 client")
	assert.True(t, newClients[clientA], "clientA 應在 session-new 中")
}

// TestHub_JoinSession_SameSession 驗證重複加入相同 session 不會產生副作用
func TestHub_JoinSession_SameSession(t *testing.T) {
	hub := NewHub()
	client := newTestClient(hub)

	hub.JoinSession(client, "session-same")
	hub.JoinSession(client, "session-same") // 重複加入

	hub.mu.RLock()
	sessionClients := hub.sessions["session-same"]
	hub.mu.RUnlock()

	assert.Len(t, sessionClients, 1, "重複加入同一 session 不應導致重複計數")
	assert.Equal(t, "session-same", client.sessionID)
}

// TestHub_LeaveSession_NotInSession 驗證未加入 session 的 client 離開不會 panic
func TestHub_LeaveSession_NotInSession(t *testing.T) {
	hub := NewHub()
	client := newTestClient(hub)

	// client 未加入任何 session，呼叫 LeaveSession 不應 panic
	assert.NotPanics(t, func() {
		hub.LeaveSession(client)
	})
	assert.Equal(t, "", client.sessionID)
}

// TestHub_UnregisterWithSession 驗證帶有 session 的 client 被 unregister 時，session 也會被清理
func TestHub_UnregisterWithSession(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	client := newTestClient(hub)
	hub.Register(client)
	time.Sleep(10 * time.Millisecond)

	hub.JoinSession(client, "session-unreg")

	hub.mu.RLock()
	_, sessionExists := hub.sessions["session-unreg"]
	hub.mu.RUnlock()
	require.True(t, sessionExists, "session 應存在")

	// 發送 unregister
	hub.unregister <- client
	time.Sleep(10 * time.Millisecond)

	hub.mu.RLock()
	_, clientExists := hub.clients[client]
	_, sessionStillExists := hub.sessions["session-unreg"]
	hub.mu.RUnlock()

	assert.False(t, clientExists, "client 應已從 hub.clients 移除")
	assert.False(t, sessionStillExists, "session 應在最後一個 client unregister 後被清理")
}

// TestHub_UnregisterWithSessionNotEmpty 驗證 unregister 時 session 仍有其他 client 不會被清理
func TestHub_UnregisterWithSessionNotEmpty(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	clientA := newTestClient(hub)
	clientB := newTestClient(hub)
	hub.Register(clientA)
	hub.Register(clientB)
	time.Sleep(10 * time.Millisecond)

	hub.JoinSession(clientA, "session-partial")
	hub.JoinSession(clientB, "session-partial")

	// unregister clientA
	hub.unregister <- clientA
	time.Sleep(10 * time.Millisecond)

	hub.mu.RLock()
	sessionClients := hub.sessions["session-partial"]
	hub.mu.RUnlock()

	require.NotNil(t, sessionClients, "session 應仍存在（還有 clientB）")
	assert.Len(t, sessionClients, 1, "session 應只剩 1 個 client")
	assert.True(t, sessionClients[clientB], "clientB 應仍在 session 中")
}

// TestHub_UnregisterNonexistentClient 驗證對未註冊的 client 執行 unregister 不會 panic
func TestHub_UnregisterNonexistentClient(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	client := newTestClient(hub)

	// 未註冊的 client 直接 unregister，不應 panic
	assert.NotPanics(t, func() {
		hub.unregister <- client
		time.Sleep(10 * time.Millisecond)
	})
}

// TestHub_GetSessionCounts_EmptySession 驗證不存在的 session 計數為 0
func TestHub_GetSessionCounts_EmptySession(t *testing.T) {
	hub := NewHub()

	controllers, displays := hub.GetSessionCounts("nonexistent-session")

	assert.Equal(t, 0, controllers, "不存在的 session 的 controller 計數應為 0")
	assert.Equal(t, 0, displays, "不存在的 session 的 display 計數應為 0")
}

// TestHub_GetSessionCounts_AdminRole 驗證 admin 角色不計入 controller 或 display
func TestHub_GetSessionCounts_AdminRole(t *testing.T) {
	hub := NewHub()

	admin := newTestClient(hub)
	ctrl := newTestClient(hub)
	admin.role = RoleAdmin
	ctrl.role = RoleController

	hub.JoinSession(admin, "session-admin")
	hub.JoinSession(ctrl, "session-admin")

	controllers, displays := hub.GetSessionCounts("session-admin")

	assert.Equal(t, 1, controllers, "controller 計數應為 1")
	assert.Equal(t, 0, displays, "display 計數應為 0（admin 不算）")
}

// TestHub_SendToClient_BufferFull 驗證 send buffer 滿時 SendToClient 不會阻塞
func TestHub_SendToClient_BufferFull(t *testing.T) {
	hub := NewHub()
	client := newTestClient(hub)

	// 填滿 send buffer
	for i := 0; i < sendBufferSize; i++ {
		client.send <- []byte("fill")
	}

	// buffer 滿時發送不應阻塞（應觸發 default 分支記錄警告）
	done := make(chan struct{})
	go func() {
		hub.SendToClient(client, []byte("overflow"))
		close(done)
	}()

	select {
	case <-done:
		// 成功，未阻塞
	case <-time.After(1 * time.Second):
		t.Fatal("SendToClient 在 buffer 滿時不應阻塞")
	}
}

// TestHub_BroadcastToNonexistentSession 驗證對不存在的 session 廣播不會 panic
func TestHub_BroadcastToNonexistentSession(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	msg := []byte(`{"type":"test"}`)
	assert.NotPanics(t, func() {
		hub.BroadcastToSession("nonexistent", msg, nil)
		time.Sleep(10 * time.Millisecond)
	})
}

// TestHub_BroadcastOverflow 驗證廣播時 send buffer 溢位的 client 會被清理
func TestHub_BroadcastOverflow(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	normalClient := newTestClient(hub)
	overflowClient := newTestClient(hub)

	hub.Register(normalClient)
	hub.Register(overflowClient)
	time.Sleep(10 * time.Millisecond)

	hub.JoinSession(normalClient, "session-overflow")
	hub.JoinSession(overflowClient, "session-overflow")

	// 填滿 overflowClient 的 send buffer
	for i := 0; i < sendBufferSize; i++ {
		overflowClient.send <- []byte("fill")
	}

	// 廣播時 overflowClient 應因 buffer 滿而被清理
	hub.BroadcastToSession("session-overflow", []byte(`{"type":"test"}`), nil)
	time.Sleep(50 * time.Millisecond)

	hub.mu.RLock()
	_, overflowExists := hub.clients[overflowClient]
	_, normalExists := hub.clients[normalClient]
	hub.mu.RUnlock()

	assert.False(t, overflowExists, "溢位的 client 應被從 hub.clients 移除")
	assert.True(t, normalExists, "正常的 client 應仍在 hub.clients 中")
}

// TestHub_ConcurrentJoinLeave 驗證多 goroutine 同時操作 JoinSession/LeaveSession 不會 race condition
func TestHub_ConcurrentJoinLeave(t *testing.T) {
	hub := NewHub()
	const numClients = 50

	clients := make([]*Client, numClients)
	for i := 0; i < numClients; i++ {
		clients[i] = newTestClient(hub)
	}

	// 並發加入同一 session
	done := make(chan struct{})
	for i := 0; i < numClients; i++ {
		go func(c *Client) {
			hub.JoinSession(c, "session-concurrent")
			done <- struct{}{}
		}(clients[i])
	}
	for i := 0; i < numClients; i++ {
		<-done
	}

	hub.mu.RLock()
	count := len(hub.sessions["session-concurrent"])
	hub.mu.RUnlock()
	assert.Equal(t, numClients, count, "所有 client 都應加入 session")

	// 並發離開
	for i := 0; i < numClients; i++ {
		go func(c *Client) {
			hub.LeaveSession(c)
			done <- struct{}{}
		}(clients[i])
	}
	for i := 0; i < numClients; i++ {
		<-done
	}

	hub.mu.RLock()
	_, sessionExists := hub.sessions["session-concurrent"]
	hub.mu.RUnlock()
	assert.False(t, sessionExists, "所有 client 離開後 session 應被清理")
}

// TestHub_ConcurrentRegisterUnregister 驗證多 goroutine 同時 Register/Unregister 不會 race condition
func TestHub_ConcurrentRegisterUnregister(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	const numClients = 50
	clients := make([]*Client, numClients)
	for i := 0; i < numClients; i++ {
		clients[i] = newTestClient(hub)
	}

	// 並發註冊
	for _, c := range clients {
		hub.Register(c)
	}
	time.Sleep(50 * time.Millisecond)

	hub.mu.RLock()
	registeredCount := len(hub.clients)
	hub.mu.RUnlock()
	assert.Equal(t, numClients, registeredCount, "所有 client 應已註冊")

	// 並發取消註冊
	for _, c := range clients {
		hub.unregister <- c
	}
	time.Sleep(50 * time.Millisecond)

	hub.mu.RLock()
	remainingCount := len(hub.clients)
	hub.mu.RUnlock()
	assert.Equal(t, 0, remainingCount, "所有 client 應已取消註冊")
}

// TestHub_ConcurrentBroadcast 驗證多 goroutine 同時廣播不會 race condition
func TestHub_ConcurrentBroadcast(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	const numClients = 10
	clients := make([]*Client, numClients)
	for i := 0; i < numClients; i++ {
		clients[i] = newTestClient(hub)
		hub.Register(clients[i])
	}
	time.Sleep(20 * time.Millisecond)

	for _, c := range clients {
		hub.JoinSession(c, "session-concurrent-broadcast")
	}

	// 並發廣播 20 則訊息
	const numMessages = 20
	done := make(chan struct{})
	for i := 0; i < numMessages; i++ {
		go func(idx int) {
			msg := []byte(fmt.Sprintf(`{"type":"test","idx":%d}`, idx))
			hub.BroadcastToSession("session-concurrent-broadcast", msg, nil)
			done <- struct{}{}
		}(i)
	}
	for i := 0; i < numMessages; i++ {
		<-done
	}

	time.Sleep(50 * time.Millisecond)

	// 每個 client 都應收到 20 則訊息
	for i, c := range clients {
		msgs := drainSend(c, 50*time.Millisecond)
		assert.Equal(t, numMessages, len(msgs), "client[%d] 應收到 %d 則訊息", i, numMessages)
	}
}

// TestHub_GetSessionCounts_AfterLeave 驗證 client 離開 session 後計數正確更新
func TestHub_GetSessionCounts_AfterLeave(t *testing.T) {
	hub := NewHub()

	ctrl := newTestClient(hub)
	disp1 := newTestClient(hub)
	disp2 := newTestClient(hub)

	ctrl.role = RoleController
	disp1.role = RoleDisplay
	disp2.role = RoleDisplay

	hub.JoinSession(ctrl, "session-count-leave")
	hub.JoinSession(disp1, "session-count-leave")
	hub.JoinSession(disp2, "session-count-leave")

	// 驗證初始計數
	controllers, displays := hub.GetSessionCounts("session-count-leave")
	assert.Equal(t, 1, controllers)
	assert.Equal(t, 2, displays)

	// disp1 離開
	hub.LeaveSession(disp1)

	controllers, displays = hub.GetSessionCounts("session-count-leave")
	assert.Equal(t, 1, controllers, "離開後 controller 數量不變")
	assert.Equal(t, 1, displays, "離開後 display 數量應減 1")
}

// TestHub_MultipleSessions 驗證 Hub 可同時管理多個 session
func TestHub_MultipleSessions(t *testing.T) {
	hub := NewHub()
	go hub.Run()
	time.Sleep(5 * time.Millisecond)

	clientA := newTestClient(hub)
	clientB := newTestClient(hub)
	clientC := newTestClient(hub)

	hub.Register(clientA)
	hub.Register(clientB)
	hub.Register(clientC)
	time.Sleep(10 * time.Millisecond)

	hub.JoinSession(clientA, "session-1")
	hub.JoinSession(clientB, "session-2")
	hub.JoinSession(clientC, "session-1")

	// 向 session-1 廣播
	msg1 := []byte(`{"type":"msg","session":"1"}`)
	hub.BroadcastToSession("session-1", msg1, nil)

	// 向 session-2 廣播
	msg2 := []byte(`{"type":"msg","session":"2"}`)
	hub.BroadcastToSession("session-2", msg2, nil)

	time.Sleep(30 * time.Millisecond)

	msgsA := drainSend(clientA, 50*time.Millisecond)
	msgsB := drainSend(clientB, 50*time.Millisecond)
	msgsC := drainSend(clientC, 50*time.Millisecond)

	assert.Len(t, msgsA, 1, "clientA 只收到 session-1 的訊息")
	assert.Equal(t, msg1, msgsA[0])

	assert.Len(t, msgsB, 1, "clientB 只收到 session-2 的訊息")
	assert.Equal(t, msg2, msgsB[0])

	assert.Len(t, msgsC, 1, "clientC 只收到 session-1 的訊息")
	assert.Equal(t, msg1, msgsC[0])
}

// TestNewHub 驗證 NewHub 建立的 Hub 各欄位正確初始化
func TestNewHub(t *testing.T) {
	hub := NewHub()

	assert.NotNil(t, hub.clients, "clients map 應已初始化")
	assert.NotNil(t, hub.sessions, "sessions map 應已初始化")
	assert.NotNil(t, hub.register, "register channel 應已初始化")
	assert.NotNil(t, hub.unregister, "unregister channel 應已初始化")
	assert.NotNil(t, hub.broadcast, "broadcast channel 應已初始化")
	assert.Empty(t, hub.clients, "初始 clients 應為空")
	assert.Empty(t, hub.sessions, "初始 sessions 應為空")
}

// TestNewClient_Fields 驗證 NewClient 建立的 Client 各欄位正確初始化
func TestNewClient_Fields(t *testing.T) {
	hub := NewHub()
	client := NewClient(hub, nil, nil)

	assert.NotEmpty(t, client.id, "client ID 不應為空")
	assert.Equal(t, hub, client.hub, "client.hub 應指向建立時傳入的 hub")
	assert.NotNil(t, client.send, "send channel 應已初始化")
	assert.Equal(t, "", client.sessionID, "初始 sessionID 應為空字串")
	assert.Equal(t, ClientRole(""), client.role, "初始 role 應為空")
	assert.Nil(t, client.userID, "初始 userID 應為 nil")
}

// TestNewClient_UniqueIDs 驗證每次建立的 Client 都有唯一 ID
func TestNewClient_UniqueIDs(t *testing.T) {
	hub := NewHub()
	ids := make(map[string]bool)

	for i := 0; i < 100; i++ {
		c := NewClient(hub, nil, nil)
		assert.False(t, ids[c.id], "第 %d 個 client 的 ID 不應重複", i)
		ids[c.id] = true
	}
}
