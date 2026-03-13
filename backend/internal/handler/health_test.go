// Package handler_test 測試健康檢查 HTTP handler。
package handler_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/stretchr/testify/assert"
)

// ────────────────────────────────────────────────────────────
// Mock DBPinger
// ────────────────────────────────────────────────────────────

// mockDBPinger 實作 handler.DBPinger 介面，用於測試隔離
type mockDBPinger struct {
	// pingErr 若不為 nil，表示 Ping 失敗
	pingErr error
}

func (m *mockDBPinger) PingContext(_ context.Context) error {
	return m.pingErr
}

// ────────────────────────────────────────────────────────────
// Check 測試
// ────────────────────────────────────────────────────────────

func TestHealthCheck_DBOk(t *testing.T) {
	// Ping 成功，狀態應為 ok
	mock := &mockDBPinger{pingErr: nil}
	h := handler.NewHealthWithPinger(mock)

	req := httptest.NewRequest("GET", "/api/go-health", nil)
	rr := executeRequest(h.Check, req)

	assertStatus(t, rr, http.StatusOK)
	var resp map[string]any
	decodeJSON(t, rr, &resp)
	assert.Equal(t, "ok", resp["status"], "DB 正常時狀態應為 ok")
	assert.Equal(t, "connected", resp["database"], "DB 連線狀態應為 connected")
	assert.Equal(t, "ly-go-backend", resp["service"])
	assert.NotEmpty(t, resp["timestamp"])
}

func TestHealthCheck_DBError(t *testing.T) {
	// Ping 失敗，狀態應為 degraded
	mock := &mockDBPinger{pingErr: errors.New("connection refused")}
	h := handler.NewHealthWithPinger(mock)

	req := httptest.NewRequest("GET", "/api/go-health", nil)
	rr := executeRequest(h.Check, req)

	// health check 永遠回傳 200，只是 status 欄位不同
	assertStatus(t, rr, http.StatusOK)
	var resp map[string]any
	decodeJSON(t, rr, &resp)
	assert.Equal(t, "degraded", resp["status"], "DB 失敗時狀態應為 degraded")
	assert.Equal(t, "disconnected", resp["database"], "DB 連線狀態應為 disconnected")
}
