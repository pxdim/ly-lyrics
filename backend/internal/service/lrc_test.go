// Package service 測試 LRC 歌詞解析與序列化功能。
package service

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ─────────────────────────────────────────────────────────────────────────────
// ParseTimeTag 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestParseTimeTag(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		tag         string
		expectedMs  int
		expectError bool
	}{
		{
			name:       "標準 2 位毫秒格式 [01:23.45]",
			tag:        "[01:23.45]",
			expectedMs: 83450, // 1*60000 + 23*1000 + 450
		},
		{
			name:       "3 位毫秒格式 [01:23.456]",
			tag:        "[01:23.456]",
			expectedMs: 83456,
		},
		{
			name:       "零時間 [00:00.00]",
			tag:        "[00:00.00]",
			expectedMs: 0,
		},
		{
			name:       "分鐘進位 [10:00.00]",
			tag:        "[10:00.00]",
			expectedMs: 600000,
		},
		{
			name:       "2 位毫秒補零 [00:00.01]",
			tag:        "[00:00.01]",
			expectedMs: 10, // "01" -> "010" -> 10ms
		},
		{
			name:       "3 位毫秒 [00:00.001]",
			tag:        "[00:00.001]",
			expectedMs: 1,
		},
		{
			name:        "無效格式應失敗",
			tag:         "[invalid]",
			expectError: true,
		},
		{
			name:        "無括號應失敗",
			tag:         "01:23.45",
			expectError: true,
		},
		{
			name:        "空字串應失敗",
			tag:         "",
			expectError: true,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			ms, err := ParseTimeTag(tc.tag)
			if tc.expectError {
				assert.Error(t, err)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.expectedMs, ms)
			}
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// MsToTimeTag 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestMsToTimeTag(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		ms       int
		expected string
	}{
		{
			name:     "零毫秒",
			ms:       0,
			expected: "[00:00.00]",
		},
		{
			name:     "83450 毫秒 → [01:23.45]",
			ms:       83450,
			expected: "[01:23.45]",
		},
		{
			name:     "600000 毫秒（10 分鐘）",
			ms:       600000,
			expected: "[10:00.00]",
		},
		{
			name:     "負數毫秒視為 0",
			ms:       -100,
			expected: "[00:00.00]",
		},
		{
			name:     "1 毫秒 → 百分之一秒截斷",
			ms:       1,
			expected: "[00:00.00]", // 1ms → centiseconds = 0
		},
		{
			name:     "10 毫秒",
			ms:       10,
			expected: "[00:00.01]",
		},
		{
			name:     "990 毫秒",
			ms:       990,
			expected: "[00:00.99]",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			result := MsToTimeTag(tc.ms)
			assert.Equal(t, tc.expected, result)
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// ParseLRC 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestParseLRC_WithTimestamps(t *testing.T) {
	t.Parallel()

	t.Run("解析含時間戳記的標準 LRC", func(t *testing.T) {
		t.Parallel()
		content := `[ti:測試歌曲]
[ar:測試藝人]
[al:測試專輯]
[00:00.00]第一行歌詞
[00:05.50]第二行歌詞
[00:10.00]第三行歌詞`

		lrc := ParseLRC(content)

		require.NotNil(t, lrc)
		assert.Equal(t, "測試歌曲", lrc.Metadata.Title)
		assert.Equal(t, "測試藝人", lrc.Metadata.Artist)
		assert.Equal(t, "測試專輯", lrc.Metadata.Album)

		require.Len(t, lrc.Lines, 3)
		assert.Equal(t, 0, lrc.Lines[0].Time)
		assert.Equal(t, "第一行歌詞", lrc.Lines[0].Text)
		assert.Equal(t, 5500, lrc.Lines[1].Time)
		assert.Equal(t, "第二行歌詞", lrc.Lines[1].Text)
		assert.Equal(t, 10000, lrc.Lines[2].Time)
		assert.Equal(t, "第三行歌詞", lrc.Lines[2].Text)
	})

	t.Run("歌詞行自動依時間排序", func(t *testing.T) {
		t.Parallel()
		// 故意打亂順序
		content := `[00:10.00]第三行
[00:00.00]第一行
[00:05.00]第二行`

		lrc := ParseLRC(content)
		require.Len(t, lrc.Lines, 3)
		assert.Equal(t, 0, lrc.Lines[0].Time, "第一行應在最前面")
		assert.Equal(t, 5000, lrc.Lines[1].Time)
		assert.Equal(t, 10000, lrc.Lines[2].Time)
	})

	t.Run("同一行多個時間標籤（展開為多行）", func(t *testing.T) {
		t.Parallel()
		content := "[00:01.00][00:30.00]副歌歌詞"

		lrc := ParseLRC(content)
		require.Len(t, lrc.Lines, 2)
		// 依時間排序後
		assert.Equal(t, 1000, lrc.Lines[0].Time)
		assert.Equal(t, "副歌歌詞", lrc.Lines[0].Text)
		assert.Equal(t, 30000, lrc.Lines[1].Time)
		assert.Equal(t, "副歌歌詞", lrc.Lines[1].Text)
	})
}

func TestParseLRC_WithoutTimestamps(t *testing.T) {
	t.Parallel()

	t.Run("只有元資料無時間戳記", func(t *testing.T) {
		t.Parallel()
		content := `[ti:純歌詞]
[ar:藝人名稱]
這是一般文字，沒有時間標籤`

		lrc := ParseLRC(content)
		require.NotNil(t, lrc)
		assert.Equal(t, "純歌詞", lrc.Metadata.Title)
		// 沒有時間標籤的行應被忽略
		assert.Empty(t, lrc.Lines)
	})

	t.Run("空內容回傳空的 LrcFile", func(t *testing.T) {
		t.Parallel()
		lrc := ParseLRC("")
		require.NotNil(t, lrc)
		assert.Empty(t, lrc.Lines)
		assert.Equal(t, LrcMetadata{}, lrc.Metadata)
	})

	t.Run("完全空白行被忽略", func(t *testing.T) {
		t.Parallel()
		content := "\n\n\n   \n[00:01.00]歌詞\n\n"
		lrc := ParseLRC(content)
		require.Len(t, lrc.Lines, 1)
		assert.Equal(t, "歌詞", lrc.Lines[0].Text)
	})
}

func TestParseLRC_Metadata(t *testing.T) {
	t.Parallel()

	t.Run("解析所有元資料欄位（縮寫格式）", func(t *testing.T) {
		t.Parallel()
		content := `[ti:歌曲標題]
[ar:藝人]
[al:專輯]
[au:作者]
[by:製作者]
[offset:500]
[00:01.00]歌詞`

		lrc := ParseLRC(content)
		assert.Equal(t, "歌曲標題", lrc.Metadata.Title)
		assert.Equal(t, "藝人", lrc.Metadata.Artist)
		assert.Equal(t, "專輯", lrc.Metadata.Album)
		assert.Equal(t, "作者", lrc.Metadata.Author)
		assert.Equal(t, "製作者", lrc.Metadata.By)
		assert.Equal(t, 500, lrc.Metadata.Offset)
	})

	t.Run("大小寫不敏感的元資料 key", func(t *testing.T) {
		t.Parallel()
		content := "[TI:大寫標題]\n[AR:大寫藝人]\n[00:01.00]歌詞"
		lrc := ParseLRC(content)
		assert.Equal(t, "大寫標題", lrc.Metadata.Title)
		assert.Equal(t, "大寫藝人", lrc.Metadata.Artist)
	})

	t.Run("忽略 re 和 ve 元資料 key", func(t *testing.T) {
		t.Parallel()
		content := "[re:SomeEditor]\n[ve:1.0]\n[00:01.00]歌詞"
		lrc := ParseLRC(content)
		// 不應出錯，也不影響其他欄位
		require.Len(t, lrc.Lines, 1)
	})

	t.Run("length 以時間格式解析", func(t *testing.T) {
		t.Parallel()
		content := "[length:03:30.00]\n[00:01.00]歌詞"
		lrc := ParseLRC(content)
		// 3分30秒 = 210000ms
		assert.Equal(t, 210000, lrc.Metadata.Length)
	})

	t.Run("length 以純毫秒數解析", func(t *testing.T) {
		t.Parallel()
		content := "[length:210000]\n[00:01.00]歌詞"
		lrc := ParseLRC(content)
		assert.Equal(t, 210000, lrc.Metadata.Length)
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// SerializeLRC 測試
// ─────────────────────────────────────────────────────────────────────────────

func TestSerializeLRC(t *testing.T) {
	t.Parallel()

	t.Run("序列化基本 LRC 結構", func(t *testing.T) {
		t.Parallel()
		lrc := &LrcFile{
			Metadata: LrcMetadata{
				Title:  "測試歌曲",
				Artist: "測試藝人",
			},
			Lines: []LrcLine{
				{Time: 0, Text: "第一行"},
				{Time: 5000, Text: "第二行"},
			},
		}

		output := SerializeLRC(lrc)
		assert.Contains(t, output, "[ti:測試歌曲]")
		assert.Contains(t, output, "[ar:測試藝人]")
		assert.Contains(t, output, "[00:00.00]第一行")
		assert.Contains(t, output, "[00:05.00]第二行")
	})

	t.Run("空元資料不輸出元資料標籤", func(t *testing.T) {
		t.Parallel()
		lrc := &LrcFile{
			Lines: []LrcLine{
				{Time: 1000, Text: "歌詞"},
			},
		}

		output := SerializeLRC(lrc)
		assert.NotContains(t, output, "[ti:")
		assert.NotContains(t, output, "[ar:")
		assert.Contains(t, output, "[00:01.00]歌詞")
	})

	t.Run("offset 為 0 時不輸出", func(t *testing.T) {
		t.Parallel()
		lrc := &LrcFile{
			Metadata: LrcMetadata{Offset: 0},
			Lines:    []LrcLine{{Time: 1000, Text: "歌詞"}},
		}
		output := SerializeLRC(lrc)
		assert.NotContains(t, output, "[offset:")
	})

	t.Run("非零 offset 輸出", func(t *testing.T) {
		t.Parallel()
		lrc := &LrcFile{
			Metadata: LrcMetadata{Offset: -200},
			Lines:    []LrcLine{{Time: 1000, Text: "歌詞"}},
		}
		output := SerializeLRC(lrc)
		assert.Contains(t, output, "[offset:-200]")
	})

	t.Run("空 LRC 只輸出空字串或換行", func(t *testing.T) {
		t.Parallel()
		lrc := &LrcFile{
			Lines: []LrcLine{},
		}
		output := SerializeLRC(lrc)
		assert.Empty(t, strings.TrimSpace(output))
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// Round-trip 測試（解析 → 序列化 → 再解析）
// ─────────────────────────────────────────────────────────────────────────────

func TestLRCRoundTrip(t *testing.T) {
	t.Parallel()

	t.Run("完整 round-trip：解析 → 序列化 → 再解析結果一致", func(t *testing.T) {
		t.Parallel()
		original := `[ti:圓形測試]
[ar:測試藝人]
[al:測試專輯]
[00:00.00]第一行歌詞
[00:05.50]第二行歌詞
[01:00.00]第三行歌詞
`
		// 第一次解析
		lrc1 := ParseLRC(original)
		require.NotNil(t, lrc1)

		// 序列化
		serialized := SerializeLRC(lrc1)
		assert.NotEmpty(t, serialized)

		// 再次解析
		lrc2 := ParseLRC(serialized)
		require.NotNil(t, lrc2)

		// 元資料應一致
		assert.Equal(t, lrc1.Metadata.Title, lrc2.Metadata.Title)
		assert.Equal(t, lrc1.Metadata.Artist, lrc2.Metadata.Artist)
		assert.Equal(t, lrc1.Metadata.Album, lrc2.Metadata.Album)

		// 歌詞行數應一致
		require.Len(t, lrc2.Lines, len(lrc1.Lines))

		// 每行時間與文字應一致
		for i := range lrc1.Lines {
			// 注意：SerializeLRC 輸出 2 位百分之一秒，再解析後毫秒可能有截斷
			// 只比較 centisecond 精度（10ms）
			assert.Equal(t, lrc1.Lines[i].Time/10, lrc2.Lines[i].Time/10,
				"第 %d 行時間誤差超過 10ms", i)
			assert.Equal(t, lrc1.Lines[i].Text, lrc2.Lines[i].Text,
				"第 %d 行文字不一致", i)
		}
	})

	t.Run("無元資料 round-trip", func(t *testing.T) {
		t.Parallel()
		lrc1 := &LrcFile{
			Lines: []LrcLine{
				{Time: 0, Text: "Hello"},
				{Time: 1000, Text: "World"},
			},
		}

		serialized := SerializeLRC(lrc1)
		lrc2 := ParseLRC(serialized)

		require.Len(t, lrc2.Lines, 2)
		assert.Equal(t, lrc1.Lines[0].Text, lrc2.Lines[0].Text)
		assert.Equal(t, lrc1.Lines[1].Text, lrc2.Lines[1].Text)
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// 邊界條件測試
// ─────────────────────────────────────────────────────────────────────────────

func TestParseLRC_EdgeCases(t *testing.T) {
	t.Parallel()

	t.Run("只有 CRLF 換行的 LRC", func(t *testing.T) {
		t.Parallel()
		content := "[ti:標題]\r\n[00:01.00]歌詞\r\n"
		lrc := ParseLRC(content)
		// "\r\n" split by "\n" 後每行有尾隨 "\r"，TrimSpace 應處理
		assert.Equal(t, "標題", lrc.Metadata.Title)
	})

	t.Run("歌詞文字含空白被保留", func(t *testing.T) {
		t.Parallel()
		content := "[00:01.00]  含前後空白  "
		lrc := ParseLRC(content)
		require.Len(t, lrc.Lines, 1)
		// TrimSpace 後文字
		assert.Equal(t, "含前後空白", lrc.Lines[0].Text)
	})

	t.Run("3 位毫秒時間標籤解析正確", func(t *testing.T) {
		t.Parallel()
		content := "[00:01.123]歌詞"
		lrc := ParseLRC(content)
		require.Len(t, lrc.Lines, 1)
		assert.Equal(t, 1123, lrc.Lines[0].Time)
	})
}
