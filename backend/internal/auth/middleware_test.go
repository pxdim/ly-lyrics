// Package auth 測試認證中介軟體功能。
// 使用 httptest 模擬 HTTP 請求，驗證 RequireAuth、OptionalAuth 與 UserIDFromContext。
package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─────────────────────────────────────────────────────────────────────────────
// UserIDFromContext 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestUserIDFromContext_WithUserID(t *testing.T) {
	t.Parallel()

	userID := uuid.New()
	ctx := context.WithValue(context.Background(), userIDKey, userID)

	result := UserIDFromContext(ctx)
	require.NotNil(t, result, "已設定 userID 時不應回傳 nil")
	assert.Equal(t, userID, *result)
}

func TestUserIDFromContext_WithoutUserID(t *testing.T) {
	t.Parallel()

	result := UserIDFromContext(context.Background())
	assert.Nil(t, result, "未設定 userID 時應回傳 nil")
}

func TestUserIDFromContext_WrongType(t *testing.T) {
	t.Parallel()

	// 故意設定錯誤型別
	ctx := context.WithValue(context.Background(), userIDKey, "not-a-uuid")
	result := UserIDFromContext(ctx)
	assert.Nil(t, result, "型別不正確時應回傳 nil")
}

// ─────────────────────────────────────────────────────────────────────────────
// RequireAuth 中介軟體測試
// ─────────────────────────────────────────────────────────────────────────────

func TestRequireAuth_ValidAccessToken(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	userID := uuid.New()
	token, err := jwtMgr.GenerateAccessToken(userID, "user@test.com", nil)
	require.NoError(t, err)

	// 建立被保護的 handler，記錄是否被呼叫以及 context 中的 userID
	var capturedUserID *uuid.UUID
	handler := RequireAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUserID = UserIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code, "有效 token 應通過認證")
	require.NotNil(t, capturedUserID, "context 中應包含 userID")
	assert.Equal(t, userID, *capturedUserID)
}

func TestRequireAuth_NoAuthHeader(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	handler := RequireAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("不應到達受保護的 handler")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
	assert.Equal(t, "application/json", rec.Header().Get("Content-Type"))

	var body map[string]interface{}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	errObj, ok := body["error"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, "AUTH_UNAUTHORIZED", errObj["code"])
}

func TestRequireAuth_InvalidToken(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	handler := RequireAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("不應到達受保護的 handler")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token-string")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestRequireAuth_RefreshTokenRejected(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	userID := uuid.New()
	// 用 refresh token 嘗試通過 RequireAuth（應被拒絕，因為需要 access token）
	refreshToken, err := jwtMgr.GenerateRefreshToken(userID)
	require.NoError(t, err)

	handler := RequireAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("refresh token 不應通過 RequireAuth")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+refreshToken)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

func TestRequireAuth_MalformedAuthHeader(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	handler := RequireAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("不應到達受保護的 handler")
	}))

	tests := []struct {
		name   string
		header string
	}{
		{"只有 Bearer 無 token", "Bearer"},
		{"非 Bearer 格式", "Basic dXNlcjpwYXNz"},
		{"Token 無前綴", "some-token-without-bearer"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
			req.Header.Set("Authorization", tc.header)
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			assert.Equal(t, http.StatusUnauthorized, rec.Code)
		})
	}
}

func TestRequireAuth_DifferentSecret(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	otherMgr := NewJWTManager("completely-different-secret-key", 1)

	userID := uuid.New()
	token, err := otherMgr.GenerateAccessToken(userID, "user@test.com", nil)
	require.NoError(t, err)

	handler := RequireAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("不同 secret 的 token 不應通過")
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}

// ─────────────────────────────────────────────────────────────────────────────
// OptionalAuth 中介軟體測試
// ─────────────────────────────────────────────────────────────────────────────

func TestOptionalAuth_WithValidToken(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	userID := uuid.New()
	token, err := jwtMgr.GenerateAccessToken(userID, "user@test.com", nil)
	require.NoError(t, err)

	var capturedUserID *uuid.UUID
	handler := OptionalAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUserID = UserIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	require.NotNil(t, capturedUserID, "有效 token 時 context 應包含 userID")
	assert.Equal(t, userID, *capturedUserID)
}

func TestOptionalAuth_NoToken(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	handlerCalled := false
	var capturedUserID *uuid.UUID

	handler := OptionalAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		capturedUserID = UserIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code, "無 token 時應仍放行")
	assert.True(t, handlerCalled, "handler 應被呼叫")
	assert.Nil(t, capturedUserID, "無 token 時 context 不應包含 userID")
}

func TestOptionalAuth_InvalidToken(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	handlerCalled := false
	var capturedUserID *uuid.UUID

	handler := OptionalAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handlerCalled = true
		capturedUserID = UserIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "Bearer invalid-token")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code, "無效 token 時仍應放行")
	assert.True(t, handlerCalled, "handler 應被呼叫")
	assert.Nil(t, capturedUserID, "無效 token 時不應注入 userID")
}

func TestOptionalAuth_BearerCaseInsensitive(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	userID := uuid.New()
	token, err := jwtMgr.GenerateAccessToken(userID, "user@test.com", nil)
	require.NoError(t, err)

	var capturedUserID *uuid.UUID
	handler := OptionalAuth(jwtMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedUserID = UserIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	// 用小寫 "bearer" 測試
	req := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	req.Header.Set("Authorization", "bearer "+token)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	require.NotNil(t, capturedUserID, "bearer 小寫時仍應正確解析")
	assert.Equal(t, userID, *capturedUserID)
}

// ─────────────────────────────────────────────────────────────────────────────
// extractAndValidateToken / extractAndValidateAccessToken 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestExtractAndValidateToken_Success(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	userID := uuid.New()
	token, err := jwtMgr.GenerateAccessToken(userID, "user@test.com", nil)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	claims, err := extractAndValidateToken(req, jwtMgr)
	require.NoError(t, err)
	assert.Equal(t, userID.String(), claims.Subject)
}

func TestExtractAndValidateToken_MissingHeader(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	_, err := extractAndValidateToken(req, jwtMgr)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing")
}

func TestExtractAndValidateToken_InvalidFormat(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "NotBearer some-token")

	_, err := extractAndValidateToken(req, jwtMgr)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid")
}

func TestExtractAndValidateToken_OnlyScheme(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer")

	_, err := extractAndValidateToken(req, jwtMgr)
	assert.Error(t, err)
}

func TestExtractAndValidateAccessToken_RejectsRefreshToken(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	userID := uuid.New()
	refreshToken, err := jwtMgr.GenerateRefreshToken(userID)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+refreshToken)

	_, err = extractAndValidateAccessToken(req, jwtMgr)
	assert.Error(t, err, "refresh token 不應通過 extractAndValidateAccessToken")
}

func TestExtractAndValidateAccessToken_AcceptsAccessToken(t *testing.T) {
	t.Parallel()

	jwtMgr := newTestJWTManager()
	userID := uuid.New()
	accessToken, err := jwtMgr.GenerateAccessToken(userID, "user@test.com", nil)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)

	claims, err := extractAndValidateAccessToken(req, jwtMgr)
	require.NoError(t, err)
	assert.Equal(t, "access", claims.TokenType)
	assert.Equal(t, userID.String(), claims.Subject)
}
