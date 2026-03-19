// Package service 提供測試用 Ent Client 建構工具。
// 使用 SQLite in-memory 資料庫，無需外部服務。
package service

import (
	"context"
	"database/sql"
	"testing"

	"entgo.io/ent/dialect"
	entsql "entgo.io/ent/dialect/sql"
	_ "modernc.org/sqlite" // 純 Go SQLite driver，註冊為 "sqlite"

	"github.com/raymondchen/ly-backend/internal/ent"
	"github.com/stretchr/testify/require"
)

// newTestEntClient 建立使用 SQLite in-memory 的測試用 Ent Client。
// 自動建立 schema 並在測試結束時關閉連線。
// modernc.org/sqlite driver 名稱為 "sqlite"，需手動包裝為 Ent dialect.SQLite ("sqlite3")。
func newTestEntClient(t *testing.T) *ent.Client {
	t.Helper()

	// modernc.org/sqlite 的 driver 名稱為 "sqlite"
	// 使用 _pragma=foreign_keys(1) 啟用外鍵約束
	db, err := sql.Open("sqlite", "file::memory:?_pragma=foreign_keys(1)")
	require.NoError(t, err, "無法開啟 SQLite 連線")

	// 包裝為 Ent driver（使用 dialect.SQLite = "sqlite3"）
	drv := entsql.OpenDB(dialect.SQLite, db)
	client := ent.NewClient(ent.Driver(drv))

	// 自動建立 schema（建表）
	err = client.Schema.Create(context.Background())
	require.NoError(t, err, "無法建立 schema")

	t.Cleanup(func() {
		client.Close()
	})

	return client
}
