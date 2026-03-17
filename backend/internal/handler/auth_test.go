// Package handler_test 測試認證相關 HTTP handlers。
package handler_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/raymondchen/ly-backend/internal/service"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ────────────────────────────────────────────────────────────
// Mock UserService
// ────────────────────────────────────────────────────────────

// mockUserService 實作 handler.UserServicer 介面，用於測試隔離
type mockUserService struct {
	// VerifyCredentials 的預設回傳值
	verifyUser *ent.User
	verifyErr  error

	// CreateUser 的預設回傳值
	createUser *ent.User
	createErr  error

	// GetByID 的預設回傳值
	getUser *ent.User
	getErr  error
}

func (m *mockUserService) VerifyCredentials(_ context.Context, _, _ string) (*ent.User, error) {
	return m.verifyUser, m.verifyErr
}

func (m *mockUserService) CreateUser(_ context.Context, _, _ string, _ *string) (*ent.User, error) {
	return m.createUser, m.createErr
}

func (m *mockUserService) GetByID(_ context.Context, _ uuid.UUID) (*ent.User, error) {
	return m.getUser, m.getErr
}

// ────────────────────────────────────────────────────────────
// 測試輔助函式
// ────────────────────────────────────────────────────────────

// testJWTSecret 測試用 JWT 簽名密鑰
const testJWTSecret = "test-secret-key-for-handler-tests"

// newTestJWTManager 建立用於測試的 JWTManager（短 secret，1 小時 access expiry）
func newTestJWTManager() *auth.JWTManager {
	return auth.NewJWTManager(testJWTSecret, 1)
}

// makeExpiredRefreshToken 直接使用 JWT 函式庫產生一個已過期的 refresh token（過期時間為過去 1 小時）
func makeExpiredRefreshToken(t *testing.T, userID uuid.UUID) string {
	t.Helper()
	past := time.Now().Add(-1 * time.Hour)
	claims := jwtlib.MapClaims{
		"sub":        userID.String(),
		"token_type": "refresh",
		"iat":        past.Add(-2 * time.Hour).Unix(),
		"exp":        past.Unix(), // 已過期
		"jti":        uuid.New().String(),
	}
	token := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(testJWTSecret))
	require.NoError(t, err)
	return signed
}

// newTestUser 建立用於測試的 ent.User 資料
func newTestUser() *ent.User {
	name := "Test User"
	return &ent.User{
		ID:            uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Email:         "test@example.com",
		Name:          &name,
		EmailVerified: false,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
}

// makeHandler 建立帶有 mock service 的 AuthHandler 並回傳各端點 HandlerFunc
func makeHandler(mock *mockUserService, jwtMgr *auth.JWTManager) *handler.AuthHandler {
	return handler.NewAuthHandlerWithService(mock, jwtMgr)
}

// ────────────────────────────────────────────────────────────
// Login 測試
// ────────────────────────────────────────────────────────────

func TestLogin_Success(t *testing.T) {
	jwtMgr := newTestJWTManager()
	user := newTestUser()
	mock := &mockUserService{verifyUser: user}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/login", dto.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	})
	rr := executeRequest(h.Login, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.AuthCookieResponse
	decodeJSON(t, rr, &resp)
	assert.False(t, resp.ExpiresAt.IsZero(), "expiresAt 不應為零值")
	assert.Equal(t, user.Email, resp.User.Email)
}

func TestLogin_EmptyBody(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/login", nil)
	rr := executeRequest(h.Login, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestLogin_InvalidEmailFormat(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/login", map[string]string{
		"email":    "not-an-email",
		"password": "password123",
	})
	rr := executeRequest(h.Login, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestLogin_WrongPassword(t *testing.T) {
	jwtMgr := newTestJWTManager()
	// VerifyCredentials 驗證失敗時回傳 nil user
	mock := &mockUserService{verifyUser: nil, verifyErr: nil}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/login", dto.LoginRequest{
		Email:    "test@example.com",
		Password: "wrongpassword",
	})
	rr := executeRequest(h.Login, req)

	assertStatus(t, rr, http.StatusUnauthorized)
	assertErrorCode(t, rr, "AUTH_INVALID_CREDENTIALS")
}

func TestLogin_NonExistentEmail(t *testing.T) {
	jwtMgr := newTestJWTManager()
	// 不存在的 email，VerifyCredentials 回傳 nil
	mock := &mockUserService{verifyUser: nil, verifyErr: nil}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/login", dto.LoginRequest{
		Email:    "nobody@example.com",
		Password: "password123",
	})
	rr := executeRequest(h.Login, req)

	assertStatus(t, rr, http.StatusUnauthorized)
	assertErrorCode(t, rr, "AUTH_INVALID_CREDENTIALS")
}

