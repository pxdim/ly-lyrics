package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSTTHandler_GetToken(t *testing.T) {
	t.Run("returns token when DEEPGRAM_API_KEY is set", func(t *testing.T) {
		h := handler.NewSTT("dg-test-key-123", "")
		req := httptest.NewRequest(http.MethodGet, "/api/stt/token", nil)
		w := httptest.NewRecorder()

		h.GetToken(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]string
		err := json.NewDecoder(w.Body).Decode(&resp)
		require.NoError(t, err)
		assert.Equal(t, "dg-test-key-123", resp["token"])
		assert.Equal(t, "deepgram", resp["provider"])
	})

	t.Run("returns 503 when DEEPGRAM_API_KEY is empty", func(t *testing.T) {
		h := handler.NewSTT("", "")
		req := httptest.NewRequest(http.MethodGet, "/api/stt/token", nil)
		w := httptest.NewRecorder()

		h.GetToken(w, req)

		assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	})
}

// ────────────────────────────────────────────────────────────
// audioBuffer 大小保護測試（漏洞 3：OOM 防護）
// ────────────────────────────────────────────────────────────

func TestGuardAudioBuffer_UnderLimit(t *testing.T) {
	// 小於上限的 buffer 應原樣回傳，不被清空
	buf := make([]byte, 1024)
	for i := range buf {
		buf[i] = 0xFF
	}

	result := handler.GuardAudioBuffer(buf)
	assert.Equal(t, 1024, len(result), "低於上限的 buffer 不應被清空")
	assert.Equal(t, byte(0xFF), result[0], "buffer 內容應保持不變")
}

func TestGuardAudioBuffer_ExceedsLimit(t *testing.T) {
	// 超過 10MB 的 buffer 應被清空
	buf := make([]byte, handler.MaxAudioBufferSize+1)
	result := handler.GuardAudioBuffer(buf)
	assert.Equal(t, 0, len(result), "超過上限的 buffer 應被清空")
}

func TestGuardAudioBuffer_ExactlyAtLimit(t *testing.T) {
	// 剛好等於上限的 buffer 不應被清空
	buf := make([]byte, handler.MaxAudioBufferSize)
	result := handler.GuardAudioBuffer(buf)
	assert.Equal(t, handler.MaxAudioBufferSize, len(result), "等於上限的 buffer 不應被清空")
}
