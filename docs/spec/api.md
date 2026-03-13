# API 文檔

## API 概覽

LY 系統的所有 API 由 **Go 後端** 提供。前端透過 Next.js rewrites 將 `/api/*` 請求代理到 Go 後端 `:8080`。

WebSocket 則由前端直連 Go 後端的 `/ws` 端點。

---

## Base URL

```
開發環境: http://localhost:8080/api    （前端透過 Next.js proxy: http://localhost:3000/api）
生產環境: https://ly-go-backend-production.up.railway.app/api
```

---

## 認證

使用 JWT Bearer Token：

```http
Authorization: Bearer {access_token}
```

**兩種認證模式：**
- `RequireAuth` — 必須提供有效 token，否則回傳 401
- `OptionalAuth` — 有 token 則驗證，無 token 則使用 Demo User（ID: `00000000-0000-0000-0000-000000000001`）

---

## REST API 端點

### 認證 (Auth) — 速率限制 10 req/min

#### POST /api/auth/register

**請求:**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "使用者名稱"
}
```

**回應 (201):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "使用者名稱"
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

#### POST /api/auth/login

**請求:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**回應 (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "使用者名稱"
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

#### POST /api/auth/refresh

**請求:**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**回應 (200):**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

#### GET /api/auth/me — RequireAuth

**回應 (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "使用者名稱"
  }
}
```

---

### 歌曲管理 (Songs) — OptionalAuth

#### GET /api/songs

取得歌曲列表（支援分頁 + 搜尋）

**查詢參數:**
| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `limit` | int | 50 | 每頁數量（1-100） |
| `offset` | int | 0 | 偏移量 |
| `search` | string | — | 搜尋歌名/歌手（ILIKE） |

**回應 (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "歌曲名稱",
      "artist": "歌手名稱",
      "lyrics": ["第一句", "第二句", "第三句"],
      "lrcTimestamps": [12.34, 16.78, 21.00],
      "language": "zh",
      "userId": "uuid",
      "createdAt": "2026-03-13T10:00:00Z",
      "updatedAt": "2026-03-13T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

#### POST /api/songs

**請求:**
```json
{
  "title": "歌曲名稱",
  "artist": "歌手名稱",
  "lyrics": ["第一句", "第二句", "第三句"],
  "lrcTimestamps": [12.34, 16.78],
  "language": "zh"
}
```

**回應 (201):** 單一歌曲物件

#### GET /api/songs/{id}

**回應 (200):** 單一歌曲物件

#### PUT /api/songs/{id}

**請求:**（所有欄位可選，至少一個）
```json
{
  "title": "更新的歌名",
  "lyrics": ["更新的歌詞"]
}
```

**回應 (200):** 更新後的歌曲物件

#### DELETE /api/songs/{id}

**回應 (204):** No Content

---

### LRC 匯入/匯出 — OptionalAuth

#### GET /api/songs/{id}/export

匯出歌曲為 LRC 格式

**回應 (200):** `text/plain`
```
[ti:歌曲名稱]
[ar:歌手名稱]
[00:12.34]第一句
[00:16.78]第二句
```

#### POST /api/songs/{id}/import

匯入 LRC 時間戳到歌曲

**請求:** `Content-Type: text/plain`
```
[00:12.34]第一句
[00:16.78]第二句
```

**回應 (200):** 更新後的歌曲物件

---

### 播放列表 (Playlists) — OptionalAuth

#### GET /api/playlists

**回應 (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "演唱會歌單",
      "description": "",
      "songs": [...],
      "createdAt": "2026-03-13T10:00:00Z"
    }
  ]
}
```

#### POST /api/playlists

**請求:**
```json
{
  "name": "新播放列表",
  "songIds": ["uuid1", "uuid2"]
}
```

---

### 使用者設定 (Settings) — OptionalAuth

#### GET /api/settings

取得使用者顯示設定（不存在時自動建立預設值）

**回應 (200):**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "displaySettings": {
    "displayLines": 4,
    "fontSize": 24,
    "fontFamily": "Inter",
    "theme": "dark",
    "showBackground": true,
    "backgroundColor": "#000000",
    "textColor": "#ffffff",
    "highlightColor": "#00ff88",
    "autoScroll": true,
    "scrollDuration": 300,
    "enableAnimation": true
  }
}
```

