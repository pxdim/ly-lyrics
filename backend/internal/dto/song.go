// Package dto 定義資料傳輸物件（Data Transfer Objects）。
// 此檔案定義歌曲相關的請求與回應結構，對應 Node.js songResponseSchema。
package dto

import (
	"time"

	"github.com/google/uuid"
)

// SongResponse 歌曲 API 回應（camelCase JSON）
// 對應 Node.js songResponseSchema，所有 JSON 欄位名稱必須完全一致。
type SongResponse struct {
	ID            uuid.UUID `json:"id"`
	Title         string    `json:"title"`
	Artist        *string   `json:"artist,omitempty"`        // nullable — null 時不輸出
	Lyrics        []string  `json:"lyrics"`                  // 從 JSON TEXT 解析的字串陣列
	LrcTimestamps []float64 `json:"lrcTimestamps,omitempty"` // nullable — null 時不輸出
	Language      *string   `json:"language,omitempty"`      // nullable — null 時不輸出
	UserID        uuid.UUID `json:"userId"`
	CreatedAt     time.Time `json:"createdAt"`
	UpdatedAt     time.Time `json:"updatedAt"`
}

// SongListResponse 歌曲列表回應
type SongListResponse struct {
	Data   []SongResponse `json:"data"`
	Total  int            `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

// SongListParams 歌曲列表查詢參數
type SongListParams struct {
	Limit  int     `json:"limit"`
	Offset int     `json:"offset"`
	Search *string `json:"search,omitempty"`
	UserID *string `json:"userId,omitempty"`
}

// CreateSongRequest 建立歌曲請求
type CreateSongRequest struct {
	Title         string    `json:"title" validate:"required,max=255"`
	Artist        *string   `json:"artist,omitempty" validate:"omitempty,max=255"`
	Lyrics        []string  `json:"lyrics" validate:"required,min=1"`
	LrcTimestamps []float64 `json:"lrcTimestamps,omitempty"`
	Language      *string   `json:"language,omitempty" validate:"omitempty,len=2"`
}

// UpdateSongRequest 更新歌曲請求（所有欄位皆為可選）
type UpdateSongRequest struct {
	Title         *string   `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	Artist        *string   `json:"artist,omitempty" validate:"omitempty,max=255"`
	Lyrics        []string  `json:"lyrics,omitempty" validate:"omitempty,min=1"`
	LrcTimestamps []float64 `json:"lrcTimestamps,omitempty"`
	Language      *string   `json:"language,omitempty" validate:"omitempty,len=2"`
}
