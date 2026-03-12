# API 文檔

## API 概覽

LY 系統使用 **REST API** 作為主要 API 通訊方式，提供簡潔的標準 HTTP 介面。

同時提供 **WebSocket** (Socket.IO) 用於即時通訊與多裝置同步。

---

## Base URL

```
Development: http://localhost:3000/api
Production:  https://your-app.railway.app/api
```

---

## 認證

所有 API 請求需要 Bearer Token：

```http
Authorization: Bearer {jwt_token}
```

---

## REST API 端點

### 歌曲管理 (Songs)

#### GET /api/songs

取得所有歌曲列表

**請求:**
```http
GET /api/songs
Authorization: Bearer {token}
```

**回應:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "歌曲名稱",
      "artist": "歌手名稱",
      "lyrics": ["第一句", "第二句", "第三句"],
      "lrcTimestamps": "[00:12.34]第一句\n[00:16.78]第二句",
      "createdAt": "2026-03-11T10:00:00Z",
      "updatedAt": "2026-03-11T10:00:00Z"
    }
  ]
}
```

---

#### POST /api/songs

新增歌曲

**請求:**
```http
POST /api/songs
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "歌曲名稱",
  "artist": "歌手名稱",
  "lyrics": "第一句\n第二句\n第三句"
}
```

**回應:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "歌曲名稱",
    "artist": "歌手名稱",
    "lyrics": ["第一句", "第二句", "第三句"],
    "createdAt": "2026-03-11T10:00:00Z"
  }
}
```

---

#### GET /api/songs/:id

取得單首歌曲

**請求:**
```http
GET /api/songs/{songId}
Authorization: Bearer {token}
```

**回應:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "歌曲名稱",
    "artist": "歌手名稱",
    "lyrics": ["第一句", "第二句"],
    "lrcTimestamps": "..."
  }
}
```

---

#### PUT /api/songs/:id

更新歌曲

**請求:**
```http
PUT /api/songs/{songId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "更新的歌名",
  "artist": "更新的歌手",
  "lyrics": "更新的歌詞"
}
```

**回應:**
```json
{
  "success": true,
  "data": { /* 更新後的歌曲 */ }
}
```

---

#### DELETE /api/songs/:id

刪除歌曲

**請求:**
```http
DELETE /api/songs/{songId}
Authorization: Bearer {token}
```

**回應:**
```json
{
  "success": true,
  "message": "歌曲已刪除"
}
```

---

### 播放列表 (Playlists)

#### GET /api/playlists

取得所有播放列表

**請求:**
```http
GET /api/playlists
Authorization: Bearer {token}
```

**回應:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "我的播放列表",
      "songs": [
        {
          "songId": "uuid",
          "order": 1,
          "song": { /* 歌曲資料 */ }
        }
      ],
      "createdAt": "2026-03-11T10:00:00Z"
    }
  ]
}
```

---

#### POST /api/playlists

創建播放列表

**請求:**
```http
POST /api/playlists
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "我的播放列表",
  "songIds": ["uuid1", "uuid2"]
}
```

**回應:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "我的播放列表",
    "songs": []
  }
}
```

---

#### PUT /api/playlists/:id

更新播放列表

**請求:**
```http
PUT /api/playlists/{playlistId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "更新名稱",
  "songIds": ["uuid1", "uuid2", "uuid3"]
}
```

---

#### DELETE /api/playlists/:id

刪除播放列表

**請求:**
```http
DELETE /api/playlists/{playlistId}
Authorization: Bearer {token}
```

---

### AI 聽歌辨識 (Phase 3)

#### POST /api/ai/listen

啟動 AI 聽歌辨識

**請求:**
```http
POST /api/ai/listen
Authorization: Bearer {token}
Content-Type: application/json

{
  "songId": "uuid",
  "audioData": "base64_encoded_audio"
}
```

**回應:**
```json
{
  "success": true,
  "data": {
    "matchedLineIndex": 5,
    "confidence": 0.92,
    "transcript": "識別到的歌詞內容"
  }
}
```

---

#### POST /api/ai/start-listening

開始持續監聽模式

**請求:**
```http
POST /api/ai/start-listening
Authorization: Bearer {token}
Content-Type: application/json

{
  "songId": "uuid"
}
```

**回應:**
```json
{
  "success": true,
  "sessionId": "listening_session_uuid"
}
```

---

#### POST /api/ai/stop-listening

停止監聽

**請求:**
```http
POST /api/ai/stop-listening
Authorization: Bearer {token}
Content-Type: application/json

