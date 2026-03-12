// Package redis 封裝 Redis 客戶端操作。
// 此檔案負責 Redis 連線初始化與基礎操作。
package redis

import (
	"context"
	"fmt"
	"log/slog"

	goredis "github.com/redis/go-redis/v9"
)

// Client 封裝 Redis 連線
type Client struct {
	rdb *goredis.Client
}

// New 建立 Redis client，接受標準 Redis URL（例如 redis://default:password@host:6379）
func New(redisURL string) (*Client, error) {
	opts, err := goredis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Redis URL: %w", err)
	}

	rdb := goredis.NewClient(opts)

	// 測試連線
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping Redis: %w", err)
	}

	slog.Info("Redis connected", "addr", opts.Addr)

	return &Client{rdb: rdb}, nil
}

// Close 關閉 Redis 連線
func (c *Client) Close() error {
	return c.rdb.Close()
}

// Ping 測試 Redis 連線是否正常
func (c *Client) Ping(ctx context.Context) error {
	return c.rdb.Ping(ctx).Err()
}
