// Package handler 提供 HTTP handler 的共用工具函式。
package handler

import (
	"encoding/json"
	"log/slog"
	"net/http"

	"github.com/raymondchen/ly-backend/internal/dto"
)

// writeJSON 寫入 JSON 回應
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.Debug("寫入 JSON 回應失敗", "error", err)
	}
}

// writeError 寫入標準錯誤回應
func writeError(w http.ResponseWriter, code, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(dto.NewErrorResponse(code, message)); err != nil {
		slog.Debug("寫入錯誤回應失敗", "error", err)
	}
}
