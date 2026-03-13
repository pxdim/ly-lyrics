// Package service 測試設定服務的業務邏輯。
// 純函式（entSettingsToDTO）可直接測試；需要 Ent Client 的方法標記為整合測試。
package service

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─────────────────────────────────────────────────────────────────────────────
// entSettingsToDTO 純函式測試
// ─────────────────────────────────────────────────────────────────────────────

func TestEntSettingsToDTO_DefaultValues(t *testing.T) {
	t.Parallel()

	now := time.Now()
	settingsID := uuid.New()
	userID := uuid.New()
	bgColor := "#000000"
	textColor := "#ffffff"
	highlightColor := "#0ea5e9"

	s := &ent.Settings{
		ID:              settingsID,
		UserID:          userID,
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
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	resp := entSettingsToDTO(s)

	// 驗證頂層欄位
	assert.Equal(t, settingsID, resp.ID)
	assert.Equal(t, userID, resp.UserID)
	assert.Equal(t, now, resp.CreatedAt)
	assert.Equal(t, now, resp.UpdatedAt)

	// 驗證嵌套 displaySettings
	ds := resp.DisplaySettings
	assert.Equal(t, 4, ds.DisplayLines)
	assert.Equal(t, 32, ds.FontSize)
	assert.Equal(t, "Inter", ds.FontFamily)
	assert.Equal(t, "dark", ds.Theme)
	assert.True(t, ds.ShowBackground)
	require.NotNil(t, ds.BackgroundColor)
	assert.Equal(t, "#000000", *ds.BackgroundColor)
	require.NotNil(t, ds.TextColor)
	assert.Equal(t, "#ffffff", *ds.TextColor)
	require.NotNil(t, ds.HighlightColor)
	assert.Equal(t, "#0ea5e9", *ds.HighlightColor)
	assert.True(t, ds.AutoScroll)
	assert.Equal(t, 300, ds.ScrollDuration)
	assert.True(t, ds.EnableAnimation)
}

func TestEntSettingsToDTO_NullableColors(t *testing.T) {
	t.Parallel()

	// 模擬顏色欄位為 nil 的情況
	s := &ent.Settings{
		ID:              uuid.New(),
		UserID:          uuid.New(),
		DisplayLines:    2,
		FontSize:        24,
		FontFamily:      "Arial",
		Theme:           "light",
		ShowBackground:  false,
		BackgroundColor: nil,
		TextColor:       nil,
		HighlightColor:  nil,
		AutoScroll:      false,
		ScrollDuration:  100,
		EnableAnimation: false,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	resp := entSettingsToDTO(s)

	ds := resp.DisplaySettings
	assert.Nil(t, ds.BackgroundColor, "BackgroundColor 應為 nil")
	assert.Nil(t, ds.TextColor, "TextColor 應為 nil")
	assert.Nil(t, ds.HighlightColor, "HighlightColor 應為 nil")
	assert.False(t, ds.ShowBackground)
	assert.False(t, ds.AutoScroll)
	assert.False(t, ds.EnableAnimation)
}

func TestEntSettingsToDTO_NestedStructureFormat(t *testing.T) {
	t.Parallel()

	// 驗證 DTO 的嵌套結構格式正確（資料庫扁平欄位 → 嵌套 displaySettings）
	bgColor := "#333333"
	s := &ent.Settings{
		ID:              uuid.New(),
		UserID:          uuid.New(),
		DisplayLines:    6,
		FontSize:        48,
		FontFamily:      "Noto Sans TC",
		Theme:           "transparent",
		ShowBackground:  true,
		BackgroundColor: &bgColor,
		AutoScroll:      true,
		ScrollDuration:  500,
		EnableAnimation: true,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	resp := entSettingsToDTO(s)

	// 驗證回傳型別是 dto.SettingsResponse
	var _ dto.SettingsResponse = resp

	// 驗證 displaySettings 子物件包含所有欄位
	ds := resp.DisplaySettings
	assert.Equal(t, 6, ds.DisplayLines)
	assert.Equal(t, 48, ds.FontSize)
	assert.Equal(t, "Noto Sans TC", ds.FontFamily)
	assert.Equal(t, "transparent", ds.Theme)
	assert.Equal(t, 500, ds.ScrollDuration)
}

func TestEntSettingsToDTO_BooleanZeroValues(t *testing.T) {
	t.Parallel()

	// 驗證 bool 欄位的零值（false）被正確傳遞
	s := &ent.Settings{
		ID:              uuid.New(),
		UserID:          uuid.New(),
		DisplayLines:    1,
		FontSize:        12,
		FontFamily:      "monospace",
		Theme:           "dark",
		ShowBackground:  false,
		AutoScroll:      false,
		ScrollDuration:  100,
		EnableAnimation: false,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}

	resp := entSettingsToDTO(s)

	ds := resp.DisplaySettings
	assert.False(t, ds.ShowBackground)
	assert.False(t, ds.AutoScroll)
	assert.False(t, ds.EnableAnimation)
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsService 方法（需要 Ent Client + 資料庫的整合測試骨架）
// ─────────────────────────────────────────────────────────────────────────────

func TestSettingsService_GetByUserID(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestSettingsService_Update(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestSettingsService_Reset(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}

func TestSettingsService_CreateDefaults(t *testing.T) {
	t.Skip("需要整合測試環境（Ent Client + PostgreSQL）")
}