{
  "sessionId": "listening_session_uuid"
}
```

---

## WebSocket API

### 連線

```javascript
const socket = io('wss://your-app.railway.app', {
  auth: {
    token: 'your_jwt_token'
  }
})
```

### 事件 (Events)

#### 客戶端 → 伺服器

| 事件名稱 | 資料 | 說明 |
|---------|------|------|
| `join_session` | `{ sessionId: string }` | 加入同步會話 |
| `next_line` | - | 跳到下一句 |
| `prev_line` | - | 跳到上一句 |
| `set_line` | `{ lineIndex: number }` | 跳到指定行 |
| `set_song` | `{ songId: string }` | 切換歌曲 |
| `update_settings` | `{ settings: object }` | 更新顯示設定 |
| `start_ai_listen` | `{ songId: string }` | 開始 AI 監聽 |
| `stop_ai_listen` | - | 停止 AI 監聽 |

#### 伺服器 → 客戶端

| 事件名稱 | 資料 | 說明 |
|---------|------|------|
| `line_changed` | `{ lineIndex: number, lyrics: string[] }` | 歌詞行變更 |
| `song_changed` | `{ song: Song }` | 歌曲變更 |
| `settings_updated` | `{ settings: object }` | 設定更新 |
| `session_state` | `{ currentSong, currentLine }` | 會話狀態 |
| `ai_match_result` | `{ lineIndex, confidence }` | AI 辨識結果 |
| `error` | `{ message: string }` | 錯誤訊息 |

### 使用範例

```typescript
// 客戶端程式碼
import { io } from 'socket.io-client'

const socket = io({
  auth: { token: await getToken() }
})

// 加入會話
socket.emit('join_session', { sessionId: 'abc123' })

// 監聽歌詞變更
socket.on('line_changed', ({ lineIndex, lyrics }) => {
  console.log('當前行:', lineIndex, lyrics[lineIndex])
})

// 下一句
function nextLine() {
  socket.emit('next_line')
}

// 跳到指定行
function goToLine(index: number) {
  socket.emit('set_line', { lineIndex: index })
}
```

---

## REST API 客戶端使用範例

```typescript
// 前端使用 fetch API
import type { Song } from '@/types'

// 取得歌曲列表
async function getSongs(): Promise<Song[]> {
  const res = await fetch('/api/songs')
  const data = await res.json()
  return data.data
}

// 建立歌曲
async function createSong(song: CreateSongInput): Promise<Song> {
  const res = await fetch('/api/songs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song),
  })
  return await res.json()
}

// 更新歌曲
async function updateSong(id: string, song: UpdateSongInput): Promise<Song> {
  const res = await fetch(`/api/songs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(song),
  })
  return await res.json()
}
```

---

## 錯誤處理

### HTTP 狀態碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 成功 |
| 201 | 建立成功 |
| 400 | 請求格式錯誤 |
| 401 | 未授權 |
| 403 | 無權限 |
| 404 | 資源不存在 |
| 500 | 伺服器錯誤 |

### 錯誤回應格式

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "請求資料格式錯誤",
    "details": {
      "field": "lyrics",
      "issue": "不可為空"
    }
  }
}
```

### 錯誤代碼

| 代碼 | 說明 |
|------|------|
| `VALIDATION_ERROR` | 資料驗證失敗 |
| `UNAUTHORIZED` | 未授權存取 |
| `NOT_FOUND` | 資源不存在 |
| `DUPLICATE` | 資料重複 |
| `AI_ERROR` | AI 服務錯誤 |
| `WEBSOCKET_ERROR` | WebSocket 連線錯誤 |

---

## 速率限制

| 端點類型 | 限制 |
|---------|------|
| 一般 API | 100 請求/分鐘 |
| WebSocket 訊息 | 60 訊息/分鐘 |
| AI API | 10 請求/分鐘 |

---

## 相關文檔

- [系統架構](architecture.md)
- [資料庫設計](database.md)
- [需求文檔](../requirements.md)

---

**文件版本:** 1.1
**最後更新:** 2026-03-12

**變更記錄:**
- v1.1 (2026-03-12): 更新 API 文檔 - 移除 tRPC，改用 REST API
- v1.0 (2026-03-11): 初始版本
