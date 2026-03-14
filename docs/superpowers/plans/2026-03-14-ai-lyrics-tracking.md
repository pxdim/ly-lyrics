# US8: AI 聽歌辨識 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable real-time speech-to-text lyrics tracking — the system listens to live audio, matches recognized text against known lyrics, and automatically advances the lyrics display.

**Architecture:** AI tracking runs entirely in the browser (Controller). Three isolated modules — AudioCapture (Web Audio API), STTProvider (Deepgram WebSocket), LyricsMatcher (LCS sliding window) — are orchestrated by TrackingEngine, which calls the existing `store.jumpToLine()` to advance lyrics. The Go backend only adds a single `GET /api/stt/token` endpoint (RequireAuth) to securely provide the Deepgram API key.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.7 (strict), Zustand 5, Vitest, Web Audio API, Deepgram Streaming API, Go 1.26, chi v5

**Spec:** `docs/superpowers/specs/2026-03-14-ai-lyrics-tracking-design.md`

---

## Chunk 1: Foundation — Types, Store, Backend

### Task 1: Type Definitions — Clean Up Old Types + Add New

**Files:**
- Modify: `types/index.ts:146-218`

This task replaces the old `AiListeningState`, `AudioInput`, `AiListeningTogglePayload` types and removes `ai_listening_toggle` from the WebSocket message type union. No tests needed — type-only changes verified by `tsc`.

- [ ] **Step 1: Replace AI Listening types in types/index.ts**

Replace lines 146-218 (the "AI Listening Types" section, `WebSocketMessageType`, and related payloads):

```typescript
// ============================================
// AI Tracking Types
// ============================================

export type STTProviderType = "deepgram" | "gemini" | "whisper" | "custom";

export type AiTrackingStatus = "idle" | "listening" | "matched" | "cooldown" | "error";

export interface AiTrackingState {
  isActive: boolean;
  status: AiTrackingStatus;
  confidence: number; // 0-1
  lastMatchedLine: number | null;
  cooldownUntil: number | null; // Unix ms timestamp, null = not cooling down
  sttProvider: STTProviderType;
  errorMessage: string | null;
}

export interface AiTrackingSettings {
  sttProvider: STTProviderType;
  apiKey: string | null; // 使用者自行輸入的 API key（null = 用伺服器端的）
  confidenceThreshold: number; // 預設 0.6
  windowBefore: number; // 預設 2
  windowAfter: number; // 預設 3
  manualOverrideCooldown: number; // 預設 5000ms
  fullScanThreshold: number; // 預設 0.8
}

export interface AudioInputState {
  deviceId: string | null;
  gain: number; // 0-20 dB（store 存 dB 值，AudioCapture 轉線性值）
  volume: number; // 即時音量 0-1
  isCapturing: boolean;
}

// ============================================
// WebSocket Message Types
// ============================================

export type WebSocketMessageType =
  | "join_session"
  | "leave_session"
  | "line_changed"
  | "song_changed"
  | "settings_updated"
  | "session_state"
  | "client_connected"
  | "client_disconnected"
  | "error";
```

Also remove:
- `AiListeningTogglePayload` interface (old lines 207-209)
- `isAiListening` from `SessionStatePayload` (old line 216)
- `isAiListening` from `SessionState` interface (old line 79)

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: PASS (or only pre-existing warnings unrelated to this change)

If there are compile errors from other files referencing the removed types, fix them (likely in `lib/websocket/types.ts` if it re-exports, or `lib/store/index.ts`).

- [ ] **Step 3: Run existing tests to verify no regressions**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 4: Commit**

```bash
git add types/index.ts
git commit -m "refactor(types): replace old AI listening types with new AI tracking types"
```

---

### Task 2: Zustand Store — Add AI Tracking State + Actions

**Files:**
- Modify: `lib/store/index.ts:22-48` (LyricsState), `lib/store/index.ts:50-82` (LyricsActions), initial state at ~115-128, partialize at ~386-390

- [ ] **Step 1: Write failing tests for new store actions**

Create test cases in existing test file or new section. The store test file is at `lib/store/index.test.ts`.

```typescript
// Append to lib/store/index.test.ts

describe("AI Tracking actions", () => {
  beforeEach(() => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.stopAiTracking();
    });
  });

  it("startAiTracking sets isActive and status to listening", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.startAiTracking();
    });
    expect(result.current.aiTracking.isActive).toBe(true);
    expect(result.current.aiTracking.status).toBe("listening");
  });

  it("stopAiTracking resets AI tracking state", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.startAiTracking();
      result.current.stopAiTracking();
    });
    expect(result.current.aiTracking.isActive).toBe(false);
    expect(result.current.aiTracking.status).toBe("idle");
  });

  it("updateAiStatus updates status and confidence", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.startAiTracking();
      result.current.updateAiStatus("matched", 0.85, 3);
    });
    expect(result.current.aiTracking.status).toBe("matched");
    expect(result.current.aiTracking.confidence).toBe(0.85);
    expect(result.current.aiTracking.lastMatchedLine).toBe(3);
  });

  it("triggerManualOverride sets cooldown status with timestamp", () => {
    const { result } = renderHook(() => useLyricsStore());
    const before = Date.now();
    act(() => {
      result.current.startAiTracking();
      result.current.triggerManualOverride();
    });
    expect(result.current.aiTracking.status).toBe("cooldown");
    expect(result.current.aiTracking.cooldownUntil).toBeGreaterThanOrEqual(before + 5000);
  });

  it("updateAudioInput partially updates audio input state", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.updateAudioInput({ gain: 10, volume: 0.7 });
    });
    expect(result.current.audioInput.gain).toBe(10);
    expect(result.current.audioInput.volume).toBe(0.7);
    expect(result.current.audioInput.deviceId).toBeNull(); // unchanged
  });

  it("updateAiSettings partially updates AI settings", () => {
    const { result } = renderHook(() => useLyricsStore());
    act(() => {
      result.current.updateAiSettings({ confidenceThreshold: 0.8 });
    });
    expect(result.current.aiSettings.confidenceThreshold).toBe(0.8);
    expect(result.current.aiSettings.sttProvider).toBe("deepgram"); // unchanged default
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/store/index.test.ts`
Expected: FAIL — `aiTracking`, `startAiTracking`, etc. don't exist on store

- [ ] **Step 3: Implement store changes**

Add to `LyricsState` interface (after line 47 `error: string | null;`):

```typescript
  // AI Tracking
  aiTracking: AiTrackingState;
  aiSettings: AiTrackingSettings;
  audioInput: AudioInputState;
```

Add imports at the top of file:

```typescript
import type {
  AiTrackingState,
  AiTrackingSettings,
  AiTrackingStatus,
  AudioInputState,
} from "@/types";
```

Add to `LyricsActions` interface (after line 81 `clearError: () => void;`):

```typescript
  // AI Tracking actions
  startAiTracking: () => void;
  stopAiTracking: () => void;
  updateAiStatus: (status: AiTrackingStatus, confidence?: number, matchedLine?: number) => void;
  triggerManualOverride: () => void;
  updateAudioInput: (partial: Partial<AudioInputState>) => void;
  updateAiSettings: (partial: Partial<AiTrackingSettings>) => void;
```

Add default values to initial state (after line 128 `error: null,`):

