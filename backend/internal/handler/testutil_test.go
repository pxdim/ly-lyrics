// Package handler_test 提供 HTTP handler 測試的共用工具函式。
package handler_test

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/require"
)

// newRequest 建立帶有 JSON body 的 HTTP 測試請求
func newRequest(t *testing.T, method, path string, body any) *http.Request {
	t.Helper()
	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		require.NoError(t, err)
		reader = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	return req
}

// executeRequest 執行 HTTP 請求並回傳 recorder
func executeRequest(handler http.HandlerFunc, req *http.Request) *httptest.ResponseRecorder {
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	return rr
}

// executeWithChi 使用 chi router 執行請求（支援 URL 參數如 {id}）
func executeWithChi(t *testing.T, method, pattern, url string, handler http.HandlerFunc, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	r := chi.NewRouter()
	switch method {
	case "GET":
		r.Get(pattern, handler)
	case "POST":
		r.Post(pattern, handler)
	case "PUT":
		r.Put(pattern, handler)
	case "DELETE":
		r.Delete(pattern, handler)
	}
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)
	return rr
}

// decodeJSON 解碼 JSON 回應
func decodeJSON(t *testing.T, rr *httptest.ResponseRecorder, v any) {
	t.Helper()
	err := json.NewDecoder(rr.Body).Decode(v)
	require.NoError(t, err)
}

// assertStatus 確認 HTTP 狀態碼，失敗時顯示 body 內容
func assertStatus(t *testing.T, rr *httptest.ResponseRecorder, expected int) {
	t.Helper()
	if rr.Code != expected {
		t.Errorf("expected status %d, got %d; body: %s", expected, rr.Code, rr.Body.String())
	}
}

// assertErrorCode 確認錯誤回應中的 error code 欄位
func assertErrorCode(t *testing.T, rr *httptest.ResponseRecorder, expectedCode string) {
	t.Helper()
	var resp struct {
		Error struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		} `json:"error"`
	}
	decodeJSON(t, rr, &resp)
	if resp.Error.Code != expectedCode {
		t.Errorf("expected error code %q, got %q (message: %s)", expectedCode, resp.Error.Code, resp.Error.Message)
	}
}
