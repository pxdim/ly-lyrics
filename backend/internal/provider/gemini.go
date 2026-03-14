package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

const geminiDefaultBaseURL = "https://generativelanguage.googleapis.com"

// geminiLyricsResult Gemini 回傳的歌詞結構
type geminiLyricsResult struct {
	Title  string `json:"title"`
	Artist string `json:"artist"`
	Lyrics string `json:"lyrics"`
}

// Gemini Google Gemini AI 歌詞提供者
type Gemini struct {
	client  *http.Client
	apiKey  string
	baseURL string
	cache   *TTLCache
}

// NewGemini 建立 Gemini provider
func NewGemini(client *http.Client, apiKey, baseURL string) *Gemini {
	if baseURL == "" {
		baseURL = geminiDefaultBaseURL
	}
	return &Gemini{
		client:  client,
		apiKey:  apiKey,
		baseURL: baseURL,
		cache:   NewTTLCache(10 * time.Minute),
	}
}

func (g *Gemini) Name() string { return "gemini" }

func (g *Gemini) Search(ctx context.Context, req SearchRequest) ([]LyricsResult, error) {
	prompt := g.buildPrompt(req)

	reqBody := map[string]any{
		"contents": []map[string]any{
			{
				"parts": []map[string]any{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]any{
			"temperature":      0.1,
			"responseMimeType": "text/plain",
		},
	}

	bodyBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("gemini: 序列化請求失敗: %w", err)
	}

	reqURL := fmt.Sprintf("%s/v1beta/models/gemini-2.0-flash:generateContent", g.baseURL)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("gemini: 建立請求失敗: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-goog-api-key", g.apiKey)

	resp, err := g.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("gemini: 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("gemini: HTTP %d", resp.StatusCode)
	}

	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
		return nil, fmt.Errorf("gemini: 解碼失敗: %w", err)
	}

	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, nil
	}

	text := geminiResp.Candidates[0].Content.Parts[0].Text
	text = strings.TrimSpace(text)
	text = strings.TrimPrefix(text, "```json")
	text = strings.TrimSuffix(text, "```")
	text = strings.TrimSpace(text)

	var parsed []geminiLyricsResult
	if err := json.Unmarshal([]byte(text), &parsed); err != nil {
		return nil, nil // AI 回傳格式異常時不報錯，回傳空結果
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}
	if len(parsed) > limit {
		parsed = parsed[:limit]
	}

	results := make([]LyricsResult, 0, len(parsed))
	for _, p := range parsed {
		id := fmt.Sprintf("gemini-%s", uuid.New().String()[:8])
		result := LyricsResult{
			ID:              id,
			Title:           p.Title,
			Artist:          p.Artist,
			Source:          "gemini",
			Confidence:      "low",
			HasSyncedLyrics: false,
			HasPlainLyrics:  p.Lyrics != "",
			PlainLyrics:     p.Lyrics,
			IsSimplified:    false,
			IsAiGenerated:   true,
		}
		results = append(results, result)
		// 快取供 GetLyrics 使用
		g.cache.Set(id, &result)
	}
	return results, nil
}

// Close 停止內部快取清理 goroutine
func (g *Gemini) Close() { g.cache.Stop() }

func (g *Gemini) GetLyrics(_ context.Context, id string) (*LyricsResult, error) {
	result, ok := g.cache.Get(id)
	if !ok {
		return nil, fmt.Errorf("gemini: 快取未命中，ID=%s（需重新搜尋）", id)
	}
	return result, nil
}

func (g *Gemini) buildPrompt(req SearchRequest) string {
	var sb strings.Builder
	sb.WriteString("你是歌詞搜尋助手。請以 JSON 陣列格式回傳歌詞搜尋結果。\n")
	sb.WriteString("每個結果包含 title、artist、lyrics 三個欄位。\n")
	sb.WriteString("只回傳 JSON，不要其他文字。最多回傳 3 首歌。\n\n")

	switch req.SearchType {
	case "title":
		sb.WriteString(fmt.Sprintf("搜尋歌曲「%s」的歌詞", req.Query))
		if req.Artist != "" {
			sb.WriteString(fmt.Sprintf("，歌手是「%s」", req.Artist))
		}
	case "artist":
		sb.WriteString(fmt.Sprintf("搜尋歌手「%s」的熱門歌曲歌詞", req.Query))
	case "lyrics":
		sb.WriteString(fmt.Sprintf("搜尋包含歌詞片段「%s」的歌曲", req.Query))
		if req.Artist != "" {
			sb.WriteString(fmt.Sprintf("，歌手可能是「%s」", req.Artist))
		}
	}

	return sb.String()
}
