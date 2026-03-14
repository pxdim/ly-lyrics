# 歌詞搜尋整合設計文件

> 日期：2026-03-14
> 狀態：設計完成，待實作
> 範圍：LY 歌詞顯示系統 — 新增多來源歌詞搜尋功能

---

## 1. 目標

讓使用者在現場活動中，透過輸入歌名、歌手或歌詞片段，快速從多個來源搜尋並匯入歌詞到歌單，同時保留既有的手動輸入和 LRC 拖放匯入功能。

### 成功標準

- 搜尋到第一批結果的時間 < 2 秒
- 中文歌曲覆蓋率 > 90%（LrcApi 酷狗+網易+咪咕）
- 英文/國際歌曲覆蓋率 > 80%（LRClib + Genius）
- 保留既有功能不受影響（手動輸入、LRC 拖放匯入）

---

## 2. 架構概覽

採用 **Go 後端統一聚合** 方案。Go 後端新增歌詞搜尋端點，以 goroutine 並行呼叫四個歌詞來源，合併結果後回傳統一格式的候選清單。

```
前端 AddSongModal（Tab 切換）
    ↓ POST /api/lyrics/search
    ↓ (Next.js rewrites 代理)
Go 後端 — LyricsSearchHandler
    ├── goroutine → LRClib API（外部 HTTPS）
    ├── goroutine → LrcApi（Docker 內網 http://lrcapi:28883）
    ├── goroutine → Genius API（外部 HTTPS）
    └── goroutine → Gemini API（條件觸發）
    ↓ 合併 + 排序 + 標記來源/可信度
前端渲染候選清單 → 用戶選擇 → 預覽 → 匯入歌單
```

### 選擇此方案的原因

1. Go 的 goroutine 天然適合並行 HTTP 呼叫
2. LrcApi 與 Go 後端同在 Docker 網路，內網通訊延遲 < 1ms
3. 所有 API Key 集中在 Go 後端環境變數，安全管理
4. 符合既有架構（所有業務邏輯都在 Go 後端）
5. 前端只需對接單一端點，邏輯最簡單

---

## 3. 四層歌詞來源

| 層級 | 來源 | 可信度 | 同步歌詞 | 覆蓋強項 | 需要 Key | 合法性 |
|------|------|--------|---------|---------|---------|--------|
| 1 | LRClib | 🟢 高 | ✅ 有 | 英文/國際 | ❌ 不需要 | ✅ 合法 |
| 2 | LrcApi（酷狗+網易+咪咕）| 🟢 高 | ✅ 有 | 中文歌曲 | ❌ 自架 | ⚠️ 逆向工程 |
| 3 | Genius | 🟡 中 | ❌ 無 | 英文/全語言 | ✅ 免費 Token | ✅ 合法 |
| 4 | Gemini + Grounding | 🟠 低 | ❌ 無 | 全語言兜底 | ✅ 付費 | ✅ 合法 |

### 降級策略

啟動時根據環境變數動態決定啟用哪些 Provider：

- `LRCAPI_URL` 有設定 → 啟用 LrcApi Provider
- `GENIUS_API_TOKEN` 有設定 → 啟用 Genius Provider
- `GEMINI_API_KEY` 有設定 → 啟用 Gemini Provider
- LRClib → 永遠啟用（無需 Key）

最少只需要 LRClib 就能運作。

### Gemini 條件觸發

Gemini 不是每次都呼叫，僅在前三個來源的結果總數 < 3 筆時才觸發，避免浪費 API 額度。

---

## 4. API 設計

### 4.1 搜尋端點：`POST /api/lyrics/search`

**Request：**

```json
{
  "query": "告白氣球",
  "searchType": "title",
  "artist": "周杰倫",
  "page": 1,
  "pageSize": 20
}
```

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `query` | string | ✅ | 搜尋關鍵字 |
| `searchType` | enum | ✅ | `"title"` / `"artist"` / `"lyrics"` |
| `artist` | string | ❌ | 搭配 title 搜尋時可選填歌手 |
| `page` | int | ❌ | 預設 1 |
| `pageSize` | int | ❌ | 預設 20，上限 50 |

