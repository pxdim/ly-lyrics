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
