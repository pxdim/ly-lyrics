package provider_test

import (
	"testing"
	"time"

	"github.com/raymondchen/ly-backend/internal/provider"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCache_SetAndGet(t *testing.T) {
	c := provider.NewTTLCache(1 * time.Minute)
	defer c.Stop()

	result := &provider.LyricsResult{
		ID:    "test-1",
		Title: "Test Song",
	}
	c.Set("test-1", result)

	got, ok := c.Get("test-1")
	require.True(t, ok, "快取應該命中")
	assert.Equal(t, "Test Song", got.Title)
}

func TestCache_ExpiredEntry(t *testing.T) {
	c := provider.NewTTLCache(1 * time.Millisecond)
	defer c.Stop()

	c.Set("test-1", &provider.LyricsResult{ID: "test-1"})
	time.Sleep(5 * time.Millisecond)

	_, ok := c.Get("test-1")
	assert.False(t, ok, "過期項目應回傳 false")
}

func TestCache_Miss(t *testing.T) {
	c := provider.NewTTLCache(1 * time.Minute)
	defer c.Stop()

	_, ok := c.Get("nonexistent")
	assert.False(t, ok, "不存在的項目應回傳 false")
}
