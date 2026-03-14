package handler

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/coder/websocket"
)

// STT 語音辨識 handler
type STT struct {
	deepgramAPIKey string
	googleAPIKey   string
}

// NewSTT 建立 STT handler
func NewSTT(deepgramAPIKey, googleAPIKey string) *STT {
	return &STT{
		deepgramAPIKey: deepgramAPIKey,
		googleAPIKey:   googleAPIKey,
	}
}

// GetToken 回傳 Deepgram API key 供前端建立直連 WebSocket
func (h *STT) GetToken(w http.ResponseWriter, r *http.Request) {
	if h.deepgramAPIKey == "" {
		writeError(w, "STT_NOT_CONFIGURED", "STT service not configured. Please set your own API key in settings.", http.StatusServiceUnavailable)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"token":    h.deepgramAPIKey,
		"provider": "deepgram",
	})
}

// ============================================================================
// Google Cloud STT WebSocket Proxy
// ============================================================================

// googleSTTRequest Google Cloud STT REST API 請求結構
type googleSTTRequest struct {
	Config googleSTTConfig `json:"config"`
	Audio  googleSTTAudio  `json:"audio"`
}

type googleSTTConfig struct {
	Encoding                   string   `json:"encoding"`
	SampleRateHertz            int      `json:"sampleRateHertz"`
	LanguageCode               string   `json:"languageCode"`
	AlternativeLanguageCodes   []string `json:"alternativeLanguageCodes,omitempty"`
	Model                      string   `json:"model"`
	EnableAutomaticPunctuation bool     `json:"enableAutomaticPunctuation"`
}

type googleSTTAudio struct {
	Content string `json:"content"` // base64 encoded PCM
}

type googleSTTResponse struct {
	Results []struct {
		Alternatives []struct {
			Transcript string  `json:"transcript"`
			Confidence float64 `json:"confidence"`
		} `json:"alternatives"`
	} `json:"results"`
	Error *struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// StreamSTT 處理 Google Cloud STT 的 WebSocket 串流代理
//
// 流程：前端發送 Int16 PCM 音訊 → Go 緩衝 → 定期呼叫 Google REST API → 回傳辨識結果
// Query params: sampleRate (預設 48000), language (預設 zh-TW)
func (h *STT) StreamSTT(w http.ResponseWriter, r *http.Request) {
	if h.googleAPIKey == "" {
		writeError(w, "STT_NOT_CONFIGURED", "Google Cloud STT API key not configured", http.StatusServiceUnavailable)
		return
	}

	sampleRate, _ := strconv.Atoi(r.URL.Query().Get("sampleRate"))
	if sampleRate == 0 {
		sampleRate = 48000
	}
	language := r.URL.Query().Get("language")
	if language == "" {
		language = "zh-TW"
	}

	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		InsecureSkipVerify: true, // CORS 由全域中介軟體處理
	})
	if err != nil {
		slog.Error("STT WebSocket accept 失敗", "error", err)
		return
	}
	defer conn.CloseNow()

	slog.Info("STT stream 已連線", "sampleRate", sampleRate, "language", language)

	// 使用 context.Background() 避免 HTTP 30 秒 timeout 中斷 WebSocket
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	var mu sync.Mutex
	var audioBuffer []byte

	// Goroutine：持續讀取前端音訊
	go func() {
		defer cancel()
		for {
			typ, data, err := conn.Read(ctx)
			if err != nil {
				return
			}
			if typ != websocket.MessageBinary {
				continue
			}
			mu.Lock()
			audioBuffer = append(audioBuffer, data...)
			mu.Unlock()
		}
	}()

	// 主迴圈：每 2 秒將緩衝音訊送往 Google STT
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	// 最小緩衝大小：至少 0.5 秒的音訊才值得辨識
	// Int16 mono: sampleRate * 2 bytes * 0.5 seconds
	minBufferSize := sampleRate // sampleRate * 2 * 0.5 = sampleRate

	for {
		select {
		case <-ctx.Done():
			slog.Info("STT stream 已斷線")
			return
		case <-ticker.C:
			mu.Lock()
			if len(audioBuffer) < minBufferSize {
				mu.Unlock()
				continue
			}
			buf := make([]byte, len(audioBuffer))
			copy(buf, audioBuffer)
			audioBuffer = audioBuffer[:0]
			mu.Unlock()

			transcript, confidence, err := h.recognizeGoogle(ctx, buf, sampleRate, language)
			if err != nil {
				slog.Warn("Google STT 辨識失敗", "error", err)
				continue
			}
			if transcript == "" {
				continue
			}

			result, _ := json.Marshal(map[string]any{
				"transcript": transcript,
				"confidence": confidence,
				"isFinal":    true,
			})
			if writeErr := conn.Write(ctx, websocket.MessageText, result); writeErr != nil {
				return
			}
		}
	}
}

// recognizeGoogle 呼叫 Google Cloud Speech-to-Text REST API
func (h *STT) recognizeGoogle(ctx context.Context, audio []byte, sampleRate int, language string) (string, float64, error) {
	// 根據主語言設定候選語言，實現自動語言偵測
	altLangs := alternativeLanguages(language)

	reqBody := googleSTTRequest{
		Config: googleSTTConfig{
			Encoding:                   "LINEAR16",
			SampleRateHertz:            sampleRate,
			LanguageCode:               language,
			AlternativeLanguageCodes:   altLangs,
			Model:                      "default",
			EnableAutomaticPunctuation: true,
		},
		Audio: googleSTTAudio{
			Content: base64.StdEncoding.EncodeToString(audio),
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", 0, fmt.Errorf("JSON 編碼失敗: %w", err)
	}

	url := fmt.Sprintf("https://speech.googleapis.com/v1/speech:recognize?key=%s", h.googleAPIKey)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(jsonBody))
	if err != nil {
		return "", 0, fmt.Errorf("建立請求失敗: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", 0, fmt.Errorf("HTTP 請求失敗: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", 0, fmt.Errorf("讀取回應失敗: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", 0, fmt.Errorf("Google STT API 錯誤 (HTTP %d): %s", resp.StatusCode, string(body))
	}

	var sttResp googleSTTResponse
	if err := json.Unmarshal(body, &sttResp); err != nil {
		return "", 0, fmt.Errorf("JSON 解碼失敗: %w", err)
	}

	if sttResp.Error != nil {
		return "", 0, fmt.Errorf("Google STT 錯誤 (%d): %s", sttResp.Error.Code, sttResp.Error.Message)
	}

	if len(sttResp.Results) == 0 || len(sttResp.Results[0].Alternatives) == 0 {
		return "", 0, nil
	}

	alt := sttResp.Results[0].Alternatives[0]
	return alt.Transcript, alt.Confidence, nil
}

// alternativeLanguages 根據主語言回傳候選語言清單，讓 Google STT 自動偵測
func alternativeLanguages(primary string) []string {
	all := []string{"zh-TW", "zh-CN", "en-US", "ja-JP", "ko-KR", "th-TH"}
	var result []string
	for _, lang := range all {
		if lang != primary {
			result = append(result, lang)
		}
	}
	return result
}
