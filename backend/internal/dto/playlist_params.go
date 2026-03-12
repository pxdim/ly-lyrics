// Package dto 定義資料傳輸物件（Data Transfer Objects）。
// 此檔案定義播放清單查詢參數。
package dto

// PlaylistListParams 播放清單列表查詢參數
type PlaylistListParams struct {
	Limit  int     `json:"limit"`
	Offset int     `json:"offset"`
	UserID *string `json:"userId,omitempty"`
}
