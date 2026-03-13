// Package middleware 提供 HTTP 中介軟體。
package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// RateLimiter 基於 IP 的滑動視窗速率限制器
type RateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	limit    int
	window   time.Duration
	done     chan struct{}
}

type visitor struct {
	timestamps []time.Time
}

// NewRateLimiter 建立速率限制器
// limit: 視窗內最大請求數, windowSec: 視窗秒數
func NewRateLimiter(limit, windowSec int) *RateLimiter {
	rl := &RateLimiter{
		visitors: make(map[string]*visitor),
		limit:    limit,
		window:   time.Duration(windowSec) * time.Second,
		done:     make(chan struct{}),
	}
	go rl.cleanup()
	return rl
}

// Stop 停止 cleanup goroutine，防止 goroutine 洩漏
func (rl *RateLimiter) Stop() {
	close(rl.done)
}

// Middleware 回傳 rate limiting 中介軟體
func (rl *RateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := extractIP(r)
		if !rl.allow(ip) {
			w.Header().Set("Content-Type", "application/json")
			w.Header().Set("Retry-After", "1")
			w.WriteHeader(http.StatusTooManyRequests)
			w.Write([]byte(`{"error":{"code":"RATE_LIMITED","message":"Too many requests"}}`))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (rl *RateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	v, exists := rl.visitors[ip]
	if !exists {
		rl.visitors[ip] = &visitor{timestamps: []time.Time{now}}
		return true
	}

	// 移除視窗外的時間戳
	cutoff := now.Add(-rl.window)
	valid := v.timestamps[:0]
	for _, ts := range v.timestamps {
		if ts.After(cutoff) {
			valid = append(valid, ts)
		}
	}
	v.timestamps = valid

	if len(v.timestamps) >= rl.limit {
		return false
	}

	v.timestamps = append(v.timestamps, now)
	return true
}

func extractIP(r *http.Request) string {
	// 反向代理場景（Railway, Nginx, Caddy 等）：優先取 X-Forwarded-For 第一個 IP
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		// X-Forwarded-For 格式: "client, proxy1, proxy2"
		for i := 0; i < len(xff); i++ {
			if xff[i] == ',' {
				return strings.TrimSpace(xff[:i])
			}
		}
		return strings.TrimSpace(xff)
	}

	// X-Real-IP 備援（部分反向代理使用）
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return strings.TrimSpace(xri)
	}

	// 直連場景：從 RemoteAddr 提取 IP
	ip, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return ip
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-rl.done:
			return
		case <-ticker.C:
			rl.mu.Lock()
			cutoff := time.Now().Add(-rl.window * 2)
			for ip, v := range rl.visitors {
				if len(v.timestamps) == 0 || v.timestamps[len(v.timestamps)-1].Before(cutoff) {
					delete(rl.visitors, ip)
				}
			}
			rl.mu.Unlock()
		}
	}
}
