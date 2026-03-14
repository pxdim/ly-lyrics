// Package dto 定義資料傳輸物件（Data Transfer Objects）。
// 此檔案定義設定相關的請求與回應結構。
// 注意：資料庫儲存為扁平欄位，但 API 回應使用嵌套的 displaySettings 物件。
package dto

import (
	"time"

	"github.com/google/uuid"
)

// DisplaySettings 顯示設定（嵌套物件）
type DisplaySettings struct {
	DisplayLines    int     `json:"displayLines"`
	FontSize        int     `json:"fontSize"`
	FontFamily      string  `json:"fontFamily"`
	LineSpacing     float64 `json:"lineSpacing"`
	Theme           string  `json:"theme"`
	ShowBackground  bool    `json:"showBackground"`
	BackgroundColor *string `json:"backgroundColor"` // nullable
	TextColor       *string `json:"textColor"`       // nullable
	HighlightColor  *string `json:"highlightColor"`  // nullable
	AutoScroll      bool    `json:"autoScroll"`
	ScrollDuration  int     `json:"scrollDuration"`
	EnableAnimation bool    `json:"enableAnimation"`
}

// SettingsResponse 設定 API 回應
type SettingsResponse struct {
	ID              uuid.UUID       `json:"id"`
	UserID          uuid.UUID       `json:"userId"`
	DisplaySettings DisplaySettings `json:"displaySettings"`
	CreatedAt       time.Time       `json:"createdAt"`
	UpdatedAt       time.Time       `json:"updatedAt"`
}

// UpdateSettingsRequest 更新設定請求
type UpdateSettingsRequest struct {
	DisplaySettings *UpdateDisplaySettings `json:"displaySettings,omitempty"`
}

// UpdateDisplaySettings 更新顯示設定（所有欄位可選）
type UpdateDisplaySettings struct {
	DisplayLines    *int      `json:"displayLines,omitempty" validate:"omitempty,min=1,max=10"`
	FontSize        *int      `json:"fontSize,omitempty" validate:"omitempty,min=12,max=72"`
	FontFamily      *string   `json:"fontFamily,omitempty"`
	LineSpacing     *float64  `json:"lineSpacing,omitempty" validate:"omitempty,min=0,max=2"`
	Theme           *string   `json:"theme,omitempty" validate:"omitempty,oneof=light dark transparent"`
	ShowBackground  *bool     `json:"showBackground,omitempty"`
	BackgroundColor *string   `json:"backgroundColor,omitempty" validate:"omitempty,hexcolor"`
	TextColor       *string   `json:"textColor,omitempty" validate:"omitempty,hexcolor"`
	HighlightColor  *string   `json:"highlightColor,omitempty" validate:"omitempty,hexcolor"`
	AutoScroll      *bool     `json:"autoScroll,omitempty"`
	ScrollDuration  *int      `json:"scrollDuration,omitempty" validate:"omitempty,min=100,max=1000"`
	EnableAnimation *bool     `json:"enableAnimation,omitempty"`
}