func TestLogin_SetsCookies(t *testing.T) {
	jwtMgr := newTestJWTManager()
	user := newTestUser()
	mock := &mockUserService{verifyUser: user}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/login", dto.LoginRequest{
		Email:    "test@example.com",
		Password: "password123",
	})
	rr := executeRequest(h.Login, req)

	assertStatus(t, rr, http.StatusOK)

	// 驗證回應設定了 HttpOnly cookie
	cookies := rr.Result().Cookies()
	var hasAccess, hasRefresh bool
	for _, c := range cookies {
		if c.Name == "access_token" {
			hasAccess = true
			assert.True(t, c.HttpOnly, "access_token cookie 應為 HttpOnly")
			assert.Equal(t, "/", c.Path)
			assert.Equal(t, http.SameSiteStrictMode, c.SameSite)
		}
		if c.Name == "refresh_token" {
			hasRefresh = true
			assert.True(t, c.HttpOnly, "refresh_token cookie 應為 HttpOnly")
			assert.Equal(t, "/api/auth/refresh", c.Path)
			assert.Equal(t, http.SameSiteStrictMode, c.SameSite)
		}
	}
	assert.True(t, hasAccess, "回應應設定 access_token cookie")
	assert.True(t, hasRefresh, "回應應設定 refresh_token cookie")

	// 驗證回應 body 不包含明文 token
	var body map[string]interface{}
	err := json.NewDecoder(rr.Body).Decode(&body)
	require.NoError(t, err)
	assert.Nil(t, body["accessToken"], "body 不應包含 accessToken")
	assert.Nil(t, body["refreshToken"], "body 不應包含 refreshToken")
}

func TestLogin_NonJSONBody(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	req := httptest.NewRequest("POST", "/api/auth/login", strings.NewReader("this is not json"))
	req.Header.Set("Content-Type", "application/json")
	rr := executeRequest(h.Login, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

// ────────────────────────────────────────────────────────────
// Register 測試
// ────────────────────────────────────────────────────────────

func TestRegister_Success(t *testing.T) {
	jwtMgr := newTestJWTManager()
	user := newTestUser()
	mock := &mockUserService{createUser: user}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/register", dto.RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
	})
	rr := executeRequest(h.Register, req)

	assertStatus(t, rr, http.StatusCreated)
	var resp dto.AuthCookieResponse
	decodeJSON(t, rr, &resp)
	assert.False(t, resp.ExpiresAt.IsZero(), "expiresAt 不應為零值")
	assert.Equal(t, user.Email, resp.User.Email)
}

func TestRegister_SetsCookies(t *testing.T) {
	jwtMgr := newTestJWTManager()
	user := newTestUser()
	mock := &mockUserService{createUser: user}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/register", dto.RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
	})
	rr := executeRequest(h.Register, req)

	assertStatus(t, rr, http.StatusCreated)

	// 驗證回應設定了 HttpOnly cookie
	cookies := rr.Result().Cookies()
	var hasAccess, hasRefresh bool
	for _, c := range cookies {
		if c.Name == "access_token" {
			hasAccess = true
			assert.True(t, c.HttpOnly, "access_token cookie 應為 HttpOnly")
			assert.Equal(t, "/", c.Path)
			assert.Equal(t, http.SameSiteStrictMode, c.SameSite)
		}
		if c.Name == "refresh_token" {
			hasRefresh = true
			assert.True(t, c.HttpOnly, "refresh_token cookie 應為 HttpOnly")
			assert.Equal(t, "/api/auth/refresh", c.Path)
			assert.Equal(t, http.SameSiteStrictMode, c.SameSite)
		}
	}
	assert.True(t, hasAccess, "回應應設定 access_token cookie")
	assert.True(t, hasRefresh, "回應應設定 refresh_token cookie")

	// 驗證回應 body 不包含明文 token
	var body map[string]interface{}
	err := json.NewDecoder(rr.Body).Decode(&body)
	require.NoError(t, err)
	assert.Nil(t, body["accessToken"], "body 不應包含 accessToken")
	assert.Nil(t, body["refreshToken"], "body 不應包含 refreshToken")
}

func TestRegister_DuplicateEmail(t *testing.T) {
	jwtMgr := newTestJWTManager()
	// CreateUser 回傳 ErrEmailExists
	mock := &mockUserService{createErr: service.ErrEmailExists}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/register", dto.RegisterRequest{
		Email:    "test@example.com",
		Password: "password123",
	})
	rr := executeRequest(h.Register, req)

	assertStatus(t, rr, http.StatusConflict)
	assertErrorCode(t, rr, "AUTH_EMAIL_EXISTS")
}

