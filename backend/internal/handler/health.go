package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

// DBPinger 定義 Health handler 所需的資料庫 Ping 介面，便於測試時替換為 mock
type DBPinger interface {
	PingContext(ctx context.Context) error
}

// Health 健康檢查 handler
type Health struct {
	db DBPinger
}

// NewHealth 建立 Health handler（使用具體的 *sql.DB）
func NewHealth(db *sql.DB) *Health {
	return &Health{db: db}
}

// NewHealthWithPinger 建立 Health handler，接受 DBPinger 介面（便於測試注入 mock）
func NewHealthWithPinger(db DBPinger) *Health {
	return &Health{db: db}
}

// Check 回傳服務狀態
func (h *Health) Check(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()

	status := "ok"
	dbStatus := "connected"

	// 使用 database/sql 原生 Ping 測試連線
	if err := h.db.PingContext(ctx); err != nil {
		dbStatus = "disconnected"
		status = "degraded"
	}

	resp := map[string]interface{}{
		"status":    status,
		"database":  dbStatus,
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"service":   "ly-go-backend",
	}

	w.Header().Set("Content-Type", "application/json")
	// 回傳正確的 HTTP status code，讓 Railway/Docker 健康檢查能正確偵測服務降級
	if status != "ok" {
		w.WriteHeader(http.StatusServiceUnavailable)
	}
	json.NewEncoder(w).Encode(resp)
}
