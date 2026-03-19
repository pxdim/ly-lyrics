package middleware_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/raymondchen/ly-backend/internal/middleware"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRateLimiter_AllowsUnderLimit(t *testing.T) {
	limiter := middleware.NewRateLimiter(5, 60)
	defer limiter.Stop()
	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := 0; i < 5; i++ {
		req := httptest.NewRequest("POST", "/api/auth/login", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code, "request %d should pass", i)
	}
}

func TestRateLimiter_BlocksOverLimit(t *testing.T) {
	limiter := middleware.NewRateLimiter(2, 60)
	defer limiter.Stop()
	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	for i := 0; i < 3; i++ {
		req := httptest.NewRequest("POST", "/api/auth/login", nil)
		req.RemoteAddr = "192.168.1.1:12345"
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if i < 2 {
			assert.Equal(t, http.StatusOK, rr.Code)
		} else {
			assert.Equal(t, http.StatusTooManyRequests, rr.Code)
		}
	}
}

func TestRateLimiter_SeparateByIP(t *testing.T) {
	limiter := middleware.NewRateLimiter(1, 60)
	defer limiter.Stop()
	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req1 := httptest.NewRequest("POST", "/", nil)
	req1.RemoteAddr = "10.0.0.1:1234"
	rr1 := httptest.NewRecorder()
	handler.ServeHTTP(rr1, req1)
	assert.Equal(t, http.StatusOK, rr1.Code)

	req2 := httptest.NewRequest("POST", "/", nil)
	req2.RemoteAddr = "10.0.0.2:1234"
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)
	assert.Equal(t, http.StatusOK, rr2.Code)
}

// 測試被阻擋時回傳正確的 JSON body 和 Retry-After header
func TestRateLimiter_BlockedResponseFormat(t *testing.T) {
	limiter := middleware.NewRateLimiter(1, 60)
	defer limiter.Stop()
	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// 第一個請求通過
	req1 := httptest.NewRequest("GET", "/api/songs", nil)
	req1.RemoteAddr = "10.0.0.1:1234"
	rr1 := httptest.NewRecorder()
	handler.ServeHTTP(rr1, req1)
	assert.Equal(t, http.StatusOK, rr1.Code)

	// 第二個請求被阻擋
	req2 := httptest.NewRequest("GET", "/api/songs", nil)
	req2.RemoteAddr = "10.0.0.1:1234"
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)

	assert.Equal(t, http.StatusTooManyRequests, rr2.Code)
	assert.Equal(t, "application/json", rr2.Header().Get("Content-Type"))
	assert.Equal(t, "1", rr2.Header().Get("Retry-After"))

	// 驗證 JSON body 結構
	var body map[string]map[string]string
	err := json.Unmarshal(rr2.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Equal(t, "RATE_LIMITED", body["error"]["code"])
	assert.Equal(t, "Too many requests", body["error"]["message"])
}

// 測試 X-Forwarded-For header 用於 IP 提取
func TestRateLimiter_ExtractsIPFromXForwardedFor(t *testing.T) {
	limiter := middleware.NewRateLimiter(1, 60)
	defer limiter.Stop()
	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// 用 X-Forwarded-For 送第一個 IP 的請求
	req1 := httptest.NewRequest("GET", "/", nil)
	req1.RemoteAddr = "127.0.0.1:9999"
	req1.Header.Set("X-Forwarded-For", "203.0.113.50, 70.41.3.18, 150.172.238.178")
	rr1 := httptest.NewRecorder()
	handler.ServeHTTP(rr1, req1)
	assert.Equal(t, http.StatusOK, rr1.Code)

	// 同一個 X-Forwarded-For client IP 的第二個請求應被阻擋
	req2 := httptest.NewRequest("GET", "/", nil)
	req2.RemoteAddr = "127.0.0.1:8888" // 不同 RemoteAddr
	req2.Header.Set("X-Forwarded-For", "203.0.113.50, 99.99.99.99")
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)
	assert.Equal(t, http.StatusTooManyRequests, rr2.Code)
}

// 測試 X-Real-IP header 用於 IP 提取（X-Forwarded-For 不存在時）
func TestRateLimiter_ExtractsIPFromXRealIP(t *testing.T) {
	limiter := middleware.NewRateLimiter(1, 60)
	defer limiter.Stop()
	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req1 := httptest.NewRequest("GET", "/", nil)
	req1.RemoteAddr = "127.0.0.1:9999"
	req1.Header.Set("X-Real-IP", "198.51.100.10")
	rr1 := httptest.NewRecorder()
	handler.ServeHTTP(rr1, req1)
	assert.Equal(t, http.StatusOK, rr1.Code)

	// 同一個 X-Real-IP 的第二個請求應被阻擋
	req2 := httptest.NewRequest("GET", "/", nil)
	req2.RemoteAddr = "127.0.0.1:8888"
	req2.Header.Set("X-Real-IP", "198.51.100.10")
	rr2 := httptest.NewRecorder()
	handler.ServeHTTP(rr2, req2)
	assert.Equal(t, http.StatusTooManyRequests, rr2.Code)
}

// 測試 Stop 不會 panic，且停止後 limiter 仍可正常使用
func TestRateLimiter_StopIsSafe(t *testing.T) {
	limiter := middleware.NewRateLimiter(5, 60)

	// Stop 不應 panic
	assert.NotPanics(t, func() {
		limiter.Stop()
	})

	// Stop 後 middleware 仍能處理請求（不應因 cleanup goroutine 停止而崩潰）
	handler := limiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.1:1234"
	rr := httptest.NewRecorder()
	assert.NotPanics(t, func() {
		handler.ServeHTTP(rr, req)
	})
	assert.Equal(t, http.StatusOK, rr.Code)
}

// 測試不同限制值的 limiter 可獨立運作（模擬多個路由群組使用不同限制）
func TestRateLimiter_MultipleLimitersIndependent(t *testing.T) {
	// 模擬 Auth limiter（嚴格：2 req/min）
	authLimiter := middleware.NewRateLimiter(2, 60)
	defer authLimiter.Stop()

	// 模擬 CRUD limiter（寬鬆：5 req/min）
	crudLimiter := middleware.NewRateLimiter(5, 60)
	defer crudLimiter.Stop()

	authHandler := authLimiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	crudHandler := crudLimiter.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	ip := "192.168.1.100:5555"

	// Auth limiter 第 3 個請求應被阻擋
	for i := 0; i < 3; i++ {
		req := httptest.NewRequest("POST", "/api/auth/login", nil)
		req.RemoteAddr = ip
		rr := httptest.NewRecorder()
		authHandler.ServeHTTP(rr, req)
		if i < 2 {
			assert.Equal(t, http.StatusOK, rr.Code, "auth request %d should pass", i)
		} else {
			assert.Equal(t, http.StatusTooManyRequests, rr.Code, "auth request %d should be blocked", i)
		}
	}

	// 同一個 IP，CRUD limiter 仍應允許（因為是獨立的 limiter）
	for i := 0; i < 5; i++ {
		req := httptest.NewRequest("GET", "/api/songs", nil)
		req.RemoteAddr = ip
		rr := httptest.NewRecorder()
		crudHandler.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code, "crud request %d should pass despite auth being blocked", i)
	}

	// CRUD limiter 第 6 個請求應被阻擋
	req := httptest.NewRequest("GET", "/api/songs", nil)
	req.RemoteAddr = ip
	rr := httptest.NewRecorder()
	crudHandler.ServeHTTP(rr, req)
	assert.Equal(t, http.StatusTooManyRequests, rr.Code, "crud request 6 should be blocked")
}