#### PUT /api/settings

更新設定（可選欄位）

**請求:**
```json
{
  "displayLines": 6,
  "fontSize": 32
}
```

#### POST /api/settings

重設設定為預設值

---

### 健康檢查

#### GET /api/go-health

**回應 (200):**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

---

## WebSocket API

### 連線

```
開發環境: ws://localhost:8080/ws
生產環境: wss://ly-go-backend-production.up.railway.app/ws
```

前端使用 `NEXT_PUBLIC_GO_WS_URL` 環境變數。

### 訊息格式

```json
{
  "type": "event_name",
  "payload": { ... }
}
```

### 客戶端 → 伺服器 (C2S) 事件

| 事件 | Payload | 說明 |
|------|---------|------|
| `join_session` | `{ sessionId, role, userId? }` | 加入同步 session（role: "controller" / "display"） |
| `leave_session` | — | 離開 session |
| `change_line` | `{ lineIndex }` | 跳至指定歌詞行 |
| `next_line` | — | 下一行 |
| `prev_line` | — | 上一行 |
| `set_song` | `{ songId }` | 設定當前歌曲 |
| `update_settings` | `{ ...displaySettings }` | 更新顯示設定 |
| `set_playing` | `{ isPlaying }` | 播放/暫停 |

### 伺服器 → 客戶端 (S2C) 事件

| 事件 | Payload | 說明 |
|------|---------|------|
| `session_state` | `{ SessionState }` | 完整 session 狀態（加入時回傳） |
| `line_changed` | `{ lineIndex, timestamp }` | 歌詞行變更 |
| `song_changed` | `{ songId, song?, timestamp }` | 歌曲變更 |
| `settings_updated` | `{ settings, timestamp }` | 設定更新 |
| `playing_changed` | `{ isPlaying, timestamp }` | 播放狀態變更 |
| `client_joined` | `{ clientId, role, counts }` | 新客戶端加入 |
| `client_left` | `{ clientId, role, counts }` | 客戶端離開 |
| `error` | `{ message, details? }` | 錯誤訊息 |

### 連線參數

| 參數 | 值 |
|------|------|
| 訊息大小限制 | 32KB |
| 心跳間隔 | 30 秒 (ping/pong) |
| 緩衝大小 | 256 messages |
| 重連策略 | 指數退避（1s, 1.5s, 2.25s, max 5 次） |

### 使用範例

```typescript
// 前端 NativeWSClient 使用
import { NativeWSClient } from '@/lib/websocket/native-client'

const ws = new NativeWSClient(wsUrl)
ws.connect()

// 加入 session
ws.joinSession('abc123', 'controller')

// 監聽事件
ws.on('line_changed', ({ lineIndex }) => {
  console.log('當前行:', lineIndex)
})

// 控制操作
ws.changeLine(5)
ws.nextLine()
ws.setSong('song-uuid')
ws.setPlaying(true)
```

---

## 錯誤回應格式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "請求資料格式錯誤"
  },
  "timestamp": "2026-03-13T10:00:00Z"
}
```

### HTTP 狀態碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 成功 |
| 201 | 建立成功 |
| 204 | 刪除成功（無內容） |
| 400 | 請求格式錯誤 |
| 401 | 未授權（token 無效/過期） |
| 404 | 資源不存在 |
| 429 | 請求過於頻繁（速率限制） |
| 500 | 伺服器內部錯誤 |

---

## 相關文檔

- [系統架構](architecture.md)
- [資料庫設計](database.md)

---

**文件版本:** 2.0
**最後更新:** 2026-03-13

**變更記錄:**
- v2.0 (2026-03-13): 全面改寫 — 對齊 Go 後端 API 實作，移除 Socket.IO / AI endpoints 舊內容
- v1.1 (2026-03-12): 移除 tRPC，改用 REST API
- v1.0 (2026-03-11): 初始版本