func TestRegister_ShortPassword(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/register", map[string]string{
		"email":    "test@example.com",
		"password": "123", // 少於 6 個字元
	})
	rr := executeRequest(h.Register, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestRegister_MissingEmail(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/register", map[string]string{
		"password": "password123",
	})
	rr := executeRequest(h.Register, req)

	assertStatus(t, rr, http.StatusBadRequest)
	assertErrorCode(t, rr, "VALIDATION_ERROR")
}

func TestRegister_WithName(t *testing.T) {
	jwtMgr := newTestJWTManager()
	name := "Alice"
	user := newTestUser()
	user.Name = &name
	mock := &mockUserService{createUser: user}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "POST", "/api/auth/register", dto.RegisterRequest{
		Email:    "alice@example.com",
		Password: "password123",
		Name:     &name,
	})
	rr := executeRequest(h.Register, req)

	assertStatus(t, rr, http.StatusCreated)
	var resp dto.AuthCookieResponse
	decodeJSON(t, rr, &resp)
	require.NotNil(t, resp.User.Name, "回應應包含 name 欄位")
	assert.Equal(t, name, *resp.User.Name)
}

// ────────────────────────────────────────────────────────────
// Me 測試
// ────────────────────────────────────────────────────────────

// withAuth 為請求加上 Bearer token header
func withAuth(req *http.Request, token string) *http.Request {
	req.Header.Set("Authorization", "Bearer "+token)
	return req
}

func TestMe_ValidToken(t *testing.T) {
	jwtMgr := newTestJWTManager()
	user := newTestUser()
	mock := &mockUserService{getUser: user}
	h := makeHandler(mock, jwtMgr)

	// 產生有效 access token
	token, err := jwtMgr.GenerateAccessToken(user.ID, user.Email, user.Name)
	require.NoError(t, err)

	req := newRequest(t, "GET", "/api/auth/me", nil)
	req = withAuth(req, token)

	// Me 需要 RequireAuth middleware
	middleware := auth.RequireAuth(jwtMgr)
	wrappedHandler := middleware(http.HandlerFunc(h.Me))

	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.MeResponse
	decodeJSON(t, rr, &resp)
	assert.Equal(t, user.Email, resp.User.Email)
}

func TestMe_NoToken(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	req := newRequest(t, "GET", "/api/auth/me", nil)
	// 不加任何 Authorization header

	middleware := auth.RequireAuth(jwtMgr)
	wrappedHandler := middleware(http.HandlerFunc(h.Me))

	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assertStatus(t, rr, http.StatusUnauthorized)
}

func TestMe_ExpiredToken(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	// 使用過期的 JWT manager（-1 小時 expiry）
	expiredMgr := auth.NewJWTManager("test-secret-key-for-handler-tests", -1)
	user := newTestUser()
	token, err := expiredMgr.GenerateAccessToken(user.ID, user.Email, user.Name)
	require.NoError(t, err)

	req := newRequest(t, "GET", "/api/auth/me", nil)
	req = withAuth(req, token)

	// RequireAuth 使用正常的 jwtMgr 驗證，應拒絕過期 token
	middleware := auth.RequireAuth(jwtMgr)
	wrappedHandler := middleware(http.HandlerFunc(h.Me))

	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assertStatus(t, rr, http.StatusUnauthorized)
}

func TestMe_RefreshTokenRejected(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	user := newTestUser()
	// 使用 refresh token 而非 access token
	refreshToken, err := jwtMgr.GenerateRefreshToken(user.ID)
	require.NoError(t, err)

	req := newRequest(t, "GET", "/api/auth/me", nil)
	req = withAuth(req, refreshToken)

	middleware := auth.RequireAuth(jwtMgr)
	wrappedHandler := middleware(http.HandlerFunc(h.Me))

	rr := httptest.NewRecorder()
	wrappedHandler.ServeHTTP(rr, req)

	assertStatus(t, rr, http.StatusUnauthorized)
}

// ────────────────────────────────────────────────────────────
// Refresh 測試
// ────────────────────────────────────────────────────────────

func TestRefresh_ValidToken(t *testing.T) {
	jwtMgr := newTestJWTManager()
	user := newTestUser()
	mock := &mockUserService{getUser: user}
	h := makeHandler(mock, jwtMgr)

	refreshToken, err := jwtMgr.GenerateRefreshToken(user.ID)
	require.NoError(t, err)

	// Refresh token 透過 HttpOnly cookie 傳遞
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})
	rr := executeRequest(h.Refresh, req)

	assertStatus(t, rr, http.StatusOK)
	var resp dto.AuthCookieResponse
	decodeJSON(t, rr, &resp)
	assert.False(t, resp.ExpiresAt.IsZero(), "expiresAt 不應為零值")
	assert.Equal(t, user.Email, resp.User.Email)
}

