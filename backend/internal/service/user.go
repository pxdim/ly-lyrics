// Package service 實作業務邏輯層。
// 此檔案負責使用者相關業務邏輯。
package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/raymondchen/ly-backend/internal/ent"
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
