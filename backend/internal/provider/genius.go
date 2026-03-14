package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

const geniusDefaultBaseURL = "https://api.genius.com"

// Genius Genius.com 歌詞提供者
type Genius struct {
	client  *http.Client
	token   string
	baseURL string
}

// NewGenius 建立 Genius provider
func NewGenius(client *http.Client, token, baseURL string) *Genius {
	if baseURL == "" {
		baseURL = geniusDefaultBaseURL
	}
	return &Genius{client: client, token: token, baseURL: baseURL}
}

func (g *Genius) Name() string { return "genius" }

func (g *Genius) Search(ctx context.Context, req SearchRequest) ([]LyricsResult, error) {
	q := req.Query
	if req.SearchType == "title" && req.Artist != "" {
		q = req.Query + " " + req.Artist
	}

	reqURL := fmt.Sprintf("%s/api/search?%s", g.baseURL, url.Values{"q": {q}}.Encode())
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("genius: 建立請求失敗: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+g.token)

	resp, err := g.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("genius: 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("genius: HTTP %d", resp.StatusCode)
	}

	var body struct {
		Response struct {
			Hits []struct {
				Type   string `json:"type"`
				Result struct {
					ID             int    `json:"id"`
					Title          string `json:"title"`
					ArtistNames    string `json:"artist_names"`
					HeaderImageURL string `json:"header_image_url"`
				} `json:"result"`
			} `json:"hits"`
		} `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("genius: 解碼失敗: %w", err)
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}

	var results []LyricsResult
	for _, hit := range body.Response.Hits {
		if hit.Type != "song" {
			continue
		}
		if len(results) >= limit {
			break
		}
		var coverURL *string
		if hit.Result.HeaderImageURL != "" {
			coverURL = &hit.Result.HeaderImageURL
		}
		results = append(results, LyricsResult{
			ID:              fmt.Sprintf("genius-%d", hit.Result.ID),
			Title:           hit.Result.Title,
			Artist:          hit.Result.ArtistNames,
			Source:          "genius",
			Confidence:      "medium",
			HasSyncedLyrics: false,
			HasPlainLyrics:  false,
			CoverURL:        coverURL,
			IsSimplified:    false,
			IsAiGenerated:   false,
		})
	}
	return results, nil
}

// GetLyrics — Genius API 不直接回傳歌詞文字（版權保護）。回傳歌曲元資料。
func (g *Genius) GetLyrics(ctx context.Context, id string) (*LyricsResult, error) {
	if !strings.HasPrefix(id, "genius-") {
		return nil, fmt.Errorf("genius: 無效的 ID 前綴: %s", id)
	}
	rawID := strings.TrimPrefix(id, "genius-")

	reqURL := fmt.Sprintf("%s/api/songs/%s", g.baseURL, rawID)
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodGet, reqURL, nil)
	if err != nil {
		return nil, fmt.Errorf("genius: 建立請求失敗: %w", err)
	}
	httpReq.Header.Set("Authorization", "Bearer "+g.token)

	resp, err := g.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("genius: 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("genius: HTTP %d", resp.StatusCode)
	}

	var body struct {
		Response struct {
			Song struct {
				ID          int    `json:"id"`
				Title       string `json:"title"`
				ArtistNames string `json:"artist_names"`
				URL         string `json:"url"`
				Album       *struct {
					Name string `json:"name"`
				} `json:"album"`
			} `json:"song"`
		} `json:"response"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return nil, fmt.Errorf("genius: 解碼失敗: %w", err)
	}

	song := body.Response.Song
	result := &LyricsResult{
		ID:         id,
		Title:      song.Title,
		Artist:     song.ArtistNames,
		Source:     "genius",
		Confidence: "medium",
		SourceURL:  song.URL,
	}
	if song.Album != nil {
		result.Album = song.Album.Name
	}

	return result, nil
}
