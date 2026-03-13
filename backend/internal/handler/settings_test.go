// Package handler_test 測試設定相關 HTTP handlers。
package handler_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/stretchr/testify/assert"
)

// ────────────────────────────────────────────────────────────
// Mock SettingsService
// ────────────────────────────────────────────────────────────

// mockSettingsService 實作 handler.SettingsServicer 介面，用於測試隔離
type mockSettingsService struct {
	// GetByUserID 的預設回傳值
	getResp *dto.SettingsResponse
	getErr  error

	// Update 的預設回傳值
	updateResp *dto.SettingsResponse
	updateErr  error

	// Reset 的預設回傳值
	resetResp *dto.SettingsResponse
	resetErr  error
}

func (m *mockSettingsService) GetByUserID(_ context.Context, _ uuid.UUID) (*dto.SettingsResponse, error) {
	return m.getResp, m.getErr
}

func (m *mockSettingsService) Update(_ context.Context, _ uuid.UUID, _ dto.UpdateSettingsRequest) (*dto.SettingsResponse, error) {
	return m.updateResp, m.updateErr
}

func (m *mockSettingsService) Reset(_ context.Context, _ uuid.UUID) (*dto.SettingsResponse, error) {
	return m.resetResp, m.resetErr
}

// ────────────────────────────────────────────────────────────
// 測試輔助函式
// ────────────────────────────────────────────────────────────

// newTestSettings 建立用於測試的 SettingsResponse（含預設值）
func newTestSettings() *dto.SettingsResponse {
	bgColor := "#000000"
	textColor := "#ffffff"
	highlightColor := "#0ea5e9"
	return &dto.SettingsResponse{
		ID:     uuid.New(),
		UserID: uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		DisplaySettings: dto.DisplaySettings{
			DisplayLines:    4,
			FontSize:        32,
			FontFamily:      "Inter",
			Theme:           "dark",
			ShowBackground:  true,
			BackgroundColor: &bgColor,
			TextColor:       &textColor,
			HighlightColor:  &highlightColor,
			AutoScroll:      true,
			ScrollDuration:  300,
			EnableAnimation: true,
		},
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

// ────────────────────────────────────────────────────────────
// Get 測試
// ────────────────────────────────────────────────────────────

func TestSettingsGet_ReturnsSettings(t *testing.T) {
	settings := newTestSettings()
	mock := &mockSettingsService{getResp: settings}
	h := handler.NewSettingsWithService(mock)

	req := httptest.NewRequest("GET", "/api/settings", nil)
	rr := executeRequest(h.Get, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.SettingsResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, settings.DisplaySettings.FontSize, resp.DisplaySettings.FontSize)
	assert.Equal(t, settings.DisplaySettings.Theme, resp.DisplaySettings.Theme)
}

// ────────────────────────────────────────────────────────────
// Update 測試
// ────────────────────────────────────────────────────────────

func TestSettingsUpdate_FontSize(t *testing.T) {
	updated := newTestSettings()
	updated.DisplaySettings.FontSize = 48
	mock := &mockSettingsService{updateResp: updated}
	h := handler.NewSettingsWithService(mock)

	fontSize := 48
	req := newRequest(t, "PUT", "/api/settings", dto.UpdateSettingsRequest{
		DisplaySettings: &dto.UpdateDisplaySettings{
			FontSize: &fontSize,
		},
	})
	rr := executeRequest(h.Update, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.SettingsResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, 48, resp.DisplaySettings.FontSize)
}

func TestSettingsUpdate_NonJSON(t *testing.T) {
	mock := &mockSettingsService{}
	h := handler.NewSettingsWithService(mock)

	req := httptest.NewRequest("PUT", "/api/settings", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	rr := executeRequest(h.Update, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "SETTINGS_INVALID_FORMAT")
}

// ────────────────────────────────────────────────────────────
// Reset 測試
// ────────────────────────────────────────────────────────────

func TestSettingsReset_ReturnsDefaults(t *testing.T) {
	defaults := newTestSettings()
	mock := &mockSettingsService{resetResp: defaults}
	h := handler.NewSettingsWithService(mock)

	req := httptest.NewRequest("POST", "/api/settings/reset", nil)
	rr := executeRequest(h.Reset, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.SettingsResponse
	decodeJSON(t, rr, &resp)
	// 確認回傳預設字體大小
	assert.Equal(t, 32, resp.DisplaySettings.FontSize)
}
