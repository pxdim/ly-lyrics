// Package service 實作業務邏輯層。
// 此檔案負責使用者相關業務邏輯。
package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/auth"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/raymondchen/ly-backend/internal/ent/user"
)

// DemoUserID 未認證使用者的預設 User ID
var DemoUserID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

// EnsureDemoUser 確保 demo user 存在（Create 時需要 FK 約束）
func EnsureDemoUser(ctx context.Context, client *ent.Client) error {
	exists, err := client.User.Get(ctx, DemoUserID)
	if err != nil && !ent.IsNotFound(err) {
		return fmt.Errorf("checking demo user: %w", err)
	}
	if exists != nil {
		return nil
	}

	// 建立 demo user（password_hash 為 NOT NULL，使用 bcrypt placeholder）
	_, err = client.User.Create().
		SetID(DemoUserID).
		SetEmail("demo@ly-lyrics.local").
		SetPasswordHash("$2a$10$demoHashPlaceholder000000000000000000000000000").
		SetName("Demo User").
		SetEmailVerified(true).
		Save(ctx)
	if err != nil {
		// 可能另一個 goroutine 同時建立了，忽略 unique 衝突
		if ent.IsConstraintError(err) {
			return nil
		}
		return fmt.Errorf("creating demo user: %w", err)
	}
	return nil
}

// ErrEmailExists 表示該 email 已被註冊
var ErrEmailExists = fmt.Errorf("email already registered")

// UserService 封裝使用者相關的業務操作
type UserService struct {
	client *ent.Client
}

// NewUserService 建立新的 UserService 實例
func NewUserService(client *ent.Client) *UserService {
	return &UserService{client: client}
}

// GetByEmail 根據 email 查詢使用者，若不存在回傳 nil
func (s *UserService) GetByEmail(ctx context.Context, email string) (*ent.User, error) {
	u, err := s.client.User.Query().
		Where(user.EmailEQ(strings.ToLower(email))).
		Only(ctx)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("querying user by email: %w", err)
	}
	return u, nil
}

// GetByID 根據 ID 查詢使用者，若不存在回傳 nil
func (s *UserService) GetByID(ctx context.Context, id uuid.UUID) (*ent.User, error) {
	u, err := s.client.User.Get(ctx, id)
	if err != nil {
		if ent.IsNotFound(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("getting user %s: %w", id, err)
	}
	return u, nil
}

// CreateUser 建立新使用者，密碼會經過 bcrypt 雜湊處理
func (s *UserService) CreateUser(ctx context.Context, email, password string, name *string) (*ent.User, error) {
	hashedPw, err := auth.HashPassword(password)
	if err != nil {
		return nil, fmt.Errorf("hashing password: %w", err)
	}
	builder := s.client.User.Create().
		SetEmail(strings.ToLower(email)).
		SetPasswordHash(hashedPw).
		SetEmailVerified(false)
	if name != nil {
		builder = builder.SetName(*name)
	}
	u, err := builder.Save(ctx)
	if err != nil {
		if ent.IsConstraintError(err) {
			return nil, ErrEmailExists
		}
		return nil, fmt.Errorf("creating user: %w", err)
	}
	return u, nil
}

// VerifyCredentials 驗證使用者帳號密碼，驗證失敗回傳 nil
func (s *UserService) VerifyCredentials(ctx context.Context, email, password string) (*ent.User, error) {
	u, err := s.GetByEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if u == nil {
		return nil, nil
	}
	if err := auth.VerifyPassword(password, u.PasswordHash); err != nil {
		return nil, nil
	}
	return u, nil
}