**Response：**

```json
{
  "results": [
    {
      "id": "lrclib-12345",
      "title": "告白氣球",
      "artist": "周杰倫",
      "album": "周杰倫的床邊故事",
      "source": "lrclib",
      "confidence": "high",
      "hasSyncedLyrics": true,
      "hasPlainLyrics": true,
      "duration": 215,
      "ratio": null,
      "coverUrl": null,
      "isSimplified": false,
      "isAiGenerated": false
    },
    {
      "id": "lrcapi-netease-8a3f...",
      "title": "告白气球",
      "artist": "周杰伦",
      "album": "周杰伦的床边故事",
      "source": "lrcapi-netease",
      "confidence": "high",
      "hasSyncedLyrics": true,
      "hasPlainLyrics": true,
      "duration": null,
      "ratio": 0.98,
      "coverUrl": "https://p1.music.126.net/...",
      "isSimplified": true,
      "isAiGenerated": false
    },
    {
      "id": "genius-678",
      "title": "告白氣球 (Confession Balloon)",
      "artist": "Jay Chou",
      "album": "Jay Chou's Bedtime Stories",
      "source": "genius",
      "confidence": "medium",
      "hasSyncedLyrics": false,
      "hasPlainLyrics": true,
      "duration": null,
      "ratio": null,
      "coverUrl": "https://images.genius.com/...",
      "isSimplified": false,
      "isAiGenerated": false
    },
    {
      "id": "gemini-uuid",
      "title": "告白氣球",
      "artist": "周杰倫",
      "source": "gemini",
      "confidence": "low",
      "hasSyncedLyrics": false,
      "hasPlainLyrics": true,
      "duration": null,
      "ratio": null,
      "coverUrl": null,
      "isSimplified": false,
      "isAiGenerated": true
    }
  ],
  "sources": {
    "lrclib": { "status": "ok", "count": 1, "latencyMs": 320 },
    "lrcapi": { "status": "ok", "count": 3, "latencyMs": 45 },
    "genius": { "status": "ok", "count": 1, "latencyMs": 890 },
    "gemini": { "status": "skipped", "count": 0, "latencyMs": 0 }
  },
  "totalResults": 5
}
```

### 4.2 取得歌詞端點：`GET /api/lyrics/search/{id}`

用戶選擇候選結果後，取得完整歌詞內容。

**Response：**

```json
{
  "id": "lrcapi-netease-8a3f...",
  "title": "告白气球",
  "artist": "周杰伦",
  "album": "周杰伦的床边故事",
  "source": "lrcapi-netease",
  "syncedLyrics": "[00:00.00]告白气球\n[00:12.34]塞纳河畔 左岸的咖啡...",
  "plainLyrics": "告白气球\n塞纳河畔 左岸的咖啡...",
  "isSimplified": true
}
```

### 4.3 搜尋類型對各 Provider 的查詢方式

| Provider | searchType=title | searchType=artist | searchType=lyrics |
|----------|-----------------|-------------------|-------------------|
| LRClib | `track_name` + `artist_name` | `artist_name` | `q` 參數 |
| LrcApi | `title` + `artist` | `artist` | `title` 帶歌詞片段 |
| Genius | search endpoint | search endpoint | search endpoint |
| Gemini | prompt 指定找歌詞 | prompt 指定找歌手的歌 | prompt 指定找含此歌詞的歌 |

### 4.4 排序規則

1. `confidence`：high > medium > low
2. `hasSyncedLyrics`：有時間戳排前面
3. `ratio`（若有）：高分排前面
4. `source` 優先級：lrclib > lrcapi > genius > gemini

---

## 5. Go 後端架構

### 5.1 目錄結構（新增部分）

