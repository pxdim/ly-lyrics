# LY API 文檔

## API 概覽

LY 系統的所有 API 由 **Go 後端** (port 8080) 提供。前端透過 Next.js rewrites 將 `/api/*` 請求代理到 Go 後端。

WebSocket 由前端直連 Go 後端的 `/ws` 端點。

---

## Base URL

```
開發環境: http://localhost:8080/api    (前端透過 Next.js proxy: http://localhost:3000/api)
生產環境: https://ly-go-backend-production.up.railway.app/api
```

---

## 認證

### Token 傳遞方式

所有認證 token 透過 **HttpOnly cookie** 傳遞，前端 JavaScript 無法存取 token 明文。

- `access_token` cookie -- Path: `/`, MaxAge: 24 小時, HttpOnly, SameSite=Strict
- `refresh_token` cookie -- Path: `/api/auth/refresh`, MaxAge: 30 天, HttpOnly, SameSite=Strict

> 注意：開發環境 (`ENVIRONMENT=development`) 不啟用 `Secure` 旗標，生產環境強制啟用。

### 認證模式

| 模式 | 行為 |
|------|------|
| `RequireAuth` | 必須提供有效 cookie，否則回傳 401 |
| `OptionalAuth` | 有 cookie 則驗證並取得使用者身份，無 cookie 則使用 Demo User (ID: `00000000-0000-0000-0000-000000000001`) |

### RequireAuth 端點

- `GET /api/auth/me`
- `GET /api/stt/token`
- `GET /api/stt/stream`

### OptionalAuth 端點

- 所有 Songs、Playlists、Settings、LRC、Lyrics Search 端點

---

## 統一錯誤回應格式

所有錯誤回應使用以下格式：

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "人類可讀的錯誤訊息",
    "details": {}
  },
  "timestamp": 1710316800000
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `error.code` | `string` | 機器可讀的錯誤代碼 |
| `error.message` | `string` | 人類可讀的錯誤訊息 |
| `error.details` | `object?` | 可選的附加錯誤資訊 |
| `timestamp` | `number` | Unix 毫秒時間戳 |

### HTTP 狀態碼

| 狀態碼 | 說明 |
|--------|------|
| 200 | 成功 |
| 201 | 建立成功 |
| 400 | 請求格式錯誤 / 驗證失敗 |
| 401 | 未授權 (token 無效、過期或已撤銷) |
| 403 | 無權限操作此資源 |
| 404 | 資源不存在 |
| 409 | 衝突 (如 email 已註冊) |
| 429 | 請求過於頻繁 (速率限制) |
| 500 | 伺服器內部錯誤 |
| 503 | 服務不可用 (STT 未設定) |

### 錯誤代碼一覽

| 錯誤代碼 | HTTP 狀態碼 | 說明 |
|----------|------------|------|
| `VALIDATION_ERROR` | 400 | JSON 格式錯誤或欄位驗證失敗 |
| `AUTH_INVALID_CREDENTIALS` | 401 | 登入時 email 或密碼錯誤 |
| `AUTH_UNAUTHORIZED` | 401 | 未認證或使用者不存在 |
| `AUTH_TOKEN_EXPIRED` | 401 | Refresh token 缺失、無效或過期 |
| `AUTH_TOKEN_REVOKED` | 401 | Refresh token 已被撤銷 |
| `AUTH_EMAIL_EXISTS` | 409 | 註冊時 email 已被使用 |
| `SONG_INVALID_FORMAT` | 400 | 歌曲 ID 格式無效 |
| `SONG_NOT_FOUND` | 404 | 歌曲不存在 |
| `SONG_FORBIDDEN` | 403 | 無權限操作此歌曲 |
| `PLAYLIST_INVALID_FORMAT` | 400 | 播放清單 ID 格式無效或 JSON 格式錯誤 |
| `PLAYLIST_NOT_FOUND` | 404 | 播放清單不存在 |
| `PLAYLIST_FORBIDDEN` | 403 | 無權限操作此播放清單 |
| `LRC_INVALID_FORMAT` | 400 | LRC 匯入內容格式錯誤 |
| `LYRICS_NOT_FOUND` | 404 | 歌詞不存在 |
| `STT_NOT_CONFIGURED` | 503 | STT API key 未設定 |
| `SYS_INTERNAL_ERROR` | 500 | 伺服器內部錯誤 |

---

## REST API 端點

### 健康檢查

#### GET /api/go-health

檢查服務與資料庫連線狀態。不需認證。

