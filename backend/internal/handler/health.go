package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"time"
)

// Health 健康檢查 handler
type Health struct {
	db *sql.DB
}

// NewHealth 建立 Health handler
func NewHealth(db *sql.DB) *Health {
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
	json.NewEncoder(w).Encode(resp)
}
