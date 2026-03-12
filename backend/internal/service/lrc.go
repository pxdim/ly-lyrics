// Package service 實作業務邏輯層。
// 此檔案負責 LRC 歌詞檔案的解析與序列化。
package service

import (
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// LrcLine 一行歌詞
type LrcLine struct {
	Time int    `json:"time"` // 毫秒
	Text string `json:"text"`
}

// LrcMetadata LRC 檔案元資料
type LrcMetadata struct {
	Title  string `json:"title,omitempty"`
	Artist string `json:"artist,omitempty"`
	Album  string `json:"album,omitempty"`
	Author string `json:"author,omitempty"`
	Length int    `json:"length,omitempty"` // 毫秒
	Offset int    `json:"offset,omitempty"` // 毫秒
	By     string `json:"by,omitempty"`
}

// LrcFile 解析後的 LRC 檔案
type LrcFile struct {
	Metadata LrcMetadata `json:"metadata"`
	Lines    []LrcLine   `json:"lines"`
}

// 時間標籤正規表達式：[mm:ss.xx] 或 [mm:ss.xxx]
var timeTagRegex = regexp.MustCompile(`\[(\d{2}):(\d{2})\.(\d{2,3})\]`)

// 元資料標籤正規表達式：[key:value]
var metaTagRegex = regexp.MustCompile(`(?i)^\[([a-z]+):([^\]]+)\]$`)

// metaKeyNormalize 將縮寫 key 正規化為完整名稱
var metaKeyNormalize = map[string]string{
	"ti":     "title",
	"title":  "title",
	"ar":     "artist",
	"artist": "artist",
	"al":     "album",
	"album":  "album",
	"au":     "author",
	"author": "author",
	"length": "length",
	"offset": "offset",
	"by":     "by",
}

// 忽略的元資料 key（不處理但不當作錯誤）
var ignoredMetaKeys = map[string]bool{
	"re": true,
	"ve": true,
}

// ParseTimeTag 解析時間標籤為毫秒
// "[01:23.45]" → 83450, "[01:23.456]" → 83456
func ParseTimeTag(tag string) (int, error) {
	matches := timeTagRegex.FindStringSubmatch(tag)
	if matches == nil {
		return 0, fmt.Errorf("無效的時間標籤格式: %s", tag)
	}

	minutes, err := strconv.Atoi(matches[1])
	if err != nil {
		return 0, fmt.Errorf("解析分鐘失敗: %w", err)
	}

	seconds, err := strconv.Atoi(matches[2])
	if err != nil {
		return 0, fmt.Errorf("解析秒數失敗: %w", err)
	}

	// 處理毫秒部分：2 位數需補零到 3 位
	msStr := matches[3]
	if len(msStr) == 2 {
		msStr += "0"
	}
	milliseconds, err := strconv.Atoi(msStr)
	if err != nil {
		return 0, fmt.Errorf("解析毫秒失敗: %w", err)
	}

	return minutes*60000 + seconds*1000 + milliseconds, nil
}

// MsToTimeTag 毫秒轉時間標籤
// 83450 → "[01:23.45]"
func MsToTimeTag(ms int) string {
	if ms < 0 {
		ms = 0
	}
	totalSeconds := ms / 1000
	minutes := totalSeconds / 60
	seconds := totalSeconds % 60
	// 取百分之一秒（2 位數）
	centiseconds := (ms % 1000) / 10

	return fmt.Sprintf("[%02d:%02d.%02d]", minutes, seconds, centiseconds)
}

// ParseLRC 解析 LRC 檔案內容
func ParseLRC(content string) *LrcFile {
	lrc := &LrcFile{
		Lines: []LrcLine{},
	}

	lines := strings.Split(content, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// 嘗試解析為元資料標籤（整行只有一個 [key:value]）
		if metaMatch := metaTagRegex.FindStringSubmatch(line); metaMatch != nil {
			key := strings.ToLower(metaMatch[1])
			value := strings.TrimSpace(metaMatch[2])

			// 檢查是否為已知元資料 key
			if normalizedKey, ok := metaKeyNormalize[key]; ok {
				setMetadata(&lrc.Metadata, normalizedKey, value)
				continue
			}
			// 忽略已知但不處理的 key
			if ignoredMetaKeys[key] {
				continue
			}
		}

		// 嘗試解析時間標籤行
		timeMatches := timeTagRegex.FindAllStringIndex(line, -1)
		if len(timeMatches) == 0 {
			continue
		}

		// 提取所有時間標籤
		var times []int
		for _, loc := range timeMatches {
			tag := line[loc[0]:loc[1]]
			ms, err := ParseTimeTag(tag)
			if err != nil {
				continue
			}
			times = append(times, ms)
		}

		if len(times) == 0 {
			continue
		}

		// 提取歌詞文字（最後一個時間標籤之後的內容）
		lastTagEnd := timeMatches[len(timeMatches)-1][1]
		text := strings.TrimSpace(line[lastTagEnd:])

		// 每個時間標籤對應一個 LrcLine
		for _, t := range times {
			lrc.Lines = append(lrc.Lines, LrcLine{
				Time: t,
				Text: text,
			})
		}
	}

	// 依時間排序
	sort.Slice(lrc.Lines, func(i, j int) bool {
		return lrc.Lines[i].Time < lrc.Lines[j].Time
	})

	return lrc
}

// SerializeLRC 序列化為 LRC 格式字串
func SerializeLRC(lrc *LrcFile) string {
	var sb strings.Builder

	// 輸出元資料
	if lrc.Metadata.Title != "" {
		sb.WriteString(fmt.Sprintf("[ti:%s]\n", lrc.Metadata.Title))
	}
	if lrc.Metadata.Artist != "" {
		sb.WriteString(fmt.Sprintf("[ar:%s]\n", lrc.Metadata.Artist))
	}
	if lrc.Metadata.Album != "" {
		sb.WriteString(fmt.Sprintf("[al:%s]\n", lrc.Metadata.Album))
	}
	if lrc.Metadata.Author != "" {
		sb.WriteString(fmt.Sprintf("[au:%s]\n", lrc.Metadata.Author))
	}
	if lrc.Metadata.Length > 0 {
		sb.WriteString(fmt.Sprintf("[length:%s]\n", MsToTimeTag(lrc.Metadata.Length)[1:len(MsToTimeTag(lrc.Metadata.Length))-1]))
	}
	if lrc.Metadata.Offset != 0 {
		sb.WriteString(fmt.Sprintf("[offset:%d]\n", lrc.Metadata.Offset))
	}
	if lrc.Metadata.By != "" {
		sb.WriteString(fmt.Sprintf("[by:%s]\n", lrc.Metadata.By))
	}

	// 輸出歌詞行
	for _, line := range lrc.Lines {
		sb.WriteString(fmt.Sprintf("%s%s\n", MsToTimeTag(line.Time), line.Text))
	}

	return sb.String()
}

// setMetadata 設定元資料欄位
func setMetadata(m *LrcMetadata, key, value string) {
	switch key {
	case "title":
		m.Title = value
	case "artist":
		m.Artist = value
	case "album":
		m.Album = value
	case "author":
		m.Author = value
	case "length":
		// length 可能是 mm:ss.xx 格式或純毫秒數
		if ms, err := strconv.Atoi(value); err == nil {
			m.Length = ms
		} else {
			// 嘗試解析為時間標籤格式
			tag := fmt.Sprintf("[%s]", value)
			if ms, err := ParseTimeTag(tag); err == nil {
				m.Length = ms
			}
		}
	case "offset":
		if ms, err := strconv.Atoi(value); err == nil {
			m.Offset = ms
		}
	case "by":
		m.By = value
	}
}