```
backend/internal/
├── handler/
│   └── lyrics_search.go        # HTTP handler
├── service/
│   └── lyrics_search.go        # 聚合搜尋邏輯
├── provider/                    # 新目錄 — 歌詞來源提供者
│   ├── provider.go             # Provider 介面定義
│   ├── lrclib.go               # LRClib 實作
│   ├── lrcapi.go               # LrcApi 實作
│   ├── genius.go               # Genius 實作
│   └── gemini.go               # Gemini 實作
├── dto/
│   └── lyrics_search.go        # Request/Response DTO
└── config/
    └── config.go               # 新增環境變數
```

### 5.2 Provider 介面

```go
type LyricsResult struct {
    ID              string
    Title           string
    Artist          string
    Album           string
    Source          string   // "lrclib", "lrcapi-kugou", "lrcapi-netease", "genius", "gemini"
    Confidence     string   // "high", "medium", "low"
    HasSyncedLyrics bool
    HasPlainLyrics  bool
    SyncedLyrics    string  // LRC 格式（搜尋時可為空，詳情時填入）
    PlainLyrics     string
    Duration        *int
    Ratio           *float64
    CoverURL        *string
    IsSimplified    bool
    IsAiGenerated   bool
}

type SearchRequest struct {
    Query      string
    SearchType string // "title", "artist", "lyrics"
    Artist     string
}

type Provider interface {
    Search(ctx context.Context, req SearchRequest) ([]LyricsResult, error)
    GetLyrics(ctx context.Context, id string) (*LyricsResult, error)
    Name() string
}
```

### 5.3 聚合搜尋邏輯

```go
type LyricsSearchService struct {
    providers []provider.Provider
    timeout   time.Duration  // 全局超時 8 秒
}

func (s *LyricsSearchService) Search(ctx context.Context, req dto.LyricsSearchRequest) (*dto.LyricsSearchResponse, error) {
    ctx, cancel := context.WithTimeout(ctx, s.timeout)
    defer cancel()

    var wg sync.WaitGroup
    resultsCh := make(chan providerResult, len(s.providers))

    for _, p := range s.providers {
        wg.Add(1)
        go func(p provider.Provider) {
            defer wg.Done()
            start := time.Now()
            results, err := p.Search(ctx, toSearchReq(req))
            resultsCh <- providerResult{
                source:  p.Name(),
                results: results,
                err:     err,
                latency: time.Since(start),
            }
        }(p)
    }

    go func() { wg.Wait(); close(resultsCh) }()

    // 收集結果、合併、排序、回傳
}
```

### 5.4 路由註冊

```go
// server/routes.go — 加在 OptionalAuth group 內
r.Route("/api/lyrics", func(r chi.Router) {
    r.Post("/search", lyricsSearchHandler.Search)
    r.Get("/search/{id}", lyricsSearchHandler.GetLyrics)
})
```

---

## 6. 前端 UI 設計

### 6.1 組件結構（新增/修改）

```
components/
├── controller/
│   └── AddSongModal.tsx          # 修改 — 加入 Tab 切換
├── lyrics-search/                # 新目錄
│   ├── LyricsSearchPanel.tsx     # 搜尋面板（輸入 + 結果清單）
│   ├── LyricsSearchInput.tsx     # 搜尋輸入框 + 類型切換
│   ├── LyricsSearchResults.tsx   # 候選清單
│   ├── LyricsResultCard.tsx      # 單筆結果卡片
│   ├── LyricsPreviewModal.tsx    # 歌詞預覽 + 確認匯入
│   └── SimplifiedToggle.tsx      # 簡繁轉換開關
lib/
├── api/
│   └── lyrics-search.ts          # API 呼叫封裝
└── utils/
    └── chinese-converter.ts      # OpenCC 簡繁轉換
```

### 6.2 AddSongModal Tab 切換

原有 AddSongModal 改為 Tab 式：