```typescript
        // AI Tracking
        aiTracking: {
          isActive: false,
          status: "idle" as const,
          confidence: 0,
          lastMatchedLine: null,
          cooldownUntil: null,
          sttProvider: "deepgram" as const,
          errorMessage: null,
        },
        aiSettings: {
          sttProvider: "deepgram" as const,
          apiKey: null,
          confidenceThreshold: 0.6,
          windowBefore: 2,
          windowAfter: 3,
          manualOverrideCooldown: 5000,
          fullScanThreshold: 0.8,
        },
        audioInput: {
          deviceId: null,
          gain: 0,
          volume: 0,
          isCapturing: false,
        },
```

Add action implementations before the `setLoading` action (~line 370):

```typescript
        // ========================================
        // AI Tracking Actions
        // ========================================
        startAiTracking: () => {
          set({
            aiTracking: {
              ...get().aiTracking,
              isActive: true,
              status: "listening",
              errorMessage: null,
            },
          });
        },

        stopAiTracking: () => {
          set({
            aiTracking: {
              isActive: false,
              status: "idle",
              confidence: 0,
              lastMatchedLine: null,
              cooldownUntil: null,
              sttProvider: get().aiSettings.sttProvider,
              errorMessage: null,
            },
          });
        },

        updateAiStatus: (status, confidence, matchedLine) => {
          set({
            aiTracking: {
              ...get().aiTracking,
              status,
              ...(confidence !== undefined && { confidence }),
              ...(matchedLine !== undefined && { lastMatchedLine: matchedLine }),
            },
          });
        },

        triggerManualOverride: () => {
          const cooldown = get().aiSettings.manualOverrideCooldown;
          set({
            aiTracking: {
              ...get().aiTracking,
              status: "cooldown",
              cooldownUntil: Date.now() + cooldown,
            },
          });
        },

        updateAudioInput: (partial) => {
          set({
            audioInput: { ...get().audioInput, ...partial },
          });
        },

        updateAiSettings: (partial) => {
          set({
            aiSettings: { ...get().aiSettings, ...partial },
          });
        },
```

Update partialize to persist `aiSettings` (~line 386):

```typescript
        partialize: (state) => ({
          displaySettings: state.displaySettings,
          role: state.role,
          userId: state.userId,
          aiSettings: state.aiSettings,
        }),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/store/index.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/store/index.ts lib/store/index.test.ts types/index.ts
git commit -m "feat(store): add AI tracking state and actions to Zustand store"
```

---

### Task 3: Go Backend — STT Token Endpoint

**Files:**
- Create: `backend/internal/handler/stt.go`
- Create: `backend/internal/handler/stt_test.go`
- Modify: `backend/internal/config/config.go:10-25` (add DeepgramAPIKey field)
- Modify: `backend/internal/server/routes.go:68-73` (add route)
- Modify: `backend/internal/server/server.go` (pass config to handler)

- [ ] **Step 1: Write failing test for STT handler**

Create `backend/internal/handler/stt_test.go`:

```go
package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/raymondchen/ly-backend/internal/handler"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSTTHandler_GetToken(t *testing.T) {
	t.Run("returns token when DEEPGRAM_API_KEY is set", func(t *testing.T) {
		h := handler.NewSTT("dg-test-key-123")
		req := httptest.NewRequest(http.MethodGet, "/api/stt/token", nil)
		w := httptest.NewRecorder()

		h.GetToken(w, req)

		assert.Equal(t, http.StatusOK, w.Code)

		var resp map[string]string
		err := json.NewDecoder(w.Body).Decode(&resp)
		require.NoError(t, err)
		assert.Equal(t, "dg-test-key-123", resp["token"])
		assert.Equal(t, "deepgram", resp["provider"])
	})

	t.Run("returns 503 when DEEPGRAM_API_KEY is empty", func(t *testing.T) {
		h := handler.NewSTT("")
		req := httptest.NewRequest(http.MethodGet, "/api/stt/token", nil)
		w := httptest.NewRecorder()

		h.GetToken(w, req)

		assert.Equal(t, http.StatusServiceUnavailable, w.Code)
	})
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && go test ./internal/handler/ -run TestSTTHandler -v`
Expected: FAIL — `handler.NewSTT` undefined

- [ ] **Step 3: Implement STT handler**

Create `backend/internal/handler/stt.go`:

```go
package handler

import (
	"net/http"
)

// STT 語音辨識 token handler
type STT struct {
	apiKey string
}

// NewSTT 建立 STT handler
func NewSTT(deepgramAPIKey string) *STT {
	return &STT{apiKey: deepgramAPIKey}
}

// GetToken 回傳 Deepgram API key 供前端建立直連 WebSocket
func (h *STT) GetToken(w http.ResponseWriter, r *http.Request) {
	if h.apiKey == "" {
		writeError(w, "STT_NOT_CONFIGURED", "STT service not configured. Please set your own API key in settings.", http.StatusServiceUnavailable)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{
		"token":    h.apiKey,
		"provider": "deepgram",
	})
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && go test ./internal/handler/ -run TestSTTHandler -v`
Expected: PASS

- [ ] **Step 5: Add DeepgramAPIKey to config**

In `backend/internal/config/config.go`, add after `CORSOrigins` field (line 24):

```go
	// DeepgramAPIKey Deepgram STT API 金鑰（選填，未設定時前端需自行提供）
	DeepgramAPIKey string `env:"DEEPGRAM_API_KEY" envDefault:""`
```

- [ ] **Step 6: Register route in routes.go**

In `backend/internal/server/routes.go`, add inside the `RequireAuth` group (after line 28 `r.Get("/api/auth/me", authHandler.Me)`):

```go
		sttHandler := handler.NewSTT(s.cfg.DeepgramAPIKey)
		r.Get("/api/stt/token", sttHandler.GetToken)
```

- [ ] **Step 7: Verify Go build and all tests pass**

Run: `cd backend && go build ./cmd/server/ && go test ./... -v`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add backend/internal/handler/stt.go backend/internal/handler/stt_test.go backend/internal/config/config.go backend/internal/server/routes.go
git commit -m "feat(backend): add GET /api/stt/token endpoint for Deepgram API key"
```

---

## Chunk 2: Core Algorithms

### Task 4: LyricsMatcher — LCS + Sliding Window + LRC Assist

**Files:**
- Create: `lib/ai-tracking/lyrics-matcher.ts`
- Create: `lib/ai-tracking/lyrics-matcher.test.ts`

This is the most test-heavy module (~15 cases). Pure logic, no DOM/browser dependencies.

- [ ] **Step 1: Write failing tests**

Create `lib/ai-tracking/lyrics-matcher.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { lcsRatio, matchLyrics, type MatchResult, type MatchConfig } from "./lyrics-matcher";

// ============================================
// LCS 演算法測試
// ============================================

describe("lcsRatio", () => {
  it("returns 1.0 for identical strings", () => {
    expect(lcsRatio("天空下起了小雨", "天空下起了小雨")).toBe(1.0);
  });

  it("returns 0.0 for completely different strings", () => {
    expect(lcsRatio("天空下起了小雨", "ABCDEFGH")).toBe(0);
  });

  it("returns partial score for substring match", () => {
    // "天空下起了小" 是 "天空下起了小雨" 的子序列（6/7 = 0.857）
    const ratio = lcsRatio("天空下起了小", "天空下起了小雨");
    expect(ratio).toBeGreaterThan(0.8);
    expect(ratio).toBeLessThan(1.0);
  });

  it("handles empty strings", () => {
    expect(lcsRatio("", "test")).toBe(0);
    expect(lcsRatio("test", "")).toBe(0);
    expect(lcsRatio("", "")).toBe(0);
  });

  it("is case-insensitive for English", () => {
    expect(lcsRatio("Hello World", "hello world")).toBe(1.0);
  });
});

