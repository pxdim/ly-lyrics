// Package service 測試設定服務的業務邏輯。
// 純函式（entSettingsToDTO）可直接測試；CRUD 方法使用 SQLite in-memory 整合測試。
package service

import (
	"context"
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
// SettingsService 整合測試（SQLite in-memory）
// ─────────────────────────────────────────────────────────────────────────────

// ensureTestUser 建立測試用使用者（Settings 的 FK 約束需要 User 存在）
func ensureTestUser(t *testing.T, client *ent.Client, userID uuid.UUID) {
	t.Helper()
	ctx := context.Background()
	exists, _ := client.User.Get(ctx, userID)
	if exists != nil {
		return
	}
	_, err := client.User.Create().
		SetID(userID).
		SetEmail(userID.String() + "@test.local").
		SetPasswordHash("$2a$10$placeholder000000000000000000000000000000000").
		SetName("Test User").
		SetEmailVerified(false).
		Save(ctx)
	require.NoError(t, err)
}

func TestSettingsService_GetByUserID(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewSettingsService(client)
	ctx := context.Background()
	userID := uuid.New()
	ensureTestUser(t, client, userID)

	t.Run("首次取得自動建立預設值", func(t *testing.T) {
		resp, err := svc.GetByUserID(ctx, userID)
		require.NoError(t, err)
		require.NotNil(t, resp)

		assert.Equal(t, userID, resp.UserID)
		ds := resp.DisplaySettings
		assert.Equal(t, 4, ds.DisplayLines)
		assert.Equal(t, 32, ds.FontSize)
		assert.Equal(t, "Inter", ds.FontFamily)
		assert.Equal(t, "dark", ds.Theme)
		assert.True(t, ds.ShowBackground)
		assert.True(t, ds.AutoScroll)
		assert.Equal(t, 300, ds.ScrollDuration)
		assert.True(t, ds.EnableAnimation)
	})

	t.Run("再次取得回傳同一筆", func(t *testing.T) {
		resp1, err := svc.GetByUserID(ctx, userID)
		require.NoError(t, err)
		resp2, err := svc.GetByUserID(ctx, userID)
		require.NoError(t, err)

		assert.Equal(t, resp1.ID, resp2.ID, "同一使用者應回傳同一筆設定")
	})
}

func TestSettingsService_Update(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewSettingsService(client)
	ctx := context.Background()
	userID := uuid.New()
	ensureTestUser(t, client, userID)

	t.Run("部分更新 displaySettings", func(t *testing.T) {
		fontSize := 48
		theme := "light"
		resp, err := svc.Update(ctx, userID, dto.UpdateSettingsRequest{
			DisplaySettings: &dto.UpdateDisplaySettings{
				FontSize: &fontSize,
				Theme:    &theme,
			},
		})
		require.NoError(t, err)
		require.NotNil(t, resp)

		ds := resp.DisplaySettings
		assert.Equal(t, 48, ds.FontSize, "FontSize 應更新為 48")
		assert.Equal(t, "light", ds.Theme, "Theme 應更新為 light")
		// 未更新的欄位應保持預設值
		assert.Equal(t, 4, ds.DisplayLines)
		assert.True(t, ds.AutoScroll)
	})

	t.Run("displaySettings 為 nil 時不更新", func(t *testing.T) {
		// 先取得目前設定
		before, err := svc.GetByUserID(ctx, userID)
		require.NoError(t, err)

		resp, err := svc.Update(ctx, userID, dto.UpdateSettingsRequest{
			DisplaySettings: nil,
		})
		require.NoError(t, err)
		require.NotNil(t, resp)

		assert.Equal(t, before.DisplaySettings.FontSize, resp.DisplaySettings.FontSize)
	})

	t.Run("不存在的使用者會自動建立預設值再更新", func(t *testing.T) {
		newUserID := uuid.New()
		ensureTestUser(t, client, newUserID)

		fontSize := 36
		resp, err := svc.Update(ctx, newUserID, dto.UpdateSettingsRequest{
			DisplaySettings: &dto.UpdateDisplaySettings{
				FontSize: &fontSize,
			},
		})
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Equal(t, 36, resp.DisplaySettings.FontSize)
		// 其他欄位應為預設值
		assert.Equal(t, 4, resp.DisplaySettings.DisplayLines)
	})

	t.Run("更新所有 displaySettings 欄位", func(t *testing.T) {
		anotherUserID := uuid.New()
		ensureTestUser(t, client, anotherUserID)

		displayLines := 6
		fontSize := 24
		fontFamily := "Noto Sans TC"
		lineSpacing := 1.5
		theme := "transparent"
		showBg := false
		bgColor := "#111111"
		textColor := "#eeeeee"
		highlightColor := "#ff0000"
		autoScroll := false
		scrollDuration := 500
		enableAnimation := false

		resp, err := svc.Update(ctx, anotherUserID, dto.UpdateSettingsRequest{
			DisplaySettings: &dto.UpdateDisplaySettings{
				DisplayLines:    &displayLines,
				FontSize:        &fontSize,
				FontFamily:      &fontFamily,
				LineSpacing:     &lineSpacing,
				Theme:           &theme,
				ShowBackground:  &showBg,
				BackgroundColor: &bgColor,
				TextColor:       &textColor,
				HighlightColor:  &highlightColor,
				AutoScroll:      &autoScroll,
				ScrollDuration:  &scrollDuration,
				EnableAnimation: &enableAnimation,
			},
		})
		require.NoError(t, err)
		ds := resp.DisplaySettings
		assert.Equal(t, 6, ds.DisplayLines)
		assert.Equal(t, 24, ds.FontSize)
		assert.Equal(t, "Noto Sans TC", ds.FontFamily)
		assert.Equal(t, 1.5, ds.LineSpacing)
		assert.Equal(t, "transparent", ds.Theme)
		assert.False(t, ds.ShowBackground)
		require.NotNil(t, ds.BackgroundColor)
		assert.Equal(t, "#111111", *ds.BackgroundColor)
		require.NotNil(t, ds.TextColor)
		assert.Equal(t, "#eeeeee", *ds.TextColor)
		require.NotNil(t, ds.HighlightColor)
		assert.Equal(t, "#ff0000", *ds.HighlightColor)
		assert.False(t, ds.AutoScroll)
		assert.Equal(t, 500, ds.ScrollDuration)
		assert.False(t, ds.EnableAnimation)
	})
}

func TestSettingsService_Reset(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewSettingsService(client)
	ctx := context.Background()
	userID := uuid.New()
	ensureTestUser(t, client, userID)

	t.Run("重設後回傳預設值", func(t *testing.T) {
		// 先更新設定
		fontSize := 72
		_, err := svc.Update(ctx, userID, dto.UpdateSettingsRequest{
			DisplaySettings: &dto.UpdateDisplaySettings{
				FontSize: &fontSize,
			},
		})
		require.NoError(t, err)

		// 重設
		resp, err := svc.Reset(ctx, userID)
		require.NoError(t, err)
		require.NotNil(t, resp)

		// 應為預設值
		ds := resp.DisplaySettings
		assert.Equal(t, 32, ds.FontSize, "重設後 FontSize 應為預設值 32")
		assert.Equal(t, 4, ds.DisplayLines)
		assert.Equal(t, "dark", ds.Theme)
		assert.True(t, ds.AutoScroll)
	})

	t.Run("對無設定的使用者重設不會出錯", func(t *testing.T) {
		newUserID := uuid.New()
		ensureTestUser(t, client, newUserID)

		resp, err := svc.Reset(ctx, newUserID)
		require.NoError(t, err)
		require.NotNil(t, resp)
		assert.Equal(t, 32, resp.DisplaySettings.FontSize)
	})
}

func TestSettingsService_CreateDefaults(t *testing.T) {
	client := newTestEntClient(t)
	svc := NewSettingsService(client)
	ctx := context.Background()
	userID := uuid.New()
	ensureTestUser(t, client, userID)

	// 透過 GetByUserID 觸發 createDefaults（首次查詢）
	resp, err := svc.GetByUserID(ctx, userID)
	require.NoError(t, err)
	require.NotNil(t, resp)

	// 驗證所有預設值
	ds := resp.DisplaySettings
	assert.Equal(t, 4, ds.DisplayLines)
	assert.Equal(t, 32, ds.FontSize)
	assert.Equal(t, "Inter", ds.FontFamily)
	assert.Equal(t, 0.5, ds.LineSpacing)
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