func TestRefresh_SetsCookies(t *testing.T) {
	jwtMgr := newTestJWTManager()
	user := newTestUser()
	mock := &mockUserService{getUser: user}
	h := makeHandler(mock, jwtMgr)

	refreshToken, err := jwtMgr.GenerateRefreshToken(user.ID)
	require.NoError(t, err)

	// Refresh token 透過 HttpOnly cookie 傳遞
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: refreshToken})
	rr := executeRequest(h.Refresh, req)

	assertStatus(t, rr, http.StatusOK)

	// 驗證回應設定了 HttpOnly cookie
	cookies := rr.Result().Cookies()
	var hasAccess, hasRefresh bool
	for _, c := range cookies {
		if c.Name == "access_token" {
			hasAccess = true
			assert.True(t, c.HttpOnly, "access_token cookie 應為 HttpOnly")
			assert.Equal(t, "/", c.Path)
			assert.Equal(t, http.SameSiteStrictMode, c.SameSite)
		}
		if c.Name == "refresh_token" {
			hasRefresh = true
			assert.True(t, c.HttpOnly, "refresh_token cookie 應為 HttpOnly")
			assert.Equal(t, "/api/auth/refresh", c.Path)
			assert.Equal(t, http.SameSiteStrictMode, c.SameSite)
		}
	}
	assert.True(t, hasAccess, "回應應設定 access_token cookie")
	assert.True(t, hasRefresh, "回應應設定 refresh_token cookie")

	// 驗證回應 body 不包含明文 token
	var body map[string]interface{}
	err = json.NewDecoder(rr.Body).Decode(&body)
	require.NoError(t, err)
	assert.Nil(t, body["accessToken"], "body 不應包含 accessToken")
	assert.Nil(t, body["refreshToken"], "body 不應包含 refreshToken")
}

func TestRefresh_ReadsCookieNotBody(t *testing.T) {
	jwtMgr := newTestJWTManager()
	user := newTestUser()
	mock := &mockUserService{getUser: user}
	h := makeHandler(mock, jwtMgr)

	refreshToken, err := jwtMgr.GenerateRefreshToken(user.ID)
	require.NoError(t, err)

	// 建立空 body 請求，refresh token 僅放在 cookie 中
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{
		Name:  "refresh_token",
		Value: refreshToken,
	})

	rr := executeRequest(h.Refresh, req)

	assertStatus(t, rr, http.StatusOK)

	// 驗證回應包含新的 Set-Cookie
	cookies := rr.Result().Cookies()
	var hasAccess bool
	for _, c := range cookies {
		if c.Name == "access_token" {
			hasAccess = true
		}
	}
	assert.True(t, hasAccess, "回應應設定新的 access_token cookie")
}

func TestRefresh_MissingCookie(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	// 空 body、無 cookie — 應回傳 401
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")

	rr := executeRequest(h.Refresh, req)

	assertStatus(t, rr, http.StatusUnauthorized)
	assertErrorCode(t, rr, "AUTH_TOKEN_EXPIRED")
}

func TestRefresh_ExpiredToken(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	// 直接簽出一個過期的 refresh token（exp 設為過去時間）
	user := newTestUser()
	expiredToken := makeExpiredRefreshToken(t, user.ID)

	// 過期 token 透過 cookie 傳遞
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: expiredToken})
	rr := executeRequest(h.Refresh, req)

	assertStatus(t, rr, http.StatusUnauthorized)
	assertErrorCode(t, rr, "AUTH_TOKEN_EXPIRED")
}

func TestRefresh_AccessTokenRejected(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	user := newTestUser()
	// 傳入 access token 而非 refresh token，應被拒絕
	accessToken, err := jwtMgr.GenerateAccessToken(user.ID, user.Email, user.Name)
	require.NoError(t, err)

	// 錯誤類型的 token 透過 cookie 傳遞
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: accessToken})
	rr := executeRequest(h.Refresh, req)

	assertStatus(t, rr, http.StatusUnauthorized)
	assertErrorCode(t, rr, "AUTH_TOKEN_EXPIRED")
}

func TestRefresh_EmptyToken(t *testing.T) {
	jwtMgr := newTestJWTManager()
	mock := &mockUserService{}
	h := makeHandler(mock, jwtMgr)

	// 空字串的 cookie value — 應回傳 401
	req := httptest.NewRequest("POST", "/api/auth/refresh", nil)
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: ""})
	rr := executeRequest(h.Refresh, req)

	assertStatus(t, rr, http.StatusUnauthorized)
	assertErrorCode(t, rr, "AUTH_TOKEN_EXPIRED")
}
