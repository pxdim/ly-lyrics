// Package auth 測試密碼雜湊與驗證功能。
package auth

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func TestHashPassword(t *testing.T) {
	t.Parallel()

	t.Run("正常密碼（8 字元）", func(t *testing.T) {
		t.Parallel()
		hash, err := HashPassword("password")
		require.NoError(t, err)
		assert.NotEmpty(t, hash)
		// bcrypt 雜湊以 $2a$ 或 $2b$ 開頭
		assert.True(t, strings.HasPrefix(hash, "$2"), "雜湊值應以 $2 開頭，實際值: %s", hash)
	})

	t.Run("正常密碼（中間長度）", func(t *testing.T) {
		t.Parallel()
		hash, err := HashPassword("mySecurePass123!")
		require.NoError(t, err)
		assert.NotEmpty(t, hash)
	})

	t.Run("72 字元邊界（最大合法長度）", func(t *testing.T) {
		t.Parallel()
		// 72 個 ASCII 字元 = 剛好在邊界
		password := strings.Repeat("a", 72)
		hash, err := HashPassword(password)
		require.NoError(t, err)
		assert.NotEmpty(t, hash)
	})

	t.Run("7 字元（太短，應失敗）", func(t *testing.T) {
		t.Parallel()
		_, err := HashPassword("short12")
		require.Error(t, err)
		assert.Contains(t, err.Error(), "8-72")
	})

	t.Run("73 字元（太長，應失敗）", func(t *testing.T) {
		t.Parallel()
		password := strings.Repeat("a", 73)
		_, err := HashPassword(password)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "8-72")
	})

	t.Run("Unicode 中文密碼（8 個中文字 = 8 runes）", func(t *testing.T) {
		t.Parallel()
		// 每個中文字是 1 rune，但佔 3 bytes
		// 8 runes 應通過驗證
		password := "我愛台灣音樂系統"
		hash, err := HashPassword(password)
		require.NoError(t, err)
		assert.NotEmpty(t, hash)
	})

	t.Run("Unicode 中文密碼（7 個中文字，應失敗）", func(t *testing.T) {
		t.Parallel()
		// 7 runes 應失敗
		password := "我愛台灣音樂系"
		_, err := HashPassword(password)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "8-72")
	})

	t.Run("72 個中文字（72 runes 但 216 bytes，bcrypt 限制 72 bytes 會失敗）", func(t *testing.T) {
		t.Parallel()
		// 72 個中文字 = 72 runes，但每個中文字 3 bytes → 共 216 bytes
		// HashPassword 的 rune 長度檢查會通過（72 runes ≤ 72）
		// 但底層 bcrypt.GenerateFromPassword 對 byte 長度有 72 bytes 硬限制
		// 因此此操作實際上會回傳 bcrypt 的 "password length exceeds 72 bytes" 錯誤
		// 注意：這是現有實作的已知行為，使用者應避免輸入超過 72 bytes 的密碼
		password := strings.Repeat("中", 72)
		_, err := HashPassword(password)
		// bcrypt 底層限制 72 bytes，216 bytes 會失敗
		assert.Error(t, err, "72 個中文字 = 216 bytes，超過 bcrypt 72-byte 限制")
	})

	t.Run("73 個中文字（rune 超出，應失敗）", func(t *testing.T) {
		t.Parallel()
		password := strings.Repeat("中", 73)
		_, err := HashPassword(password)
		require.Error(t, err)
	})

	t.Run("混合 ASCII + Unicode（rune 計數正確）", func(t *testing.T) {
		t.Parallel()
		// "abc" (3 bytes, 3 runes) + "中文密碼abc" (7 runes) = 10 runes 應通過
		password := "abcde中文密碼"
		hash, err := HashPassword(password)
		require.NoError(t, err)
		assert.NotEmpty(t, hash)
	})

	t.Run("雜湊值每次都不同（加鹽）", func(t *testing.T) {
		t.Parallel()
		hash1, err1 := HashPassword("samePassword1")
		hash2, err2 := HashPassword("samePassword1")
		require.NoError(t, err1)
		require.NoError(t, err2)
		// bcrypt 每次應產生不同的雜湊（因為 salt 不同）
		assert.NotEqual(t, hash1, hash2, "相同密碼的兩次雜湊值不應相同")
	})
}

