package handler

import (
	"net/http"
)

// STT 語音辨識 token handler
type STT struct {
	apiKey string
}

// NewSTT 建立 STT handler
func NewSTT(deepgramAPIKey string) *STT {
	return &STT{apiKey: deepgramAPIKey}
}

// GetToken 回傳 Deepgram API key 供前端建立直連 WebSocket
func (h *STT) GetToken(w http.ResponseWriter, r *http.Request) {
	if h.apiKey == "" {
		writeError(w, "STT_NOT_CONFIGURED", "STT service not configured. Please set your own API key in settings.", http.StatusServiceUnavailable)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"token":    h.apiKey,
		"provider": "deepgram",
	})
}