**回應 (200 -- 正常)：**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-03-19T10:00:00Z",
  "service": "ly-go-backend"
}
```

**回應 (503 -- 服務降級)：**
```json
{
  "status": "degraded",
  "database": "disconnected",
  "timestamp": "2026-03-19T10:00:00Z",
  "service": "ly-go-backend"
}
```

---

### 認證 (Auth)

速率限制：由 `authLimiter` 中介軟體保護。

#### POST /api/auth/register

註冊新使用者。成功後透過 Set-Cookie 回傳 access/refresh token。

**Auth：** 無

**Request Body：**
```json
{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "使用者名稱"
}
```

| 欄位 | 型別 | 必填 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| `email` | `string` | 是 | 有效 email 格式 | 使用者 email |
| `password` | `string` | 是 | 最少 6 字元 | 密碼 |
| `name` | `string?` | 否 | 最多 100 字元 | 使用者名稱 |

**Response Headers：**
```
Set-Cookie: access_token=eyJ...; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict
Set-Cookie: refresh_token=eyJ...; Path=/api/auth/refresh; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict
```

**回應 (201)：**
```json
{
  "expiresAt": "2026-03-20T10:00:00Z",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "使用者名稱",
    "emailVerified": false,
    "createdAt": "2026-03-19T10:00:00Z",
    "updatedAt": "2026-03-19T10:00:00Z"
  }
}
```

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `VALIDATION_ERROR` | JSON 格式錯誤或欄位驗證失敗 |
| 409 | `AUTH_EMAIL_EXISTS` | Email 已被註冊 |
| 500 | `SYS_INTERNAL_ERROR` | 伺服器錯誤 |

---

#### POST /api/auth/login

使用者登入。成功後透過 Set-Cookie 回傳 access/refresh token。

**Auth：** 無

**Request Body：**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

| 欄位 | 型別 | 必填 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| `email` | `string` | 是 | 有效 email 格式 | 使用者 email |
| `password` | `string` | 是 | 最少 6 字元 | 密碼 |

**Response Headers：**
```
Set-Cookie: access_token=eyJ...; Path=/; Max-Age=86400; HttpOnly; Secure; SameSite=Strict
Set-Cookie: refresh_token=eyJ...; Path=/api/auth/refresh; Max-Age=2592000; HttpOnly; Secure; SameSite=Strict
```

**回應 (200)：**
```json
{
  "expiresAt": "2026-03-20T10:00:00Z",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "使用者名稱",
    "emailVerified": false,
    "createdAt": "2026-03-19T10:00:00Z",
    "updatedAt": "2026-03-19T10:00:00Z"
  }
}
```

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `VALIDATION_ERROR` | JSON 格式錯誤或欄位驗證失敗 |
| 401 | `AUTH_INVALID_CREDENTIALS` | Email 或密碼錯誤 |
| 500 | `SYS_INTERNAL_ERROR` | 伺服器錯誤 |

---

#### POST /api/auth/refresh

更新 access token。refresh token 從 HttpOnly cookie 讀取，實作 token 輪換 (rotation) 與舊 token 撤銷。

**Auth：** 無 (透過 cookie 自動攜帶 refresh_token)

**Request Body：** 無 (refresh token 從 cookie 讀取)

**Response Headers：**
```
Set-Cookie: access_token=eyJ...; (新 access token)
Set-Cookie: refresh_token=eyJ...; (新 refresh token，舊 token 同時被撤銷)
```

**回應 (200)：**
```json
{
  "expiresAt": "2026-03-20T10:00:00Z",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "使用者名稱",
    "emailVerified": false,
    "createdAt": "2026-03-19T10:00:00Z",
    "updatedAt": "2026-03-19T10:00:00Z"
  }
}
```

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 401 | `AUTH_TOKEN_EXPIRED` | Refresh token 缺失、無效或過期 |
| 401 | `AUTH_TOKEN_REVOKED` | Refresh token 已被撤銷 (防重放攻擊) |
| 401 | `AUTH_UNAUTHORIZED` | 使用者不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 伺服器錯誤 |

---

#### GET /api/auth/me

取得目前已認證使用者的資訊。

**Auth：** RequireAuth

**回應 (200)：**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "name": "使用者名稱",
    "emailVerified": false,
    "createdAt": "2026-03-19T10:00:00Z",
    "updatedAt": "2026-03-19T10:00:00Z"
  }
}
```

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 401 | `AUTH_UNAUTHORIZED` | 未認證或使用者不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 伺服器錯誤 |

---

### 歌曲管理 (Songs)

#### GET /api/songs

取得歌曲列表，支援分頁與關鍵字搜尋。

**Auth：** OptionalAuth

**Query Parameters：**

| 參數 | 型別 | 預設 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| `limit` | `int` | `20` | 1-100 | 每頁數量 |
| `offset` | `int` | `0` | >= 0 | 偏移量 |
| `search` | `string` | -- | -- | 搜尋歌名/歌手 (ILIKE) |
| `userId` | `string` | -- | UUID 格式 | 篩選特定使用者的歌曲 |

> 若未提供 `userId`，且使用者已認證，自動使用該認證使用者的 ID 篩選。

**回應 (200)：**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "奇異恩典",
      "artist": "John Newton",
      "lyrics": ["奇異恩典 何等甘甜", "我曾迷失 今被尋回"],
      "lrcTimestamps": [0, 5200],
      "language": "zh",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "createdAt": "2026-03-19T10:00:00Z",
      "updatedAt": "2026-03-19T10:00:00Z"
    }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

**Song 物件欄位：**

| 欄位 | 型別 | Nullable | 說明 |
|------|------|----------|------|
| `id` | `string (UUID)` | 否 | 歌曲 ID |
| `title` | `string` | 否 | 歌名 |
| `artist` | `string?` | 是 | 歌手名稱 |
| `lyrics` | `string[]` | 否 | 歌詞行陣列 |
| `lrcTimestamps` | `number[]?` | 是 | LRC 時間戳 (毫秒)，與 lyrics 陣列一一對應 |
| `language` | `string?` | 是 | 語言代碼 (2 字元，如 `zh`, `en`) |
| `userId` | `string (UUID)` | 否 | 建立者 ID |
| `createdAt` | `string (ISO 8601)` | 否 | 建立時間 |
| `updatedAt` | `string (ISO 8601)` | 否 | 最後更新時間 |

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 500 | `SYS_INTERNAL_ERROR` | 查詢失敗 |

---

