// Package handler 定義 HTTP 請求處理器。
// 此檔案負責設定 API 的 HTTP 處理，包含取得、更新、重設端點。
package handler

import (
	"encoding/json"
	"net/http"

	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/service"
)

// Settings 設定 HTTP handler
type Settings struct {
	svc *service.SettingsService
}

// NewSettings 建立 Settings handler
func NewSettings(svc *service.SettingsService) *Settings {
	return &Settings{svc: svc}
}

// Get GET /api/settings — 取得使用者設定（不存在則自動建立預設值）
func (h *Settings) Get(w http.ResponseWriter, r *http.Request) {
	// 優先使用已認證使用者 ID，未認證時退回 DemoUserID
	userID := service.DemoUserID
	if uid := auth.UserIDFromContext(r.Context()); uid != nil {
		userID = *uid
	}

	result, err := h.svc.GetByUserID(r.Context(), userID)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to fetch settings", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// Update PUT /api/settings — 更新設定（僅更新提供的欄位）
func (h *Settings) Update(w http.ResponseWriter, r *http.Request) {
	var req dto.UpdateSettingsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, "SETTINGS_INVALID_FORMAT", "Invalid JSON format", http.StatusBadRequest)
		return
	}

	// 優先使用已認證使用者 ID，未認證時退回 DemoUserID
	userID := service.DemoUserID
	if uid := auth.UserIDFromContext(r.Context()); uid != nil {
		userID = *uid
	}

	result, err := h.svc.Update(r.Context(), userID, req)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to update settings", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, result)
}

// Reset POST /api/settings — 重設為預設值
func (h *Settings) Reset(w http.ResponseWriter, r *http.Request) {
	// 優先使用已認證使用者 ID，未認證時退回 DemoUserID
	userID := service.DemoUserID
	if uid := auth.UserIDFromContext(r.Context()); uid != nil {
		userID = *uid
	}

	result, err := h.svc.Reset(r.Context(), userID)
	if err != nil {
		writeError(w, "SYS_INTERNAL_ERROR", "Failed to reset settings", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, result)
}