| Tab | 功能 | 狀態 |
|-----|------|------|
| 🔍 搜尋歌詞 | 新功能 — 多來源歌詞搜尋 | **預設開啟** |
| ✏️ 手動輸入 | 既有功能 — 手動填寫歌名+歌詞 | 保留不變 |
| 📄 匯入 LRC | 既有功能 — LrcDropZone 拖放匯入 | 保留不變 |

### 6.3 搜尋歌詞 Tab 互動流程

```
┌─ 搜尋歌詞 Tab ────────────────────────────────────────┐
│                                                        │
│  搜尋類型: (● 歌曲名) (○ 歌手) (○ 歌詞)                │
│                                                        │
│  [ 輸入歌曲名稱...                            🔍 ]     │
│  歌手（選填）：                                         │
│  [ 輸入歌手名稱...                               ]     │
│                                                        │
│  ── 搜尋結果（6 筆）──────────── 載入中: Gemini ⏳ ──   │
│                                                        │
│  🟢 告白氣球 — 周杰倫                                   │
│     LRClib · ⏱ 有時間戳 · 3:35                         │
│                                                        │
│  🟢 告白气球 — 周杰伦                       [簡]        │
│     網易雲 · ⏱ 有時間戳 · 相似度 98%                    │
│                                                        │
│  🟢 告白气球 — 周杰伦                       [簡]        │
│     酷狗 · ⏱ 有時間戳 · 相似度 95%                      │
│                                                        │
│  🟡 告白氣球 (Confession Balloon) — Jay Chou            │
│     Genius · 📝 純文字                                  │
│                                                        │
│  🟠 告白氣球 — 周杰倫                                   │
│     AI 搜尋 · 🤖 AI 生成 · 建議核對                     │
└────────────────────────────────────────────────────────┘
```

### 6.4 歌詞預覽 Modal

點擊候選結果後彈出預覽：

```
┌─ 歌詞預覽 ──────────────────────────────────── ✕ ─┐
│                                                    │
│  告白气球 — 周杰伦                                  │
│  來源：網易雲  ⏱ 有時間戳  相似度 98%                │
│                                                    │
│  [ 🔄 轉繁體 ]  ← 開關                             │
│                                                    │
│  ┌─ 歌詞內容 ──────────────────── 可捲動 ──┐      │
│  │  [00:00.00] 告白氣球                     │      │
│  │  [00:12.34] 塞納河畔 左岸的咖啡           │      │
│  │  [00:16.78] 我手一杯 品嚐你的美            │      │
│  │  [00:21.12] 留下唇印的嘴                  │      │
│  │  ...                                     │      │
│  └──────────────────────────────────────────┘      │
│                                                    │
│           [ 取消 ]    [ ✅ 匯入到歌單 ]              │
└────────────────────────────────────────────────────┘
```

### 6.5 自動搜尋行為

- 輸入 >= 2 個字元後，500ms debounce 自動觸發背景搜尋
- 同時提供 🔍 按鈕手動觸發
- 結果即時渲染，後到的 Provider 結果動態合併

### 6.6 匯入流程

```
用戶點擊「匯入到歌單」
    ↓
GET /api/lyrics/search/{id}  → 取得完整歌詞
    ↓
（若用戶開啟「轉繁體」）→ OpenCC 簡繁轉換
    ↓
parseLRC(syncedLyrics)  → lyrics[] + timestamps[]
    ↓
createSong({ title, artist, lyrics, lrcTimestamps })
    ↓
歌曲出現在 Controller 歌單中
```

### 6.7 簡繁轉換