#### POST /api/songs

建立新歌曲。

**Auth：** OptionalAuth

**Request Body：**
```json
{
  "title": "奇異恩典",
  "artist": "John Newton",
  "lyrics": ["奇異恩典 何等甘甜", "我曾迷失 今被尋回"],
  "lrcTimestamps": [0, 5200],
  "language": "zh"
}
```

| 欄位 | 型別 | 必填 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| `title` | `string` | 是 | 最多 255 字元 | 歌名 |
| `artist` | `string?` | 否 | 最多 255 字元 | 歌手名稱 |
| `lyrics` | `string[]` | 是 | 至少 1 項 | 歌詞行陣列 |
| `lrcTimestamps` | `number[]?` | 否 | -- | LRC 時間戳 (毫秒) |
| `language` | `string?` | 否 | 恰好 2 字元 | 語言代碼 |

**回應 (201)：** Song 物件

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `VALIDATION_ERROR` | JSON 格式錯誤或欄位驗證失敗 |
| 500 | `SYS_INTERNAL_ERROR` | 建立失敗 |

---

#### GET /api/songs/{id}

取得單一歌曲。

**Auth：** OptionalAuth

**Path Parameters：**

| 參數 | 型別 | 說明 |
|------|------|------|
| `id` | `string (UUID)` | 歌曲 ID |

**回應 (200)：** Song 物件

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `SONG_INVALID_FORMAT` | ID 格式不是有效 UUID |
| 404 | `SONG_NOT_FOUND` | 歌曲不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 查詢失敗 |

---

#### PUT /api/songs/{id}

更新歌曲。僅歌曲建立者可操作 (所有權檢查)。

**Auth：** OptionalAuth

**Path Parameters：**

| 參數 | 型別 | 說明 |
|------|------|------|
| `id` | `string (UUID)` | 歌曲 ID |

**Request Body：** (所有欄位皆為可選，至少提供一個)
```json
{
  "title": "更新的歌名",
  "artist": "更新的歌手",
  "lyrics": ["更新的第一句", "更新的第二句"],
  "lrcTimestamps": [0, 3500],
  "language": "en"
}
```

| 欄位 | 型別 | 必填 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| `title` | `string?` | 否 | 1-255 字元 | 歌名 |
| `artist` | `string?` | 否 | 最多 255 字元 | 歌手名稱 |
| `lyrics` | `string[]?` | 否 | 至少 1 項 | 歌詞行陣列 |
| `lrcTimestamps` | `number[]?` | 否 | -- | LRC 時間戳 (毫秒) |
| `language` | `string?` | 否 | 恰好 2 字元 | 語言代碼 |

**回應 (200)：** 更新後的 Song 物件

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `SONG_INVALID_FORMAT` | ID 格式不是有效 UUID |
| 400 | `VALIDATION_ERROR` | JSON 格式錯誤或欄位驗證失敗 |
| 403 | `SONG_FORBIDDEN` | 無權限更新此歌曲 |
| 404 | `SONG_NOT_FOUND` | 歌曲不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 更新失敗 |

---

#### DELETE /api/songs/{id}

刪除歌曲。僅歌曲建立者可操作 (所有權檢查)。

**Auth：** OptionalAuth

**Path Parameters：**

| 參數 | 型別 | 說明 |
|------|------|------|
| `id` | `string (UUID)` | 歌曲 ID |

**回應 (200)：**
```json
{
  "success": true,
  "deletedSong": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "奇異恩典",
    "artist": "John Newton",
    "lyrics": ["奇異恩典 何等甘甜", "我曾迷失 今被尋回"],
    "lrcTimestamps": [0, 5200],
    "language": "zh",
    "userId": "550e8400-e29b-41d4-a716-446655440001",
    "createdAt": "2026-03-19T10:00:00Z",
    "updatedAt": "2026-03-19T10:00:00Z"
  }
}
```

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `SONG_INVALID_FORMAT` | ID 格式不是有效 UUID |
| 403 | `SONG_FORBIDDEN` | 無權限刪除此歌曲 |
| 404 | `SONG_NOT_FOUND` | 歌曲不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 刪除失敗 |

---

### LRC 匯入/匯出

#### GET /api/songs/{id}/export

將歌曲匯出為 LRC 格式檔案下載。

**Auth：** OptionalAuth

**Path Parameters：**

| 參數 | 型別 | 說明 |
|------|------|------|
| `id` | `string (UUID)` | 歌曲 ID |

**Response Headers：**
```
Content-Type: text/plain; charset=utf-8
Content-Disposition: attachment; filename="歌曲名稱.lrc"
```

**回應 (200)：** `text/plain`
```
[ti:奇異恩典]
[ar:John Newton]
[00:00.00]奇異恩典 何等甘甜
[00:05.20]我曾迷失 今被尋回
```

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `SONG_INVALID_FORMAT` | ID 格式不是有效 UUID |
| 404 | `SONG_NOT_FOUND` | 歌曲不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 查詢失敗 |

---

#### POST /api/songs/{id}/import

匯入 LRC 內容到指定歌曲。解析 LRC 格式後更新歌詞文字與時間戳。若 LRC 元資料包含標題或歌手，一併更新。

**Auth：** OptionalAuth

**Path Parameters：**

| 參數 | 型別 | 說明 |
|------|------|------|
| `id` | `string (UUID)` | 歌曲 ID |