func TestVerifyPassword(t *testing.T) {
	t.Parallel()

	t.Run("正確密碼驗證成功", func(t *testing.T) {
		t.Parallel()
		password := "correctPassword123"
		hash, err := HashPassword(password)
		require.NoError(t, err)

		err = VerifyPassword(password, hash)
		assert.NoError(t, err)
	})

	t.Run("錯誤密碼驗證失敗", func(t *testing.T) {
		t.Parallel()
		password := "correctPassword123"
		hash, err := HashPassword(password)
		require.NoError(t, err)

		err = VerifyPassword("wrongPassword456", hash)
		assert.Error(t, err)
	})

	t.Run("空白密碼驗證失敗", func(t *testing.T) {
		t.Parallel()
		password := "validPassword123"
		hash, err := HashPassword(password)
		require.NoError(t, err)

		err = VerifyPassword("", hash)
		assert.Error(t, err)
	})

	t.Run("Unicode 密碼 Go 雜湊後 Go 驗證", func(t *testing.T) {
		t.Parallel()
		password := "我愛台灣音樂系統"
		hash, err := HashPassword(password)
		require.NoError(t, err)

		err = VerifyPassword(password, hash)
		assert.NoError(t, err)
	})

	t.Run("Unicode 密碼驗證錯誤密碼失敗", func(t *testing.T) {
		t.Parallel()
		hash, err := HashPassword("我愛台灣音樂系統")
		require.NoError(t, err)

		err = VerifyPassword("我愛台灣音樂系統！", hash)
		assert.Error(t, err)
	})

	t.Run("無效的雜湊字串應回傳錯誤", func(t *testing.T) {
		t.Parallel()
		err := VerifyPassword("somePassword", "not-a-valid-hash")
		assert.Error(t, err)
	})
}

func TestBcryptCost(t *testing.T) {
	t.Parallel()

	t.Run("確認 bcrypt cost 為 10", func(t *testing.T) {
		t.Parallel()
		hash, err := HashPassword("testPassword123")
		require.NoError(t, err)

		cost, err := bcrypt.Cost([]byte(hash))
		require.NoError(t, err)
		assert.Equal(t, 10, cost, "bcrypt cost 應為 10")
	})
}

// TestHashPasswordTableDriven 使用表格驅動測試密碼長度邊界
func TestHashPasswordTableDriven(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		password    string
		expectError bool
	}{
		{
			name:        "7 個 ASCII 字元（太短）",
			password:    "abc1234",
			expectError: true,
		},
		{
			name:        "8 個 ASCII 字元（最短合法）",
			password:    "abcd1234",
			expectError: false,
		},
		{
			name:        "72 個 ASCII 字元（最長合法）",
			password:    strings.Repeat("x", 72),
			expectError: false,
		},
		{
			name:        "73 個 ASCII 字元（太長）",
			password:    strings.Repeat("x", 73),
			expectError: true,
		},
		{
			name:        "8 個中文字（8 runes，合法）",
			password:    "一二三四五六七八",
			expectError: false,
		},
		{
			name:        "7 個中文字（7 runes，太短）",
			password:    "一二三四五六七",
			expectError: true,
		},
	}

	for _, tc := range tests {
		tc := tc // 避免閉包陷阱
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			_, err := HashPassword(tc.password)
			if tc.expectError {
				assert.Error(t, err, "預期應回傳錯誤")
			} else {
				assert.NoError(t, err, "預期應成功")
			}
		})
	}
}