使用 [opencc-js](https://www.npmjs.com/package/opencc-js)（~50KB）：

```typescript
import OpenCC from 'opencc-js';
const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
// "简体歌词" → "簡體歌詞"
```

- 在 LyricsPreviewModal 中，用戶可切換「轉繁體」開關
- 開關僅影響預覽和匯入，不影響搜尋結果的原始資料
- `isSimplified` 欄位用於判斷是否顯示轉換開關

### 6.8 搜尋類型對 UI 的影響

| searchType | 輸入框 placeholder | 歌手欄位 |
|------------|-------------------|---------|
| `title` | "輸入歌曲名稱..." | 顯示（選填） |
| `artist` | "輸入歌手名稱..." | 隱藏 |
| `lyrics` | "輸入歌詞片段..." | 顯示（選填） |

---

## 7. Docker 部署

### 7.1 docker-compose 新增

```yaml
services:
  go-backend:
    environment:
      LRCAPI_URL: http://lrcapi:28883
      GENIUS_API_TOKEN: ${GENIUS_API_TOKEN}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
    depends_on:
      - lrcapi

  lrcapi:
    image: hisatri/lrcapi:1.6.0
    container_name: ly-lrcapi
    restart: always
    ports:
      - "28883:28883"
    environment:
      - API_AUTH=${LRCAPI_AUTH_KEY}
    networks:
      - ly-network
```

### 7.2 環境變數清單

| 變數 | 必填 | 說明 | 範例 |
|------|------|------|------|
| `LRCAPI_URL` | ✅ | LrcApi 內網地址 | `http://lrcapi:28883` |
| `LRCAPI_AUTH_KEY` | ❌ | LrcApi 認證 Key | `my-secret` |
| `GENIUS_API_TOKEN` | ✅ | Genius API Bearer Token | `Bearer xxxxx` |
| `GEMINI_API_KEY` | ❌ | Gemini API Key（無則停用） | `AIzaSy...` |

### 7.3 API Key 取得方式

**Genius：**
1. [genius.com/api-clients](https://genius.com/api-clients) 註冊
2. 建立 API Client → 取得 Client Access Token
3. 免費，無需審核

**Gemini：**
1. [Google AI Studio](https://aistudio.google.com/apikey) 建立
2. 免費額度：15 RPM / 100 萬 token/月
3. Optional — 未設定則跳過 Gemini 層

---

## 8. 技術細節

### 8.1 超時策略

- 全局超時：8 秒
- 個別 Provider 超時：由 context 統一管理
- 任何 Provider 超時就略過，已收到的結果照常回傳

### 8.2 搜尋結果 ID 編碼

每個來源的結果需要一個可識別的 ID，用於 `GET /api/lyrics/search/{id}` 取得完整歌詞：

- LRClib：`lrclib-{lrclib_id}`
- LrcApi：`lrcapi-{source}-{md5_hash}`（source = kugou/netease/migu）
- Genius：`genius-{genius_id}`
- Gemini：`gemini-{uuid}`（暫存在記憶體 cache，TTL 10 分鐘）

### 8.3 Gemini 暫存

Gemini 生成的歌詞沒有外部 ID 可回查，需在 Go 後端暫存：

- 使用 `sync.Map` 或簡易 in-memory cache
- Key：生成的 UUID
- Value：歌詞內容
- TTL：10 分鐘（過期後需重新搜尋）

### 8.4 錯誤處理

- 單一 Provider 失敗不影響其他 Provider 的結果
- `sources` 欄位回報每個 Provider 的狀態（ok/error/timeout/skipped）
- 所有 Provider 都失敗時回傳 HTTP 200 + 空結果集（不是 500）

---

## 9. 不在範圍內

以下功能不在本次實作範圍：

- 歌詞編輯功能（匯入後在 Controller 內直接編輯）
- 歌詞收藏/歷史記錄
- 離線歌詞快取
- 和弦顯示與轉調
- YouTube 音訊整合
- 逐字卡拉 OK 效果

---

## 10. 依賴

### 新增 npm 套件

| 套件 | 用途 | 大小 |
|------|------|------|
| `opencc-js` | 簡繁中文轉換 | ~50KB |

### 新增 Go 套件

無新增外部套件。使用 Go 標準庫 `net/http`、`sync`、`context` 即可完成所有 HTTP 呼叫和並行處理。

### 新增 Docker 服務

| 服務 | 映像 | 用途 |
|------|------|------|
| `lrcapi` | `hisatri/lrcapi:1.6.0` | 中文歌詞聚合（酷狗+網易+咪咕） |