**Request Body：** `Content-Type: application/json`
```json
{
  "lrcContent": "[ti:奇異恩典]\n[ar:John Newton]\n[00:00.00]奇異恩典 何等甘甜\n[00:05.20]我曾迷失 今被尋回"
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `lrcContent` | `string` | 是 | LRC 格式字串 (不得為空白) |

**回應 (200)：** 更新後的 Song 物件

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `SONG_INVALID_FORMAT` | ID 格式不是有效 UUID |
| 400 | `LRC_INVALID_FORMAT` | JSON 格式錯誤或 lrcContent 為空 |
| 403 | `SONG_FORBIDDEN` | 無權限更新此歌曲 |
| 404 | `SONG_NOT_FOUND` | 歌曲不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 更新失敗 |

---

### 播放清單 (Playlists)

#### GET /api/playlists

取得播放清單列表，支援分頁。

**Auth：** OptionalAuth

**Query Parameters：**

| 參數 | 型別 | 預設 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| `limit` | `int` | `20` | 1-100 | 每頁數量 |
| `offset` | `int` | `0` | >= 0 | 偏移量 |
| `userId` | `string` | -- | UUID 格式 | 篩選特定使用者的播放清單 |

> 若未提供 `userId`，且使用者已認證，自動使用該認證使用者的 ID 篩選。

**回應 (200)：**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "主日敬拜歌單",
      "songIds": [
        "550e8400-e29b-41d4-a716-446655440010",
        "550e8400-e29b-41d4-a716-446655440011"
      ],
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "createdAt": "2026-03-19T10:00:00Z",
      "updatedAt": "2026-03-19T10:00:00Z"
    }
  ],
  "total": 5,
  "limit": 20,
  "offset": 0
}
```

**Playlist 物件欄位：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | `string (UUID)` | 播放清單 ID |
| `name` | `string` | 播放清單名稱 |
| `songIds` | `string[] (UUID[])` | 歌曲 ID 陣列 (已排序) |
| `userId` | `string (UUID)` | 建立者 ID |
| `createdAt` | `string (ISO 8601)` | 建立時間 |
| `updatedAt` | `string (ISO 8601)` | 最後更新時間 |

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 500 | `SYS_INTERNAL_ERROR` | 查詢失敗 |

---

#### POST /api/playlists

建立播放清單。

**Auth：** OptionalAuth

**Request Body：**
```json
{
  "name": "主日敬拜歌單",
  "songIds": [
    "550e8400-e29b-41d4-a716-446655440010",
    "550e8400-e29b-41d4-a716-446655440011"
  ]
}
```

| 欄位 | 型別 | 必填 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| `name` | `string` | 是 | 最多 255 字元 | 播放清單名稱 |
| `songIds` | `string[] (UUID[])` | 是 | 至少 1 項 | 歌曲 ID 陣列 |

**回應 (201)：** Playlist 物件

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `PLAYLIST_INVALID_FORMAT` | JSON 格式錯誤、name 為空、或 songIds 為空 |
| 500 | `SYS_INTERNAL_ERROR` | 建立失敗 |

---

#### PUT /api/playlists/{id}

更新播放清單。僅播放清單建立者可操作 (所有權檢查)。

**Auth：** OptionalAuth

**Path Parameters：**

| 參數 | 型別 | 說明 |
|------|------|------|
| `id` | `string (UUID)` | 播放清單 ID |

**Request Body：** (至少提供 `name` 或 `songIds` 其中一個)
```json
{
  "name": "更新的歌單名稱",
  "songIds": [
    "550e8400-e29b-41d4-a716-446655440010",
    "550e8400-e29b-41d4-a716-446655440012"
  ]
}
```

| 欄位 | 型別 | 必填 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| `name` | `string?` | 否 | 1-255 字元 | 播放清單名稱 |
| `songIds` | `string[]? (UUID[])` | 否 | -- | 歌曲 ID 陣列 |

**回應 (200)：** 更新後的 Playlist 物件

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `PLAYLIST_INVALID_FORMAT` | ID 格式無效、JSON 錯誤、或未提供任何更新欄位 |
| 403 | `PLAYLIST_FORBIDDEN` | 無權限更新此播放清單 |
| 404 | `PLAYLIST_NOT_FOUND` | 播放清單不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 更新失敗 |

---

#### DELETE /api/playlists/{id}

刪除播放清單。僅播放清單建立者可操作 (所有權檢查)。

**Auth：** OptionalAuth

**Path Parameters：**

| 參數 | 型別 | 說明 |
|------|------|------|
| `id` | `string (UUID)` | 播放清單 ID |

**回應 (200)：**
```json
{
  "success": true
}
```

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `PLAYLIST_INVALID_FORMAT` | ID 格式不是有效 UUID |
| 403 | `PLAYLIST_FORBIDDEN` | 無權限刪除此播放清單 |
| 404 | `PLAYLIST_NOT_FOUND` | 播放清單不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 刪除失敗 |

---

### 使用者設定 (Settings)

#### GET /api/settings

取得使用者的顯示設定。若使用者尚無設定記錄，自動建立預設值。

**Auth：** OptionalAuth

