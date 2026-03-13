// Package service 實作業務邏輯層。
// 此檔案負責 refresh token session 的儲存與撤銷，使用 Ent Session entity。
package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/raymondchen/ly-backend/internal/ent/session"
)

// SessionService 管理 refresh token 的 JTI 記錄，提供撤銷機制
type SessionService struct {
	client *ent.Client
}

// NewSessionService 建立新的 SessionService 實例
func NewSessionService(client *ent.Client) *SessionService {
	return &SessionService{client: client}
}

// StoreRefreshToken 將 refresh token 的 JTI 寫入 sessions 資料表
func (s *SessionService) StoreRefreshToken(ctx context.Context, jti string, userID uuid.UUID, expiresAt time.Time) error {
	_, err := s.client.Session.Create().
		SetToken(jti).
		SetUserID(userID).
		SetExpiresAt(expiresAt).
		Save(ctx)
	if err != nil {
		return fmt.Errorf("storing refresh token jti: %w", err)
	}
	return nil
}

// ValidateRefreshToken 驗證 JTI 是否存在且尚未過期
func (s *SessionService) ValidateRefreshToken(ctx context.Context, jti string) (bool, error) {
	exists, err := s.client.Session.Query().
		Where(
			session.TokenEQ(jti),
			session.ExpiresAtGT(time.Now()),
		).
		Exist(ctx)
	if err != nil {
		return false, fmt.Errorf("validating refresh token jti: %w", err)
	}
	return exists, nil
}

// RevokeRefreshToken 刪除指定 JTI 的 session 記錄
func (s *SessionService) RevokeRefreshToken(ctx context.Context, jti string) error {
	_, err := s.client.Session.Delete().
		Where(session.TokenEQ(jti)).
		Exec(ctx)
	if err != nil {
		return fmt.Errorf("revoking refresh token jti: %w", err)
	}
	return nil
}

// CleanupExpired 清理所有已過期的 session 記錄（可定期執行）
func (s *SessionService) CleanupExpired(ctx context.Context) (int, error) {
	n, err := s.client.Session.Delete().
		Where(session.ExpiresAtLT(time.Now())).
		Exec(ctx)
	if err != nil {
		return 0, fmt.Errorf("cleaning up expired sessions: %w", err)
	}
	return n, nil
}