// ============================================
// matchLyrics 滑動視窗比對測試
// ============================================

const sampleLyrics = [
  "我走在回家的路上",        // 0
  "天空下起了小雨",          // 1
  "想起了你的笑容",          // 2
  "心裡感到溫暖",            // 3
  "我走在回家的路上",        // 4 (重複副歌)
  "天空下起了小雨",          // 5 (重複副歌)
  "這次不再感到孤單",        // 6
];

const defaultConfig: MatchConfig = {
  confidenceThreshold: 0.6,
  windowBefore: 2,
  windowAfter: 3,
  fullScanThreshold: 0.8,
  forwardBias: 0.1,
};

describe("matchLyrics", () => {
  it("matches exact lyrics line within window", () => {
    const result = matchLyrics("天空下起了小雨", sampleLyrics, 0, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(1);
    expect(result!.confidence).toBeGreaterThan(0.9);
  });

  it("matches partial STT output", () => {
    const result = matchLyrics("天空下起了小", sampleLyrics, 0, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(1);
    expect(result!.confidence).toBeGreaterThan(0.7);
  });

  it("returns null when text does not match any line (below threshold)", () => {
    const result = matchLyrics("完全無關的句子", sampleLyrics, 0, defaultConfig);
    expect(result).toBeNull();
  });

  it("prefers forward lines for repeated chorus (forward bias)", () => {
    // currentIndex = 3, lines 0 and 4 are identical "我走在回家的路上"
    // Window covers [1,2,3,4,5,6], so line 4 (forward) should win over line 0 (not in window)
    const result = matchLyrics("我走在回家的路上", sampleLyrics, 3, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(4); // forward line, not backward
  });

  it("does not jump backward beyond window", () => {
    // currentIndex = 5, window = [3,4,5,6,7,8] (clamped to array)
    // "我走在回家的路上" exists at 0 and 4, only 4 is in window
    const result = matchLyrics("我走在回家的路上", sampleLyrics, 5, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(4);
  });

  it("full scan when window has no match, with higher threshold", () => {
    // currentIndex = 0, window [0,1,2,3], text matches line 6 only
    const result = matchLyrics("這次不再感到孤單", sampleLyrics, 0, defaultConfig);
    // fullScanThreshold = 0.8, this should match line 6 with high confidence
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(6);
  });

  it("returns null for empty text", () => {
    const result = matchLyrics("", sampleLyrics, 0, defaultConfig);
    expect(result).toBeNull();
  });

  it("returns null for empty lyrics array", () => {
    const result = matchLyrics("test", [], 0, defaultConfig);
    expect(result).toBeNull();
  });

  it("handles currentIndex at end of lyrics", () => {
    const result = matchLyrics("這次不再感到孤單", sampleLyrics, 6, defaultConfig);
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(6);
  });

  it("uses LRC timestamps to narrow window when provided", () => {
    // With timestamps, the matcher can use elapsed time to narrow search
    const timestamps = [0, 5000, 10000, 15000, 20000, 25000, 30000]; // ms
    const result = matchLyrics(
      "天空下起了小雨",
      sampleLyrics,
      0,
      defaultConfig,
      timestamps,
      6000 // 6 seconds elapsed → near line 1-2
    );
    expect(result).not.toBeNull();
    expect(result!.lineIndex).toBe(1);
  });

  it("custom threshold: lower threshold allows weaker matches", () => {
    const looseConfig = { ...defaultConfig, confidenceThreshold: 0.3 };
    // A noisy partial match that wouldn't pass 0.6 threshold
    const result = matchLyrics("天空", sampleLyrics, 0, looseConfig);
    expect(result).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/ai-tracking/lyrics-matcher.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement LyricsMatcher**

Create `lib/ai-tracking/lyrics-matcher.ts`:

```typescript
/**
 * LyricsMatcher — 歌詞比對模組
 *
 * 使用 LCS（最長公共子序列）相似度 + 滑動視窗 + LRC 時間戳輔助
 * 將 STT 辨識出的文字片段對應到歌詞的行索引。
 */

export interface MatchConfig {
  confidenceThreshold: number; // 低於此分數不切行（預設 0.6）
  windowBefore: number; // 往回看幾行（預設 2）
  windowAfter: number; // 往前看幾行（預設 3）
  fullScanThreshold: number; // 跳段搜尋最低門檻（預設 0.8）
  forwardBias: number; // 往前的權重偏移（預設 0.1）
}

export interface MatchResult {
  lineIndex: number;
  confidence: number;
}

/**
 * 計算兩個字串的 LCS 相似度比率 (0-1)
 * 使用字元級 LCS，大小寫不敏感
 */
export function lcsRatio(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;

  const la = a.toLowerCase();
  const lb = b.toLowerCase();
  const m = la.length;
  const n = lb.length;

  // 空間優化：只保留上一行
  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (la[i - 1] === lb[j - 1]) {
        curr[j] = prev[j - 1] + 1;
      } else {
        curr[j] = Math.max(prev[j], curr[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }

  const lcsLength = prev[n];
  // 以較長字串為分母，確保完整匹配得 1.0
  return lcsLength / Math.max(m, n);
}

/**
 * 在歌詞中比對 STT 文字，回傳最佳匹配行索引和信心度
 *
 * @param text - STT 辨識出的文字片段
 * @param lyrics - 歌詞陣列
 * @param currentIndex - 當前行索引
 * @param config - 比對設定
 * @param timestamps - LRC 時間戳陣列（可選，毫秒）
 * @param elapsedMs - 已播放時間（可選，毫秒）
 */
export function matchLyrics(
  text: string,
  lyrics: string[],
  currentIndex: number,
  config: MatchConfig,
  timestamps?: number[],
  elapsedMs?: number
): MatchResult | null {
  if (!text.trim() || lyrics.length === 0) return null;

  // Step 1: 計算滑動視窗範圍
  let windowStart = Math.max(0, currentIndex - config.windowBefore);
  let windowEnd = Math.min(lyrics.length - 1, currentIndex + config.windowAfter);

  // LRC 時間戳輔助：若有時間資訊，用時間戳縮小搜尋範圍
  if (timestamps && elapsedMs !== undefined && timestamps.length === lyrics.length) {
    // 找到時間上最接近的行，擴展視窗
    const timeWindowMs = 5000; // ±5 秒
    const timeStart = lyrics.findIndex((_, i) => timestamps[i] >= elapsedMs - timeWindowMs);
    const timeEnd = lyrics.findIndex((_, i) => timestamps[i] > elapsedMs + timeWindowMs);
    if (timeStart >= 0) {
      windowStart = Math.min(windowStart, timeStart);
    }
    if (timeEnd >= 0) {
      windowEnd = Math.max(windowEnd, timeEnd - 1);
    }
  }

  // Step 2: 在視窗內比對
  let bestMatch: MatchResult | null = null;

  for (let i = windowStart; i <= windowEnd; i++) {
    let score = lcsRatio(text, lyrics[i]);

    // 前向偏移：往前的行加權，處理重複副歌
    if (i > currentIndex) {
      score += config.forwardBias;
    }

    if (score > (bestMatch?.confidence ?? 0)) {
      bestMatch = { lineIndex: i, confidence: score };
    }
  }

  // Step 3: 視窗內有匹配且達到門檻
  if (bestMatch && bestMatch.confidence >= config.confidenceThreshold) {
    return bestMatch;
  }

  // Step 4: 視窗內無匹配，全曲搜尋（更高門檻）
  let fullBest: MatchResult | null = null;
  for (let i = 0; i < lyrics.length; i++) {
    if (i >= windowStart && i <= windowEnd) continue; // 已搜尋過
    const score = lcsRatio(text, lyrics[i]);
    if (score > (fullBest?.confidence ?? 0)) {
      fullBest = { lineIndex: i, confidence: score };
    }
  }

  if (fullBest && fullBest.confidence >= config.fullScanThreshold) {
    return fullBest;
  }

  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/ai-tracking/lyrics-matcher.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ai-tracking/lyrics-matcher.ts lib/ai-tracking/lyrics-matcher.test.ts
git commit -m "feat(ai-tracking): add LyricsMatcher with LCS sliding window algorithm"
```

---

### Task 5: AudioCapture — Web Audio API Module

**Files:**
- Create: `lib/audio/audio-capture.ts`
- Create: `lib/audio/audio-capture.test.ts`

Note: Web Audio API is browser-only. Tests use Vitest mocks for `AudioContext`, `GainNode`, `AnalyserNode`.

- [ ] **Step 1: Write failing tests**

Create `lib/audio/audio-capture.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioCapture } from "./audio-capture";

// Mock Web Audio API
const mockGainNode = {
  gain: { value: 1, setValueAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockAnalyserNode = {
  fftSize: 0,
  frequencyBinCount: 128,
  connect: vi.fn(),
  disconnect: vi.fn(),
  getByteFrequencyData: vi.fn((arr: Uint8Array) => {
    // 模擬中等音量
    for (let i = 0; i < arr.length; i++) arr[i] = 128;
  }),
};

const mockMediaStreamSource = {
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const mockMediaStreamDestination = {
  stream: new MediaStream(),
};

const mockAudioContext = {
  createGain: vi.fn(() => mockGainNode),
  createAnalyser: vi.fn(() => mockAnalyserNode),
  createMediaStreamSource: vi.fn(() => mockMediaStreamSource),
  createMediaStreamDestination: vi.fn(() => mockMediaStreamDestination),
  close: vi.fn(),
  state: "running",
};

vi.stubGlobal("AudioContext", vi.fn(() => mockAudioContext));

// Mock MediaStream
const mockMediaStream = {
  getTracks: vi.fn(() => [{ stop: vi.fn() }]),
};

describe("AudioCapture", () => {
  let capture: AudioCapture;

  beforeEach(() => {
    vi.clearAllMocks();
    capture = new AudioCapture();
  });

  it("dbToLinear converts dB to linear gain correctly", () => {
    // 0 dB = gain 1.0
    expect(AudioCapture.dbToLinear(0)).toBeCloseTo(1.0);
    // 6 dB ≈ gain 2.0
    expect(AudioCapture.dbToLinear(6)).toBeCloseTo(1.9953, 2);
    // 20 dB = gain 10.0
    expect(AudioCapture.dbToLinear(20)).toBeCloseTo(10.0);
  });

  it("start initializes audio pipeline", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });

    await capture.start();

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: { deviceId: undefined },
    });
    expect(mockMediaStreamSource.connect).toHaveBeenCalled();
    expect(capture.isCapturing()).toBe(true);
  });

  it("start with specific deviceId passes constraint", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });

    await capture.start("device-123");

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: { deviceId: { exact: "device-123" } },
    });
  });

  it("setGain updates GainNode value", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });
    await capture.start();
    capture.setGain(6); // 6 dB
    expect(mockGainNode.gain.value).toBeCloseTo(1.9953, 2);
  });

  it("getVolume returns normalized volume from analyser", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });
    await capture.start();
    const volume = capture.getVolume();
    // Mock returns 128 for all bins → average = 128/255 ≈ 0.502
    expect(volume).toBeGreaterThan(0.4);
    expect(volume).toBeLessThanOrEqual(1.0);
  });

  it("stop cleans up all resources", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });
    await capture.start();
    capture.stop();
    expect(capture.isCapturing()).toBe(false);
    expect(mockAudioContext.close).toHaveBeenCalled();
  });

  it("getOutputStream returns MediaStream for STT provider", async () => {
    vi.stubGlobal("navigator", {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
      },
    });
    await capture.start();
    const stream = capture.getOutputStream();
    expect(stream).toBe(mockMediaStreamDestination.stream);
  });

  it("throws when not started and getVolume is called", () => {
    expect(() => capture.getVolume()).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/audio/audio-capture.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement AudioCapture**

Create `lib/audio/audio-capture.ts`:

```typescript
/**
 * AudioCapture — Web Audio API 音訊擷取模組
 *
 * 負責：麥克風/Line-in 音訊擷取、Gain 控制、即時音量分析
 * 不知道 STT 的存在——只提供音訊串流和音量數據。
 */

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private mediaStream: MediaStream | null = null;
  private _isCapturing = false;

  /**
   * 將 dB 值轉換為線性增益值（GainNode 使用線性值）
   */
  static dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }

  /**
   * 啟動音訊擷取
   * @param deviceId - 音訊設備 ID（可選，未提供則使用預設裝置）
   * @param gainDb - 初始增益 dB 值（預設 0）
   */
  async start(deviceId?: string, gainDb: number = 0): Promise<void> {
    // 取得音訊串流
    const constraints: MediaStreamConstraints = {
      audio: deviceId ? { deviceId: { exact: deviceId } } : { deviceId: undefined },
    };
    this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

    // 建立 Web Audio 處理鏈
    this.audioContext = new AudioContext();
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
    this.gainNode = this.audioContext.createGain();
    this.analyserNode = this.audioContext.createAnalyser();
    this.destinationNode = this.audioContext.createMediaStreamDestination();

    this.analyserNode.fftSize = 256;

    // 連接：Source → Gain → Analyser → Destination
    this.sourceNode.connect(this.gainNode);
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.destinationNode);

    // 設定初始增益
    this.gainNode.gain.value = AudioCapture.dbToLinear(gainDb);

    this._isCapturing = true;
  }

  /**
   * 停止音訊擷取並釋放所有資源
   */
  stop(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }
    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.destinationNode = null;
    this._isCapturing = false;
  }

  /**
   * 設定增益（dB）
   */
  setGain(db: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = AudioCapture.dbToLinear(db);
    }
  }

  /**
   * 取得即時音量（0-1 正規化值）
   */
  getVolume(): number {
    if (!this.analyserNode) {
      throw new Error("AudioCapture not started");
    }

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    // 計算平均能量
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    return sum / (dataArray.length * 255);
  }

  /**
   * 取得輸出音訊串流（供 STT provider 使用）
   */
  getOutputStream(): MediaStream | null {
    return this.destinationNode?.stream ?? null;
  }

  /**
   * 是否正在擷取
   */
  isCapturing(): boolean {
    return this._isCapturing;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/audio/audio-capture.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add lib/audio/audio-capture.ts lib/audio/audio-capture.test.ts
git commit -m "feat(audio): add AudioCapture module with Web Audio API pipeline"
```

---

## Chunk 3: STT Provider + Tracking Engine

### Task 6: STT Provider Interface + Deepgram Implementation

**Files:**
- Create: `lib/stt/types.ts`
- Create: `lib/stt/deepgram-provider.ts`
- Create: `lib/stt/stt-provider.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/stt/stt-provider.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepgramProvider } from "./deepgram-provider";
import type { STTConfig } from "./types";

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  // 模擬連線成功
  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  // 模擬收到訊息
  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  // 模擬斷線
  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

let mockWsInstance: MockWebSocket;

vi.stubGlobal(
  "WebSocket",
  vi.fn(() => {
    mockWsInstance = new MockWebSocket();
    return mockWsInstance;
  })
);

const testConfig: STTConfig = {
  language: "zh-TW",
  sampleRate: 16000,
  apiKey: "dg-test-key",
};

describe("DeepgramProvider", () => {
  let provider: DeepgramProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new DeepgramProvider();
  });

  it("has name 'deepgram'", () => {
    expect(provider.name).toBe("deepgram");
  });

  it("connect creates WebSocket with correct URL", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    expect(WebSocket).toHaveBeenCalledWith(
      expect.stringContaining("wss://api.deepgram.com/v1/listen")
    );
    expect(provider.isConnected()).toBe(true);
  });

  it("disconnect closes WebSocket", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    provider.disconnect();
    expect(mockWsInstance.close).toHaveBeenCalled();
  });

  it("sendAudio sends binary data when connected", async () => {
    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    const audioData = new Float32Array([0.1, -0.2, 0.3]);
    provider.sendAudio(audioData);
    expect(mockWsInstance.send).toHaveBeenCalled();
  });

  it("onTranscript callback receives parsed Deepgram response", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    // 模擬 Deepgram JSON 回應
    const deepgramResponse = JSON.stringify({
      channel: {
        alternatives: [{ transcript: "天空下起了小雨" }],
      },
      is_final: true,
    });
    mockWsInstance.simulateMessage(deepgramResponse);

    expect(callback).toHaveBeenCalledWith("天空下起了小雨", true);
  });

  it("onTranscript handles interim results", async () => {
    const callback = vi.fn();
    provider.onTranscript(callback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    const interimResponse = JSON.stringify({
      channel: {
        alternatives: [{ transcript: "天空下" }],
      },
      is_final: false,
    });
    mockWsInstance.simulateMessage(interimResponse);

    expect(callback).toHaveBeenCalledWith("天空下", false);
  });

  it("onError callback fires on WebSocket error", async () => {
    const errorCallback = vi.fn();
    provider.onError(errorCallback);

    const connectPromise = provider.connect(testConfig);
    mockWsInstance.simulateOpen();
    await connectPromise;

    mockWsInstance.simulateClose();
    expect(errorCallback).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/stt/stt-provider.test.ts`
Expected: FAIL — modules not found

- [ ] **Step 3: Implement STT types and Deepgram provider**

Create `lib/stt/types.ts`:

```typescript
/**
 * STT Provider Interface
 *
 * 抽象化語音轉文字引擎，允許替換不同 provider（Deepgram, Gemini, Whisper 等）
 */

export interface STTConfig {
  language: string; // "zh-TW", "en-US"
  sampleRate: number; // 通常 16000
  apiKey: string; // 從後端取得或使用者自行輸入
}

export interface STTProvider {
  readonly name: string;
  connect(config: STTConfig): Promise<void>;
  disconnect(): void;
  sendAudio(chunk: Float32Array): void;
  onTranscript(callback: (text: string, isFinal: boolean) => void): void;
  onError(callback: (error: Error) => void): void;
  isConnected(): boolean;
}
```

Create `lib/stt/deepgram-provider.ts`:

```typescript
/**
 * DeepgramProvider — Deepgram Streaming API 實作
 *
 * 連線流程：
 * 1. 建立 WebSocket 到 wss://api.deepgram.com/v1/listen
 * 2. sendAudio() 將 Float32Array 轉 Int16 PCM 後寫入
 * 3. 收到 JSON 回應包含 transcript 和 is_final
 */

import type { STTConfig, STTProvider } from "./types";

export class DeepgramProvider implements STTProvider {
  readonly name = "deepgram";

  private ws: WebSocket | null = null;
  private transcriptCallback: ((text: string, isFinal: boolean) => void) | null = null;
  private errorCallback: ((error: Error) => void) | null = null;

  async connect(config: STTConfig): Promise<void> {
    const params = new URLSearchParams({
      language: config.language,
      model: "nova-2",
      interim_results: "true",
      sample_rate: String(config.sampleRate),
      encoding: "linear16",
      channels: "1",
      token: config.apiKey, // 瀏覽器 WebSocket 不支援自訂 header，Deepgram 支援 token query parameter
    });

    const url = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    return new Promise<void>((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string);
          const transcript = data?.channel?.alternatives?.[0]?.transcript;
          const isFinal = data?.is_final ?? false;
          if (transcript && this.transcriptCallback) {
            this.transcriptCallback(transcript, isFinal);
          }
        } catch {
          // 忽略非 JSON 訊息
        }
      };

      this.ws.onclose = () => {
        if (this.errorCallback) {
          this.errorCallback(new Error("Deepgram WebSocket closed"));
        }
      };

      this.ws.onerror = () => {
        reject(new Error("Deepgram WebSocket connection failed"));
      };
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  sendAudio(chunk: Float32Array): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Float32 (-1 to 1) → Int16 PCM
    const int16 = new Int16Array(chunk.length);
    for (let i = 0; i < chunk.length; i++) {
      const s = Math.max(-1, Math.min(1, chunk[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    this.ws.send(int16.buffer);
  }

  onTranscript(callback: (text: string, isFinal: boolean) => void): void {
    this.transcriptCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/stt/stt-provider.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add lib/stt/types.ts lib/stt/deepgram-provider.ts lib/stt/stt-provider.test.ts
git commit -m "feat(stt): add STTProvider interface and Deepgram streaming implementation"
```

---

### Task 7: TrackingEngine — Orchestrator

**Files:**
- Create: `lib/ai-tracking/tracking-engine.ts`
- Create: `lib/ai-tracking/tracking-engine.test.ts`

- [ ] **Step 1: Write failing tests**

Create `lib/ai-tracking/tracking-engine.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TrackingEngine } from "./tracking-engine";
import type { STTProvider, STTConfig } from "../stt/types";
import type { AudioCapture } from "../audio/audio-capture";
import type { MatchConfig } from "./lyrics-matcher";

// Mock STT Provider
function createMockSTTProvider(): STTProvider & {
  _triggerTranscript: (text: string, isFinal: boolean) => void;
  _triggerError: (error: Error) => void;
} {
  let transcriptCb: ((text: string, isFinal: boolean) => void) | null = null;
  let errorCb: ((error: Error) => void) | null = null;

  return {
    name: "mock-stt",
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    sendAudio: vi.fn(),
    onTranscript: (cb) => { transcriptCb = cb; },
    onError: (cb) => { errorCb = cb; },
    isConnected: vi.fn().mockReturnValue(true),
    _triggerTranscript: (text, isFinal) => transcriptCb?.(text, isFinal),
    _triggerError: (error) => errorCb?.(error),
  };
}

// Mock AudioCapture
function createMockAudioCapture(): AudioCapture {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    setGain: vi.fn(),
    getVolume: vi.fn().mockReturnValue(0.5),
    getOutputStream: vi.fn().mockReturnValue(new MediaStream()),
    isCapturing: vi.fn().mockReturnValue(true),
  } as unknown as AudioCapture;
}

// Mock store
const mockJumpToLine = vi.fn();
const mockStore = {
  jumpToLine: mockJumpToLine,
  getCurrentIndex: vi.fn().mockReturnValue(0),
  getLyrics: vi.fn().mockReturnValue([
    "我走在回家的路上",
    "天空下起了小雨",
    "想起了你的笑容",
  ]),
  getLrcTimestamps: vi.fn().mockReturnValue(undefined),
};

describe("TrackingEngine", () => {
  let engine: TrackingEngine;
  let sttProvider: ReturnType<typeof createMockSTTProvider>;
  let audioCapture: ReturnType<typeof createMockAudioCapture>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    sttProvider = createMockSTTProvider();
    audioCapture = createMockAudioCapture();
    engine = new TrackingEngine({
      sttProvider,
      audioCapture,
      jumpToLine: mockJumpToLine,
      getCurrentIndex: mockStore.getCurrentIndex,
      getLyrics: mockStore.getLyrics,
      getLrcTimestamps: mockStore.getLrcTimestamps,
    });
  });

  afterEach(() => {
    engine.stop();
    vi.useRealTimers();
  });

  it("start initializes audio capture and STT provider", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    expect(audioCapture.start).toHaveBeenCalled();
    expect(sttProvider.connect).toHaveBeenCalled();
    expect(engine.isActive()).toBe(true);
  });

  it("stop cleans up all resources", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    engine.stop();
    expect(audioCapture.stop).toHaveBeenCalled();
    expect(sttProvider.disconnect).toHaveBeenCalled();
    expect(engine.isActive()).toBe(false);
  });

  it("calls jumpToLine when STT matches lyrics (final result)", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    sttProvider._triggerTranscript("天空下起了小雨", true);
    expect(mockJumpToLine).toHaveBeenCalledWith(1);
  });

  it("does NOT call jumpToLine for low confidence matches", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    sttProvider._triggerTranscript("完全無關的文字", true);
    expect(mockJumpToLine).not.toHaveBeenCalled();
  });

  it("does NOT call jumpToLine during cooldown", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    engine.onManualOverride();
    sttProvider._triggerTranscript("天空下起了小雨", true);
    expect(mockJumpToLine).not.toHaveBeenCalled();
  });

  it("resumes matching after cooldown expires", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    engine.onManualOverride();

    // Advance past default 5000ms cooldown
    vi.advanceTimersByTime(5100);

    sttProvider._triggerTranscript("天空下起了小雨", true);
    expect(mockJumpToLine).toHaveBeenCalledWith(1);
  });

  it("_lastAiLineIndex prevents self-echo cooldown", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    sttProvider._triggerTranscript("天空下起了小雨", true);
    expect(mockJumpToLine).toHaveBeenCalledWith(1);

    // Simulate WS echo-back: same line index comes back
    const isCooldown = engine.shouldIgnoreLineChange(1);
    expect(isCooldown).toBe(true); // It's an echo, ignore it

    // Different line index from another controller
    const isExternal = engine.shouldIgnoreLineChange(2);
    expect(isExternal).toBe(false); // External change, should trigger cooldown
  });

  it("ignores interim results (only final triggers jumpToLine)", async () => {
    await engine.start({ language: "zh-TW", sampleRate: 16000, apiKey: "test" });
    sttProvider._triggerTranscript("天空下起了", false); // interim
    expect(mockJumpToLine).not.toHaveBeenCalled();

    sttProvider._triggerTranscript("天空下起了小雨", true); // final
    expect(mockJumpToLine).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run lib/ai-tracking/tracking-engine.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement TrackingEngine**

Create `lib/ai-tracking/tracking-engine.ts`:

```typescript
/**
 * TrackingEngine — AI 歌詞追蹤整合引擎
 *
 * 串接 AudioCapture → STTProvider → LyricsMatcher → store.jumpToLine()
 * 是唯一知道全流程的模組。
 */

import type { STTProvider, STTConfig } from "../stt/types";
import type { AudioCapture } from "../audio/audio-capture";
import { matchLyrics, type MatchConfig } from "./lyrics-matcher";

export interface TrackingEngineConfig {
  sttProvider: STTProvider;
  audioCapture: AudioCapture;
  jumpToLine: (index: number) => void;
  getCurrentIndex: () => number;
  getLyrics: () => string[];
  getLrcTimestamps: () => number[] | undefined;
  matchConfig?: Partial<MatchConfig>;
  cooldownMs?: number;
}

const DEFAULT_MATCH_CONFIG: MatchConfig = {
  confidenceThreshold: 0.6,
  windowBefore: 2,
  windowAfter: 3,
  fullScanThreshold: 0.8,
  forwardBias: 0.1,
};

export class TrackingEngine {
  private sttProvider: STTProvider;
  private audioCapture: AudioCapture;
  private jumpToLine: (index: number) => void;
  private getCurrentIndex: () => number;
  private getLyrics: () => string[];
  private getLrcTimestamps: () => number[] | undefined;
  private matchConfig: MatchConfig;
  private cooldownMs: number;

  private _isActive = false;
  private _cooldownUntil: number | null = null;
  private _lastAiLineIndex: number | null = null;
  private _startTime: number | null = null;

  constructor(config: TrackingEngineConfig) {
    this.sttProvider = config.sttProvider;
    this.audioCapture = config.audioCapture;
    this.jumpToLine = config.jumpToLine;
    this.getCurrentIndex = config.getCurrentIndex;
    this.getLyrics = config.getLyrics;
    this.getLrcTimestamps = config.getLrcTimestamps;
    this.matchConfig = { ...DEFAULT_MATCH_CONFIG, ...config.matchConfig };
    this.cooldownMs = config.cooldownMs ?? 5000;
  }

  /**
   * 啟動 AI 追蹤
   */
  async start(sttConfig: STTConfig, deviceId?: string, gainDb?: number): Promise<void> {
    // 啟動音訊擷取
    await this.audioCapture.start(deviceId, gainDb);

    // 連線 STT provider
    this.sttProvider.onTranscript((text, isFinal) => {
      this.handleTranscript(text, isFinal);
    });

    this.sttProvider.onError((_error) => {
      // 錯誤處理交由 UI 層透過 store 顯示
    });

    await this.sttProvider.connect(sttConfig);

    this._isActive = true;
    this._startTime = Date.now();
  }

  /**
   * 停止 AI 追蹤
   */
  stop(): void {
    this.sttProvider.disconnect();
    this.audioCapture.stop();
    this._isActive = false;
    this._cooldownUntil = null;
    this._lastAiLineIndex = null;
    this._startTime = null;
  }

  /**
   * 手動介入通知（由 Controller UI 呼叫）
   */
  onManualOverride(): void {
    this._cooldownUntil = Date.now() + this.cooldownMs;
    this._lastAiLineIndex = null;
  }

  /**
   * 判斷 line_changed 回彈是否應忽略（用於 WebSocket echo-back）
   * @returns true = 是 AI 自己觸發的回彈，應忽略
   */
  shouldIgnoreLineChange(lineIndex: number): boolean {
    return this._lastAiLineIndex === lineIndex;
  }

  isActive(): boolean {
    return this._isActive;
  }

  /**
   * 更新比對設定（從設定面板）
   */
  updateMatchConfig(partial: Partial<MatchConfig>): void {
    this.matchConfig = { ...this.matchConfig, ...partial };
  }

  updateCooldownMs(ms: number): void {
    this.cooldownMs = ms;
  }

  private handleTranscript(text: string, isFinal: boolean): void {
    // 只處理 final results（interim 只用於 UI 顯示）
    if (!isFinal) return;

    // 檢查冷卻
    if (this._cooldownUntil && Date.now() < this._cooldownUntil) return;
    // 冷卻過期，清除
    if (this._cooldownUntil && Date.now() >= this._cooldownUntil) {
      this._cooldownUntil = null;
    }

    const lyrics = this.getLyrics();
    const currentIndex = this.getCurrentIndex();
    const timestamps = this.getLrcTimestamps();
    const elapsedMs = this._startTime ? Date.now() - this._startTime : undefined;

    const result = matchLyrics(
      text,
      lyrics,
      currentIndex,
      this.matchConfig,
      timestamps,
      elapsedMs
    );

    if (result) {
      this._lastAiLineIndex = result.lineIndex;
      this.jumpToLine(result.lineIndex);
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run lib/ai-tracking/tracking-engine.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add lib/ai-tracking/tracking-engine.ts lib/ai-tracking/tracking-engine.test.ts
git commit -m "feat(ai-tracking): add TrackingEngine orchestrator with cooldown and echo-back handling"
```

---

## Chunk 4: UI Components + Controller Integration

### Task 8: UI Components — AiStatusIndicator, AudioInputSelector, AiTrackingPanel

**Files:**
- Create: `components/ai-tracking/AiStatusIndicator.tsx`
- Create: `components/ai-tracking/AudioInputSelector.tsx`
- Create: `components/ai-tracking/AiTrackingPanel.tsx`

No unit tests for UI components per project convention (UI tested via visual inspection and E2E). Focus on build passing.

- [ ] **Step 1: Create AiStatusIndicator**

Create `components/ai-tracking/AiStatusIndicator.tsx`:

```tsx
"use client";

import type { AiTrackingStatus } from "@/types";

interface AiStatusIndicatorProps {
  status: AiTrackingStatus;
  confidence: number;
  lastMatchedLine: number | null;
  cooldownUntil: number | null;
}

const statusConfig: Record<AiTrackingStatus, { color: string; label: string }> = {
  idle: { color: "bg-gray-500", label: "待機" },
  listening: { color: "bg-cyan-400 animate-pulse", label: "監聽中" },
  matched: { color: "bg-emerald-400", label: "已匹配" },
  cooldown: { color: "bg-amber-400", label: "冷卻中" },
  error: { color: "bg-red-500", label: "錯誤" },
};

export function AiStatusIndicator({
  status,
  confidence,
  lastMatchedLine,
  cooldownUntil,
}: AiStatusIndicatorProps) {
  const config = statusConfig[status];
  const cooldownRemaining = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000)) : 0;

  return (
    <div className="flex items-center gap-3 text-sm text-gray-300">
      <span className="flex items-center gap-1.5">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${config.color}`} />
        {config.label}
      </span>
      {status === "matched" && (
        <span className="text-emerald-400">
          信心度: {(confidence * 100).toFixed(0)}%
          {lastMatchedLine !== null && ` · 第 ${lastMatchedLine + 1} 行`}
        </span>
      )}
      {status === "cooldown" && cooldownRemaining > 0 && (
        <span className="text-amber-400">
          (手動介入後 {cooldownRemaining}s)
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create AudioInputSelector**

Create `components/ai-tracking/AudioInputSelector.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Volume2 } from "lucide-react";

interface AudioInputSelectorProps {
  deviceId: string | null;
  gain: number;
  volume: number;
  onDeviceChange: (deviceId: string) => void;
  onGainChange: (gain: number) => void;
}

export function AudioInputSelector({
  deviceId,
  gain,
  volume,
  onDeviceChange,
  onGainChange,
}: AudioInputSelectorProps) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const loadDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(allDevices.filter((d) => d.kind === "audioinput"));
    } catch {
      // 權限未授予時無法列出設備
    }
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  // 音量指示條顏色
  const volumePercent = Math.round(volume * 100);
  const volumeColor =
    volume < 0.5 ? "bg-emerald-400" : volume < 0.8 ? "bg-yellow-400" : "bg-red-400";

  return (
    <div className="flex flex-col gap-2">
      {/* 音訊來源選擇 */}
      <div className="flex items-center gap-2">
        <Volume2 className="w-4 h-4 text-gray-400 shrink-0" />
        <select
          value={deviceId ?? ""}
          onChange={(e) => onDeviceChange(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-gray-200 focus:border-cyan-400 focus:outline-none"
        >
          <option value="">預設裝置</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `裝置 ${d.deviceId.slice(0, 8)}`}
            </option>
          ))}
        </select>
      </div>

      {/* Gain Slider */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-8">Gain</span>
        <input
          type="range"
          min={0}
          max={20}
          step={1}
          value={gain}
          onChange={(e) => onGainChange(Number(e.target.value))}
          className="flex-1 accent-cyan-400"
        />
        <span className="text-xs text-gray-400 w-10 text-right">+{gain}dB</span>
      </div>

      {/* 音量指示條 */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${volumeColor} transition-all duration-100`}
          style={{ width: `${volumePercent}%` }}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create AiTrackingPanel**

Create `components/ai-tracking/AiTrackingPanel.tsx`:

```tsx
"use client";

import { Settings } from "lucide-react";
import { useLyricsStore } from "@/lib/store";
import { AiStatusIndicator } from "./AiStatusIndicator";
import { AudioInputSelector } from "./AudioInputSelector";

interface AiTrackingPanelProps {
  onToggle: (active: boolean) => void;
  onSettingsClick: () => void;
}

export function AiTrackingPanel({ onToggle, onSettingsClick }: AiTrackingPanelProps) {
  const aiTracking = useLyricsStore((s) => s.aiTracking);
  const audioInput = useLyricsStore((s) => s.audioInput);
  const updateAudioInput = useLyricsStore((s) => s.updateAudioInput);

  return (
    <div className="border border-gray-700 rounded-lg p-3 bg-gray-800/50 space-y-3">
      {/* 標題列：開關 + 設定 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-200">AI 監聽</span>
          <button
            onClick={() => onToggle(!aiTracking.isActive)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              aiTracking.isActive ? "bg-cyan-500" : "bg-gray-600"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                aiTracking.isActive ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <button
          onClick={onSettingsClick}
          className="text-gray-400 hover:text-gray-200 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* 啟用時顯示音訊輸入和狀態 */}
      {aiTracking.isActive && (
        <>
          <AudioInputSelector
            deviceId={audioInput.deviceId}
            gain={audioInput.gain}
            volume={audioInput.volume}
            onDeviceChange={(id) => updateAudioInput({ deviceId: id })}
            onGainChange={(g) => updateAudioInput({ gain: g })}
          />
          <AiStatusIndicator
            status={aiTracking.status}
            confidence={aiTracking.confidence}
            lastMatchedLine={aiTracking.lastMatchedLine}
            cooldownUntil={aiTracking.cooldownUntil}
          />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Verify build passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/ai-tracking/AiStatusIndicator.tsx components/ai-tracking/AudioInputSelector.tsx components/ai-tracking/AiTrackingPanel.tsx
git commit -m "feat(ui): add AI tracking panel with status indicator and audio input selector"
```

---

### Task 9: Controller Integration — Wire Everything Together

**Files:**
- Modify: `app/controller/page.tsx` — import AiTrackingPanel, add to layout, wire up TrackingEngine with keyboard shortcut handlers

This task creates a `useAiTracking` custom hook that manages TrackingEngine lifecycle, then wires the AiTrackingPanel into the Controller page with proper manual override integration.

**Files:**
- Create: `lib/hooks/use-ai-tracking.ts`
- Modify: `app/controller/page.tsx`

- [ ] **Step 1: Create useAiTracking custom hook**

Create `lib/hooks/use-ai-tracking.ts`:

```typescript
"use client";

/**
 * useAiTracking — 管理 TrackingEngine 生命週期的 React Hook
 *
 * 負責：建立/銷毀 TrackingEngine、連接 store、提供 onManualOverride 回呼
 */

import { useRef, useCallback, useEffect } from "react";
import { useLyricsStore } from "@/lib/store";
import { TrackingEngine } from "@/lib/ai-tracking/tracking-engine";
import { AudioCapture } from "@/lib/audio/audio-capture";
import { DeepgramProvider } from "@/lib/stt/deepgram-provider";

export function useAiTracking() {
  const engineRef = useRef<TrackingEngine | null>(null);
  const audioCaptureRef = useRef<AudioCapture | null>(null);
  const volumeRafRef = useRef<number | null>(null);

  const startAiTracking = useLyricsStore((s) => s.startAiTracking);
  const stopAiTracking = useLyricsStore((s) => s.stopAiTracking);
  const updateAiStatus = useLyricsStore((s) => s.updateAiStatus);
  const updateAudioInput = useLyricsStore((s) => s.updateAudioInput);
  const triggerManualOverride = useLyricsStore((s) => s.triggerManualOverride);
  const aiSettings = useLyricsStore((s) => s.aiSettings);
  const audioInput = useLyricsStore((s) => s.audioInput);

  // 音量輪詢：用 requestAnimationFrame 定期更新 store 的 volume
  const startVolumePolling = useCallback(() => {
    const poll = () => {
      if (audioCaptureRef.current?.isCapturing()) {
        const volume = audioCaptureRef.current.getVolume();
        updateAudioInput({ volume });
      }
      volumeRafRef.current = requestAnimationFrame(poll);
    };
    volumeRafRef.current = requestAnimationFrame(poll);
  }, [updateAudioInput]);

  const stopVolumePolling = useCallback(() => {
    if (volumeRafRef.current !== null) {
      cancelAnimationFrame(volumeRafRef.current);
      volumeRafRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    try {
      const store = useLyricsStore.getState();
      const settings = store.aiSettings;

      // 取得 API key：優先使用者自行輸入，其次從後端取得
      let apiKey = settings.apiKey;
      if (!apiKey) {
        const resp = await fetch("/api/stt/token");
        if (!resp.ok) {
          updateAiStatus("error");
          return;
        }
        const data = await resp.json();
        apiKey = data.token;
      }

      const audioCapture = new AudioCapture();
      audioCaptureRef.current = audioCapture;

      const sttProvider = new DeepgramProvider();

      const engine = new TrackingEngine({
        sttProvider,
        audioCapture,
        jumpToLine: useLyricsStore.getState().jumpToLine,
        getCurrentIndex: () => useLyricsStore.getState().currentIndex,
        getLyrics: () => useLyricsStore.getState().lyrics,
        getLrcTimestamps: () => useLyricsStore.getState().currentSong?.lrcTimestamps,
        matchConfig: {
          confidenceThreshold: settings.confidenceThreshold,
          windowBefore: settings.windowBefore,
          windowAfter: settings.windowAfter,
          fullScanThreshold: settings.fullScanThreshold,
        },
        cooldownMs: settings.manualOverrideCooldown,
      });

      engineRef.current = engine;

      await engine.start(
        { language: "zh-TW", sampleRate: 16000, apiKey: apiKey! },
        store.audioInput.deviceId ?? undefined,
        store.audioInput.gain
      );

      startAiTracking();
      startVolumePolling();
    } catch (error) {
      updateAiStatus("error");
    }
  }, [startAiTracking, updateAiStatus, startVolumePolling]);

  const stop = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    audioCaptureRef.current = null;
    stopVolumePolling();
    stopAiTracking();
    updateAudioInput({ volume: 0 });
  }, [stopAiTracking, updateAudioInput, stopVolumePolling]);

  // 手動介入：同時通知 store 和 TrackingEngine
  const onManualOverride = useCallback(() => {
    triggerManualOverride();
    engineRef.current?.onManualOverride();
  }, [triggerManualOverride]);

  // WebSocket echo-back 判斷
  const shouldIgnoreLineChange = useCallback((lineIndex: number) => {
    return engineRef.current?.shouldIgnoreLineChange(lineIndex) ?? false;
  }, []);

  // Gain 即時同步
  useEffect(() => {
    audioCaptureRef.current?.setGain(audioInput.gain);
  }, [audioInput.gain]);

  // 清理
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
      stopVolumePolling();
    };
  }, [stopVolumePolling]);

  return { start, stop, onManualOverride, shouldIgnoreLineChange };
}
```

- [ ] **Step 2: Add AiTrackingPanel and useAiTracking to Controller**

At the top of `app/controller/page.tsx`, add imports:

```typescript
import { AiTrackingPanel } from "@/components/ai-tracking/AiTrackingPanel";
import { useAiTracking } from "@/lib/hooks/use-ai-tracking";
```

Inside the Controller component, add:

```typescript
const { start: startAi, stop: stopAi, onManualOverride } = useAiTracking();
```

- [ ] **Step 3: Add AiTrackingPanel to the Controller layout**

Find the Cue Grid section in the Controller layout. Insert `AiTrackingPanel` above the cue grid area inside the center panel:

```tsx
<AiTrackingPanel
  onToggle={(active) => {
    if (active) {
      startAi();
    } else {
      stopAi();
    }
  }}
  onSettingsClick={() => {
    // 開啟設定面板（與現有設定 UI 整合）
  }}
/>
```

- [ ] **Step 4: Wire onManualOverride to existing keyboard/click handlers**

Find the existing `nextLine`/`prevLine`/`jumpToLine` calls in the Controller's keyboard and click handlers. After each manual navigation call, add `onManualOverride()`:

```typescript
// 範例：在現有的 onKeyDown handler 中
case "ArrowRight":
case "ArrowDown":
  nextLine();
  onManualOverride(); // 通知 AI 進入冷卻
  break;
case "ArrowLeft":
case "ArrowUp":
  prevLine();
  onManualOverride(); // 通知 AI 進入冷卻
  break;

// 範例：在歌詞行的 onClick handler 中
onClick={() => {
  jumpToLine(index);
  onManualOverride(); // 通知 AI 進入冷卻
}}
```

- [ ] **Step 5: Verify build passes**

Run: `npm run build`
Expected: PASS

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 7: Verify Go backend builds**

Run: `cd backend && go build ./cmd/server/ && go test ./...`
Expected: ALL PASS

- [ ] **Step 8: Commit**

```bash
git add lib/hooks/use-ai-tracking.ts app/controller/page.tsx
git commit -m "feat(controller): integrate AI tracking with useAiTracking hook and manual override wiring"
```

---

## Summary

| Task | Module | New Tests | New Files |
|------|--------|-----------|-----------|
| 1 | Type definitions | 0 (type-check only) | 0 (modify existing) |
| 2 | Store integration | ~6 | 0 (modify existing) |
| 3 | Go STT endpoint | ~2 | 2 (handler + test) |
| 4 | LyricsMatcher | ~15 | 2 (module + test) |
| 5 | AudioCapture | ~8 | 2 (module + test) |
| 6 | STT Provider | ~6 | 3 (types + provider + test) |
| 7 | TrackingEngine | ~8 | 2 (module + test) |
| 8 | UI Components | 0 | 3 (components) |
| 9 | Controller Integration | 0 | 1 (hook) + modify existing |
| **Total** | | **~45** | **15 new files** |
