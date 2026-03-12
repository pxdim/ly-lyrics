// Package dto 定義資料傳輸物件（Data Transfer Objects）。
// 此檔案定義統一錯誤回應結構，對應 Node.js API 的錯誤格式。
package dto

import "time"

// ErrorDetail 錯誤詳情
type ErrorDetail struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details,omitempty"`
}

// ErrorResponse API 錯誤回應
type ErrorResponse struct {
	Error     ErrorDetail `json:"error"`
	Timestamp int64       `json:"timestamp"`
}

// NewErrorResponse 建立標準錯誤回應
func NewErrorResponse(code, message string, details ...map[string]any) ErrorResponse {
	resp := ErrorResponse{
		Error: ErrorDetail{
			Code:    code,
			Message: message,
		},
		Timestamp: time.Now().UnixMilli(),
	}
	if len(details) > 0 && details[0] != nil {
		resp.Error.Details = details[0]
	}
	return resp
}
