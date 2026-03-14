// Package service 實作業務邏輯層。
// 此檔案負責使用者設定相關業務邏輯，包含取得、更新、重設操作。
// 資料庫以扁平欄位儲存，API 回應使用嵌套的 displaySettings 物件。
package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/raymondchen/ly-backend/internal/ent/settings"
)

// SettingsService 設定業務邏輯
type SettingsService struct {
	client *ent.Client
}

// NewSettingsService 建立 SettingsService 實例
func NewSettingsService(client *ent.Client) *SettingsService {
	return &SettingsService{client: client}
}

// GetByUserID 取得使用者設定，不存在則自動建立預設值
func (s *SettingsService) GetByUserID(ctx context.Context, userID uuid.UUID) (*dto.SettingsResponse, error) {
	settingsEntity, err := s.client.Settings.Query().
		Where(settings.UserID(userID)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			// 不存在則自動建立預設值
			return s.createDefaults(ctx, userID)
		}
		return nil, fmt.Errorf("querying settings for user %s: %w", userID, err)
	}

	resp := entSettingsToDTO(settingsEntity)
	return &resp, nil
}

// Update 更新設定（僅更新提供的欄位）
func (s *SettingsService) Update(ctx context.Context, userID uuid.UUID, req dto.UpdateSettingsRequest) (*dto.SettingsResponse, error) {
	// 取得現有設定（不存在則自動建立）
	existing, err := s.client.Settings.Query().
		Where(settings.UserID(userID)).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			// 先建立預設值，再套用更新
			created, createErr := s.createDefaults(ctx, userID)
			if createErr != nil {
				return nil, createErr
			}
			// 重新取得 entity 以進行更新
			existing, err = s.client.Settings.Get(ctx, created.ID)
			if err != nil {
				return nil, fmt.Errorf("getting newly created settings: %w", err)
			}
		} else {
			return nil, fmt.Errorf("querying settings for user %s: %w", userID, err)
		}
	}

	// 若未提供 displaySettings，直接回傳現有設定
	if req.DisplaySettings == nil {
		resp := entSettingsToDTO(existing)
		return &resp, nil
	}

	// 使用 UpdateOneID + SetNillable* 僅更新提供的欄位
	ds := req.DisplaySettings
	updated, err := s.client.Settings.UpdateOneID(existing.ID).
		SetNillableDisplayLines(ds.DisplayLines).
		SetNillableFontSize(ds.FontSize).
		SetNillableFontFamily(ds.FontFamily).
		SetNillableLineSpacing(ds.LineSpacing).
		SetNillableTheme(ds.Theme).
		SetNillableShowBackground(ds.ShowBackground).
		SetNillableBackgroundColor(ds.BackgroundColor).
		SetNillableTextColor(ds.TextColor).
		SetNillableHighlightColor(ds.HighlightColor).
		SetNillableAutoScroll(ds.AutoScroll).
		SetNillableScrollDuration(ds.ScrollDuration).
		SetNillableEnableAnimation(ds.EnableAnimation).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("updating settings for user %s: %w", userID, err)
	}

	resp := entSettingsToDTO(updated)
	return &resp, nil
}

// Reset 重設為預設值（刪除現有設定並重新建立）
func (s *SettingsService) Reset(ctx context.Context, userID uuid.UUID) (*dto.SettingsResponse, error) {
	// 刪除現有設定（若存在）
	_, err := s.client.Settings.Delete().
		Where(settings.UserID(userID)).
		Exec(ctx)
	if err != nil {
		return nil, fmt.Errorf("deleting settings for user %s: %w", userID, err)
	}

	// 建立預設設定
	return s.createDefaults(ctx, userID)
}

// createDefaults 建立預設設定
func (s *SettingsService) createDefaults(ctx context.Context, userID uuid.UUID) (*dto.SettingsResponse, error) {
	bgColor := "#000000"
	textColor := "#ffffff"
	highlightColor := "#0ea5e9"

	settingsEntity, err := s.client.Settings.Create().
		SetUserID(userID).
		SetDisplayLines(4).
		SetFontSize(32).
		SetFontFamily("Inter").
		SetLineSpacing(0.5).
		SetTheme("dark").
		SetShowBackground(true).
		SetBackgroundColor(bgColor).
		SetTextColor(textColor).
		SetHighlightColor(highlightColor).
		SetAutoScroll(true).
		SetScrollDuration(300).
		SetEnableAnimation(true).
		Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("creating default settings for user %s: %w", userID, err)
	}

	resp := entSettingsToDTO(settingsEntity)
	return &resp, nil
}

// entSettingsToDTO 將 Ent Settings entity 轉換為 DTO（扁平欄位 → 嵌套 displaySettings）
func entSettingsToDTO(s *ent.Settings) dto.SettingsResponse {
	return dto.SettingsResponse{
		ID:     s.ID,
		UserID: s.UserID,
		DisplaySettings: dto.DisplaySettings{
			DisplayLines:    s.DisplayLines,
			FontSize:        s.FontSize,
			FontFamily:      s.FontFamily,
			LineSpacing:     s.LineSpacing,
			Theme:           s.Theme,
			ShowBackground:  s.ShowBackground,
			BackgroundColor: s.BackgroundColor,
			TextColor:       s.TextColor,
			HighlightColor:  s.HighlightColor,
			AutoScroll:      s.AutoScroll,
			ScrollDuration:  s.ScrollDuration,
			EnableAnimation: s.EnableAnimation,
		},
		CreatedAt: s.CreatedAt,
		UpdatedAt: s.UpdatedAt,
	}
}