**回應 (200)：**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "displaySettings": {
    "displayLines": 4,
    "fontSize": 24,
    "fontFamily": "Inter",
    "lineSpacing": 0.5,
    "theme": "dark",
    "showBackground": true,
    "backgroundColor": "#000000",
    "textColor": "#ffffff",
    "highlightColor": "#0ea5e9",
    "autoScroll": true,
    "scrollDuration": 300,
    "enableAnimation": true
  },
  "createdAt": "2026-03-19T10:00:00Z",
  "updatedAt": "2026-03-19T10:00:00Z"
}
```

**Settings 物件欄位：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | `string (UUID)` | 設定記錄 ID |
| `userId` | `string (UUID)` | 使用者 ID |
| `displaySettings` | `DisplaySettings` | 顯示設定物件 |
| `createdAt` | `string (ISO 8601)` | 建立時間 |
| `updatedAt` | `string (ISO 8601)` | 最後更新時間 |

**DisplaySettings 欄位：**

| 欄位 | 型別 | 預設值 | 驗證規則 | 說明 |
|------|------|--------|---------|------|
| `displayLines` | `int` | `4` | 1-10 | 同時顯示的歌詞行數 |
| `fontSize` | `int` | `24` | 12-72 | 字體大小 (px) |
| `fontFamily` | `string` | `"Inter"` | -- | 字體家族 |
| `lineSpacing` | `number` | `0.5` | 0-2 | 行距 |
| `theme` | `string` | `"dark"` | `light` / `dark` / `transparent` | 主題 |
| `showBackground` | `bool` | `true` | -- | 是否顯示背景 |
| `backgroundColor` | `string?` | `"#000000"` | Hex 色碼 | 背景色 |
| `textColor` | `string?` | `"#ffffff"` | Hex 色碼 | 文字色 |
| `highlightColor` | `string?` | `"#0ea5e9"` | Hex 色碼 | 高亮色 |
| `autoScroll` | `bool` | `true` | -- | 自動捲動 |
| `scrollDuration` | `int` | `300` | 100-1000 | 捲動動畫時長 (ms) |
| `enableAnimation` | `bool` | `true` | -- | 啟用動畫效果 |

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 500 | `SYS_INTERNAL_ERROR` | 查詢失敗 |

---

#### PUT /api/settings

更新顯示設定。僅更新提供的欄位 (partial update)。

**Auth：** OptionalAuth

**Request Body：**
```json
{
  "displaySettings": {
    "displayLines": 6,
    "fontSize": 32,
    "theme": "transparent"
  }
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `displaySettings` | `UpdateDisplaySettings?` | 否 | 要更新的顯示設定 (所有子欄位皆為可選) |

> `UpdateDisplaySettings` 中每個欄位都是可選的，僅提供想更新的欄位即可。驗證規則同上方 DisplaySettings 表格。

**回應 (200)：** 完整的 Settings 物件 (包含所有欄位，非僅更新的部分)

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `VALIDATION_ERROR` | JSON 格式錯誤或欄位驗證失敗 |
| 500 | `SYS_INTERNAL_ERROR` | 更新失敗 |

---

#### POST /api/settings

重設所有顯示設定為預設值。

**Auth：** OptionalAuth

**Request Body：** 無

**回應 (200)：** 重設後的 Settings 物件 (所有欄位回到預設值)

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 500 | `SYS_INTERNAL_ERROR` | 重設失敗 |

---

### 語音辨識 (STT)

#### GET /api/stt/token

取得 Deepgram API key，供前端建立直連 WebSocket 進行語音辨識。

**Auth：** RequireAuth

**回應 (200)：**
```json
{
  "token": "your-deepgram-api-key",
  "provider": "deepgram"
}
```

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 401 | -- | 未認證 |
| 503 | `STT_NOT_CONFIGURED` | Deepgram API key 未設定 |

---

#### GET /api/stt/stream (WebSocket)

Google Cloud Speech-to-Text 串流代理。前端透過 WebSocket 發送音訊，後端緩衝後定期呼叫 Google STT REST API，將辨識結果回傳。

**Auth：** RequireAuth

**連線方式：** WebSocket upgrade

**Query Parameters：**

| 參數 | 型別 | 預設 | 說明 |
|------|------|------|------|
| `sampleRate` | `int` | `48000` | 音訊取樣率 (Hz) |
| `language` | `string` | `zh-TW` | 主要語言代碼 |

> 支援的語言：`zh-TW`, `zh-CN`, `en-US`, `ja-JP`, `ko-KR`, `th-TH`。系統會自動將其他語言設為候選語言，實現多語言偵測。

**C2S (Client-to-Server)：**

- 訊息類型：Binary (WebSocket binary message)
- 音訊格式：Int16 PCM (LINEAR16), mono
- 最大緩衝區：10MB (超過自動清空)

**S2C (Server-to-Client)：**

每 2 秒處理一次緩衝音訊 (需至少 0.5 秒的音訊量)，回傳 JSON text message：

```json
{
  "transcript": "辨識出的文字",
  "confidence": 0.95,
  "isFinal": true
}
```

**錯誤回應 (HTTP，非 WebSocket)：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 401 | -- | 未認證 |
| 503 | `STT_NOT_CONFIGURED` | Google STT API key 未設定 |

---

### 歌詞搜尋 (Lyrics Search)

#### POST /api/lyrics/search

從外部來源搜尋歌詞。

**Auth：** OptionalAuth

**Request Body：**
```json
{
  "query": "奇異恩典",
  "searchType": "title",
  "artist": "John Newton"
}
```

| 欄位 | 型別 | 必填 | 驗證規則 | 說明 |
|------|------|------|---------|------|
| `query` | `string` | 是 | 1-200 字元 | 搜尋關鍵字 |
| `searchType` | `string` | 是 | `title` / `artist` / `lyrics` | 搜尋類型 |
| `artist` | `string?` | 否 | 最多 200 字元 | 歌手名稱 (輔助搜尋) |

**回應 (200)：**
```json
{
  "results": [
    {
      "id": "lrclib-12345",
      "title": "奇異恩典",
      "artist": "John Newton",
      "album": "Hymns",
      "source": "lrclib",
      "confidence": "high",
      "hasSyncedLyrics": true,
      "hasPlainLyrics": true,
      "duration": 240,
      "ratio": 0.95,
      "coverUrl": "https://example.com/cover.jpg",
      "isSimplified": false,
      "isAiGenerated": false
    }
  ],
  "sources": {
    "lrclib": {
      "status": "ok",
      "count": 3,
      "latencyMs": 150
    }
  },
  "totalResults": 3
}
```

**搜尋結果欄位：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | `string` | 歌詞來源 ID |
| `title` | `string` | 歌名 |
| `artist` | `string` | 歌手 |
| `album` | `string?` | 專輯名稱 |
| `source` | `string` | 來源名稱 |
| `confidence` | `string` | 匹配信心度 |
| `hasSyncedLyrics` | `bool` | 是否有時間同步歌詞 |
| `hasPlainLyrics` | `bool` | 是否有純文字歌詞 |
| `duration` | `int?` | 歌曲時長 (秒) |
| `ratio` | `number?` | 匹配比率 |
| `coverUrl` | `string?` | 封面圖片 URL |
| `isSimplified` | `bool` | 是否為簡體中文 |
| `isAiGenerated` | `bool` | 是否為 AI 生成 |

**來源狀態欄位：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `status` | `string` | `ok` / `error` / `timeout` / `skipped` |
| `count` | `int` | 該來源的結果數 |
| `latencyMs` | `number` | 回應延遲 (毫秒) |

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `VALIDATION_ERROR` | JSON 格式錯誤或欄位驗證失敗 |
| 500 | `SYS_INTERNAL_ERROR` | 搜尋失敗 |

---

#### GET /api/lyrics/search/{id}

取得完整歌詞內容。

**Auth：** OptionalAuth

**Path Parameters：**

| 參數 | 型別 | 說明 |
|------|------|------|
| `id` | `string` | 歌詞來源 ID (從搜尋結果取得) |

**回應 (200)：**
```json
{
  "id": "lrclib-12345",
  "title": "奇異恩典",
  "artist": "John Newton",
  "album": "Hymns",
  "source": "lrclib",
  "syncedLyrics": "[00:00.00]奇異恩典 何等甘甜\n[00:05.20]我曾迷失 今被尋回",
  "plainLyrics": "奇異恩典 何等甘甜\n我曾迷失 今被尋回",
  "sourceUrl": "https://lrclib.net/api/get/12345",
  "isSimplified": false
}
```

**歌詞詳情欄位：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | `string` | 歌詞來源 ID |
| `title` | `string` | 歌名 |
| `artist` | `string` | 歌手 |
| `album` | `string?` | 專輯名稱 |
| `source` | `string` | 來源名稱 |
| `syncedLyrics` | `string?` | LRC 格式的時間同步歌詞 |
| `plainLyrics` | `string?` | 純文字歌詞 |
| `sourceUrl` | `string?` | 原始來源 URL |
| `isSimplified` | `bool` | 是否為簡體中文 |

**錯誤回應：**

| 狀態碼 | 錯誤代碼 | 情境 |
|--------|---------|------|
| 400 | `VALIDATION_ERROR` | id 為空 |
| 404 | `LYRICS_NOT_FOUND` | 歌詞不存在 |
| 500 | `SYS_INTERNAL_ERROR` | 查詢失敗 |

---

## WebSocket API

### 連線

```
開發環境: ws://localhost:8080/ws
生產環境: wss://ly-go-backend-production.up.railway.app/ws
```

前端使用 `NEXT_PUBLIC_GO_WS_URL` 環境變數設定。

**連線參數：**

| 參數 | 值 |
|------|------|
| 訊息大小限制 | 32KB (32768 bytes) |
| 心跳間隔 | 30 秒 (ping/pong) |
| 寫入逾時 | 10 秒 |
| 發送緩衝區 | 256 messages |
| Session TTL | 1 小時 (Redis) |
| 重連策略 | 指數退避 (1s, 1.5s, 2.25s, 最多 5 次) |

**CORS 設定：**
- 開發模式：跳過 origin 驗證
- 生產模式：僅允許 `lys.pxdim.com`, `*.up.railway.app`, `localhost:*`

### 訊息格式

所有 WebSocket 訊息使用 JSON text message：

```json
{
  "type": "event_name",
  "payload": { ... }
}
```

---

### C2S (Client-to-Server) 事件

#### join_session

加入同步 session。加入後會收到完整的 `session_state`，同 session 的其他客戶端會收到 `client_joined`。

```json
{
  "type": "join_session",
  "payload": {
    "sessionId": "abc123",
    "role": "controller",
    "userId": "550e8400-e29b-41d4-a716-446655440001"
  }
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `sessionId` | `string` | 是 | Session 識別碼 |
| `role` | `string` | 是 | `controller` / `display` / `admin` |
| `userId` | `string?` | 否 | 使用者 ID |

---

#### leave_session

主動離開目前 session。同 session 的其他客戶端會收到 `client_left`。若 session 無剩餘客戶端，自動清理 Redis 資料。

```json
{
  "type": "leave_session"
}
```

不需 payload。

---

#### change_line

跳至指定歌詞行。

**權限：** 僅 `controller` 角色

```json
{
  "type": "change_line",
  "payload": {
    "lineIndex": 5
  }
}
```

| 欄位 | 型別 | 驗證規則 | 說明 |
|------|------|---------|------|
| `lineIndex` | `int` | >= 0, 不超出歌詞行數 | 目標行索引 |

---

#### next_line

前進到下一行歌詞。若已在最後一行則不動作。

**權限：** 僅 `controller` 角色

```json
{
  "type": "next_line"
}
```

不需 payload。

---

#### prev_line

回到上一行歌詞。若已在第一行則不動作。

**權限：** 僅 `controller` 角色

```json
{
  "type": "prev_line"
}
```

不需 payload。

---

#### set_song

設定目前歌曲。會從資料庫取得歌曲完整資料，並重設行索引為 0。

**權限：** 僅 `controller` 角色

```json
{
  "type": "set_song",
  "payload": {
    "songId": "550e8400-e29b-41d4-a716-446655440010"
  }
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `songId` | `string (UUID)` | 是 | 歌曲 ID |

---

#### update_settings

更新顯示設定。僅更新提供的欄位 (partial update)。

**權限：** 僅 `controller` 角色

```json
{
  "type": "update_settings",
  "payload": {
    "displayLines": 6,
    "fontSize": 32,
    "theme": "transparent"
  }
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `displayLines` | `int?` | 否 | 同時顯示行數 |
| `fontSize` | `int?` | 否 | 字體大小 |
| `fontFamily` | `string?` | 否 | 字體家族 |
| `lineSpacing` | `number?` | 否 | 行距 |
| `theme` | `string?` | 否 | 主題 |
| `showBackground` | `bool?` | 否 | 顯示背景 |
| `backgroundColor` | `string?` | 否 | 背景色 (Hex) |
| `textColor` | `string?` | 否 | 文字色 (Hex) |
| `highlightColor` | `string?` | 否 | 高亮色 (Hex) |
| `autoScroll` | `bool?` | 否 | 自動捲動 |
| `scrollDuration` | `int?` | 否 | 捲動動畫時長 (ms) |
| `enableAnimation` | `bool?` | 否 | 啟用動畫 |

---

#### set_playing

設定播放/暫停狀態。

**權限：** 僅 `controller` 角色

```json
{
  "type": "set_playing",
  "payload": {
    "isPlaying": true
  }
}
```

| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `isPlaying` | `bool` | 是 | 播放狀態 |

---

### S2C (Server-to-Client) 事件

#### session_state

完整 session 狀態。在 `join_session` 後回傳給加入的客戶端。

```json
{
  "type": "session_state",
  "payload": {
    "sessionId": "abc123",
    "currentSong": {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "title": "奇異恩典",
      "artist": "John Newton",
      "lyrics": ["奇異恩典 何等甘甜", "我曾迷失 今被尋回"],
      "lrcTimestamps": [0, 5200],
      "language": "zh",
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "createdAt": "2026-03-19T10:00:00.000Z",
      "updatedAt": "2026-03-19T10:00:00.000Z"
    },
    "currentLineIndex": 0,
    "isPlaying": false,
    "settings": {
      "displayLines": 4,
      "fontSize": 24,
      "fontFamily": "Inter",
      "lineSpacing": 0.5,
      "theme": "dark",
      "showBackground": true,
      "backgroundColor": "#000000",
      "textColor": "#ffffff",
      "highlightColor": "#0ea5e9",
      "autoScroll": true,
      "scrollDuration": 300,
      "enableAnimation": true
    },
    "controllerCount": 1,
    "displayCount": 2,
    "createdAt": 1710316800000,
    "updatedAt": 1710316800000
  }
}
```

**SessionState 欄位：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `sessionId` | `string` | Session 識別碼 |
| `currentSong` | `SessionSong?` | 目前歌曲 (可為 null) |
| `currentLineIndex` | `int` | 目前行索引 |
| `isPlaying` | `bool` | 播放狀態 |
| `settings` | `SessionSettings` | 顯示設定 |
| `controllerCount` | `int` | 已連線的 controller 數 |
| `displayCount` | `int` | 已連線的 display 數 |
| `createdAt` | `number` | 建立時間 (Unix 毫秒) |
| `updatedAt` | `number` | 更新時間 (Unix 毫秒) |

---

#### line_changed

歌詞行變更。當 controller 執行 `change_line` / `next_line` / `prev_line` 時廣播。

```json
{
  "type": "line_changed",
  "payload": {
    "lineIndex": 5,
    "timestamp": 1710316800000
  }
}
```

---

#### song_changed

歌曲變更。當 controller 執行 `set_song` 時廣播。

```json
{
  "type": "song_changed",
  "payload": {
    "songId": "550e8400-e29b-41d4-a716-446655440010",
    "song": { ... },
    "timestamp": 1710316800000
  }
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `songId` | `string` | 歌曲 ID |
| `song` | `SessionSong?` | 完整歌曲資料 |
| `timestamp` | `number` | 事件時間 (Unix 毫秒) |

---

#### settings_updated

顯示設定變更。當 controller 執行 `update_settings` 時廣播。

```json
{
  "type": "settings_updated",
  "payload": {
    "settings": { ... },
    "timestamp": 1710316800000
  }
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `settings` | `SessionSettings` | 完整設定物件 (非 partial) |
| `timestamp` | `number` | 事件時間 (Unix 毫秒) |

---

#### playing_changed

播放狀態變更。當 controller 執行 `set_playing` 時廣播。

```json
{
  "type": "playing_changed",
  "payload": {
    "isPlaying": true,
    "timestamp": 1710316800000
  }
}
```

---

#### client_joined

新客戶端加入 session。廣播給同 session 的所有客戶端。

```json
{
  "type": "client_joined",
  "payload": {
    "clientId": "uuid-string",
    "role": "display",
    "controllerCount": 1,
    "displayCount": 3
  }
}
```

---

#### client_left

客戶端離開 session。廣播給同 session 的剩餘客戶端。

```json
{
  "type": "client_left",
  "payload": {
    "clientId": "uuid-string",
    "role": "display",
    "controllerCount": 1,
    "displayCount": 2
  }
}
```

**ClientEvent 欄位：**

| 欄位 | 型別 | 說明 |
|------|------|------|
| `clientId` | `string` | 客戶端 ID |
| `role` | `string` | 客戶端角色 (`controller` / `display` / `admin`) |
| `controllerCount` | `int` | 事件後的 controller 連線數 |
| `displayCount` | `int` | 事件後的 display 連線數 |

---

#### error

錯誤訊息。僅發送給觸發錯誤的客戶端。

```json
{
  "type": "error",
  "payload": {
    "message": "僅 controller 可變更行號",
    "details": null
  }
}
```

| 欄位 | 型別 | 說明 |
|------|------|------|
| `message` | `string` | 錯誤訊息 |
| `details` | `any?` | 可選的附加資訊 |

---

### WebSocket 使用範例

```typescript
// 前端 NativeWSClient 使用
import { NativeWSClient } from '@/lib/websocket/native-client'

const ws = new NativeWSClient(wsUrl)
ws.connect()

// 加入 session
ws.joinSession('abc123', 'controller')

// 監聽事件
ws.on('session_state', (state) => {
  console.log('Session 狀態:', state)
})

ws.on('line_changed', ({ lineIndex }) => {
  console.log('目前行:', lineIndex)
})

ws.on('song_changed', ({ songId, song }) => {
  console.log('目前歌曲:', song.title)
})

// 控制操作
ws.changeLine(5)
ws.nextLine()
ws.prevLine()
ws.setSong('song-uuid')
ws.setPlaying(true)
ws.updateSettings({ fontSize: 32, theme: 'transparent' })
```

---

## Endpoint 總覽

| # | Method | Path | Auth | 說明 |
|---|--------|------|------|------|
| 1 | GET | `/api/go-health` | 無 | 健康檢查 |
| 2 | POST | `/api/auth/register` | 無 (速率限制) | 使用者註冊 |
| 3 | POST | `/api/auth/login` | 無 (速率限制) | 使用者登入 |
| 4 | POST | `/api/auth/refresh` | 無 (速率限制) | 更新 access token |
| 5 | GET | `/api/auth/me` | RequireAuth | 取得目前使用者 |
| 6 | GET | `/api/stt/token` | RequireAuth | 取得 Deepgram API key |
| 7 | GET | `/api/stt/stream` | RequireAuth | Google STT WebSocket 串流 |
| 8 | GET | `/api/songs` | OptionalAuth | 歌曲列表 |
| 9 | POST | `/api/songs` | OptionalAuth | 建立歌曲 |
| 10 | GET | `/api/songs/{id}` | OptionalAuth | 取得單一歌曲 |
| 11 | PUT | `/api/songs/{id}` | OptionalAuth | 更新歌曲 |
| 12 | DELETE | `/api/songs/{id}` | OptionalAuth | 刪除歌曲 |
| 13 | GET | `/api/songs/{id}/export` | OptionalAuth | 匯出 LRC |
| 14 | POST | `/api/songs/{id}/import` | OptionalAuth | 匯入 LRC |
| 15 | GET | `/api/playlists` | OptionalAuth | 播放清單列表 |
| 16 | POST | `/api/playlists` | OptionalAuth | 建立播放清單 |
| 17 | PUT | `/api/playlists/{id}` | OptionalAuth | 更新播放清單 |
| 18 | DELETE | `/api/playlists/{id}` | OptionalAuth | 刪除播放清單 |
| 19 | GET | `/api/settings` | OptionalAuth | 取得設定 |
| 20 | PUT | `/api/settings` | OptionalAuth | 更新設定 |
| 21 | POST | `/api/settings` | OptionalAuth | 重設設定 |
| 22 | POST | `/api/lyrics/search` | OptionalAuth | 搜尋歌詞 |
| 23 | GET | `/api/lyrics/search/{id}` | OptionalAuth | 取得完整歌詞 |
| 24 | GET | `/ws` | 無 | WebSocket 即時同步 |

---

## 相關文檔

- [系統架構](architecture.md)
- [資料庫設計](database.md)

---

**文件版本：** 3.0
**最後更新：** 2026-03-19

**變更記錄：**
- v3.0 (2026-03-19): 全面更新 -- 修正認證機制為 HttpOnly cookie (非 Bearer header)、修正 Auth/Song/Playlist/Settings response schema、新增 STT 和 Lyrics Search 端點、新增完整錯誤代碼一覽、修正 LRC import request 格式、更新 WebSocket protocol payload 細節、新增 Endpoint 總覽表
- v2.0 (2026-03-13): 全面改寫 -- 對齊 Go 後端 API 實作，移除 Socket.IO / AI endpoints 舊內容
- v1.1 (2026-03-12): 移除 tRPC，改用 REST API
- v1.0 (2026-03-11): 初始版本
