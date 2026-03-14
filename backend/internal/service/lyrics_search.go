package service

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/raymondchen/ly-backend/internal/dto"
	"github.com/raymondchen/ly-backend/internal/provider"
)

// providerResult 單一 provider 的搜尋結果
type providerResult struct {
	source  string
	results []provider.LyricsResult
	err     error
	latency time.Duration
}

// LyricsSearchService 聚合歌詞搜尋服務
type LyricsSearchService struct {
	providers []provider.Provider
	gemini    provider.Provider
	timeout   time.Duration
}

// NewLyricsSearchService 建立聚合搜尋服務
func NewLyricsSearchService(providers []provider.Provider, gemini provider.Provider, timeout time.Duration) *LyricsSearchService {
	return &LyricsSearchService{
		providers: providers,
		gemini:    gemini,
		timeout:   timeout,
	}
}

// Search 並行搜尋所有 providers 並合併結果
func (s *LyricsSearchService) Search(ctx context.Context, req dto.LyricsSearchRequest) (*dto.LyricsSearchResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, s.timeout)
	defer cancel()

	searchReq := provider.SearchRequest{
		Query:      req.Query,
		SearchType: req.SearchType,
		Artist:     req.Artist,
		Limit:      10,
	}

	// 階段一：並行呼叫非 Gemini providers
	var wg sync.WaitGroup
	resultsCh := make(chan providerResult, len(s.providers))

	for _, p := range s.providers {
		wg.Add(1)
		go func(p provider.Provider) {
			defer wg.Done()
			start := time.Now()
			results, err := p.Search(ctx, searchReq)
			resultsCh <- providerResult{
				source:  p.Name(),
				results: results,
				err:     err,
				latency: time.Since(start),
			}
		}(p)
	}

	go func() { wg.Wait(); close(resultsCh) }()

	// 收集結果
	var allResults []provider.LyricsResult
	sources := make(map[string]dto.SourceStatus)

	for pr := range resultsCh {
		if pr.err != nil {
			status := "error"
			// context 超時時，將該 provider 狀態標記為 timeout
			if ctx.Err() != nil {
				status = "timeout"
			}
			sources[pr.source] = dto.SourceStatus{
				Status:    status,
				Count:     0,
				LatencyMs: pr.latency.Milliseconds(),
			}
			continue
		}
		sources[pr.source] = dto.SourceStatus{
			Status:    "ok",
			Count:     len(pr.results),
			LatencyMs: pr.latency.Milliseconds(),
		}
		allResults = append(allResults, pr.results...)
	}

	// 階段二：Gemini 條件觸發（僅在結果不足 3 筆時才呼叫，節省 API 費用）
	if s.gemini != nil {
		if len(allResults) < 3 {
			start := time.Now()
			geminiResults, err := s.gemini.Search(ctx, searchReq)
			latency := time.Since(start)
			if err != nil {
				status := "error"
				if ctx.Err() != nil {
					status = "timeout"
				}
				sources[s.gemini.Name()] = dto.SourceStatus{
					Status:    status,
					LatencyMs: latency.Milliseconds(),
				}
			} else {
				sources[s.gemini.Name()] = dto.SourceStatus{
					Status:    "ok",
					Count:     len(geminiResults),
					LatencyMs: latency.Milliseconds(),
				}
				allResults = append(allResults, geminiResults...)
			}
		} else {
			sources[s.gemini.Name()] = dto.SourceStatus{
				Status: "skipped",
				Count:  0,
			}
		}
	}

	// 依可信度、是否有同步歌詞、來源優先級排序
	sortResults(allResults)

	// 上限 50 筆
	if len(allResults) > 50 {
		allResults = allResults[:50]
	}

	// 轉換為 DTO
	items := make([]dto.LyricsSearchResultItem, len(allResults))
	for i, r := range allResults {
		items[i] = dto.LyricsSearchResultItem{
			ID:              r.ID,
			Title:           r.Title,
			Artist:          r.Artist,
			Album:           r.Album,
			Source:          r.Source,
			Confidence:      r.Confidence,
			HasSyncedLyrics: r.HasSyncedLyrics,
			HasPlainLyrics:  r.HasPlainLyrics,
			Duration:        r.Duration,
			Ratio:           r.Ratio,
			CoverURL:        r.CoverURL,
			IsSimplified:    r.IsSimplified,
			IsAiGenerated:   r.IsAiGenerated,
		}
	}

	return &dto.LyricsSearchResponse{
		Results:      items,
		Sources:      sources,
		TotalResults: len(items),
	}, nil
}

// GetLyrics 根據 ID 前綴路由到對應的 provider
func (s *LyricsSearchService) GetLyrics(ctx context.Context, id string) (*dto.LyricsDetailResponse, error) {
	p := s.findProviderByID(id)
	if p == nil {
		return nil, fmt.Errorf("無法識別歌詞來源: %s", id)
	}

	result, err := p.GetLyrics(ctx, id)
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}

	return &dto.LyricsDetailResponse{
		ID:           result.ID,
		Title:        result.Title,
		Artist:       result.Artist,
		Album:        result.Album,
		Source:       result.Source,
		SyncedLyrics: result.SyncedLyrics,
		PlainLyrics:  result.PlainLyrics,
		SourceURL:    result.SourceURL,
		IsSimplified: result.IsSimplified,
	}, nil
}

// findProviderByID 依 ID 前綴找到對應的 provider
func (s *LyricsSearchService) findProviderByID(id string) provider.Provider {
	prefixMap := map[string]string{
		"lrclib": "lrclib",
		"lrcapi": "lrcapi",
		"genius": "genius",
		"gemini": "gemini",
	}

	for prefix, name := range prefixMap {
		if strings.HasPrefix(id, prefix+"-") {
			for _, p := range s.providers {
				if p.Name() == name {
					return p
				}
			}
			if s.gemini != nil && s.gemini.Name() == name {
				return s.gemini
			}
		}
	}
	return nil
}

// confidenceOrder 可信度排序權重（數字越小優先級越高）
var confidenceOrder = map[string]int{
	"high":   0,
	"medium": 1,
	"low":    2,
}

// sourceOrder 來源優先級（數字越小優先級越高）
var sourceOrder = map[string]int{
	"lrclib":         0,
	"lrcapi-kugou":   1,
	"lrcapi-netease": 1,
	"lrcapi-migu":    1,
	"genius":         2,
	"gemini":         3,
}

// sortResults 依可信度 → 是否有同步歌詞 → 來源優先級排序
func sortResults(results []provider.LyricsResult) {
	sort.SliceStable(results, func(i, j int) bool {
		ci, cj := confidenceOrder[results[i].Confidence], confidenceOrder[results[j].Confidence]
		if ci != cj {
			return ci < cj
		}
		if results[i].HasSyncedLyrics != results[j].HasSyncedLyrics {
			return results[i].HasSyncedLyrics
		}
		si := sourceOrder[results[i].Source]
		sj := sourceOrder[results[j].Source]
		return si < sj
	})
}
