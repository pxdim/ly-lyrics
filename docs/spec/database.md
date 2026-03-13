# 資料庫設計

## 資料庫概覽

LY 系統使用**自架 PostgreSQL**（部署於 Railway），透過 **Ent ORM** 進行型別安全的資料存取。

所有 schema 定義位於 `backend/internal/ent/schema/`。

---

## 資料表 (Tables)

### 1. users (使用者表)

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `email` | VARCHAR(255) | Email | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR(255) | bcrypt 雜湊 | NOT NULL |
| `name` | VARCHAR(100) | 使用者名稱 | NULLABLE |
| `email_verified` | BOOLEAN | Email 驗證狀態 | DEFAULT false |
| `created_at` | TIMESTAMPTZ | 建立時間 | IMMUTABLE |
| `updated_at` | TIMESTAMPTZ | 更新時間 | 自動更新 |

**Demo User:** `00000000-0000-0000-0000-000000000001`（email: `demo@ly-lyrics.local`）

---

### 2. songs (歌曲表)

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `title` | VARCHAR(255) | 歌曲名稱 | NOT NULL |
| `artist` | VARCHAR(255) | 歌手名稱 | NULLABLE |
| `lyrics` | TEXT | 歌詞（JSON 序列化的 string[]） | NOT NULL |
| `lrc_timestamps` | TEXT | 時間戳（JSON 序列化的 float64[]） | NULLABLE |
| `lrc_content` | JSONB | 結構化 LRC 資料 | NULLABLE |
| `language` | VARCHAR(2) | 語言代碼 | NULLABLE |
| `user_id` | UUID | 所有者 | FK → users |
| `created_at` | TIMESTAMPTZ | 建立時間 | |
| `updated_at` | TIMESTAMPTZ | 更新時間 | |

**說明：**
- `lyrics` 欄位在 DB 中存為 TEXT（JSON 編碼的 `["行1","行2"]`），API 回應解析為 `string[]`
- `lrc_timestamps` 同理，存為 `[12.34, 16.78]` 的 JSON TEXT，API 回應為 `number[]`

---

### 3. settings (使用者設定表)

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `user_id` | UUID | 使用者 ID | FK → users, UNIQUE |
| `display_lines` | INT | 顯示行數 | DEFAULT 4 |
| `font_size` | INT | 字體大小 (px) | DEFAULT 24 |
| `font_family` | VARCHAR(100) | 字體名稱 | DEFAULT "Inter" |
| `theme` | VARCHAR(50) | 主題 | DEFAULT "dark" |
| `show_background` | BOOLEAN | 是否顯示背景 | DEFAULT true |
| `background_color` | VARCHAR(7) | 背景顏色 (hex) | NULLABLE |
| `text_color` | VARCHAR(7) | 文字顏色 (hex) | NULLABLE |
| `highlight_color` | VARCHAR(7) | 高亮顏色 (hex) | NULLABLE |
| `auto_scroll` | BOOLEAN | 自動滾動 | DEFAULT true |
| `scroll_duration` | INT | 滾動動畫時間 (ms) | DEFAULT 300 |
| `enable_animation` | BOOLEAN | 啟用動畫 | DEFAULT true |
| `created_at` | TIMESTAMPTZ | 建立時間 | |
| `updated_at` | TIMESTAMPTZ | 更新時間 | |

**說明：** 使用者不存在 settings 記錄時，API 會自動建立預設值記錄。

---

### 4. playlists (播放列表表)

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `name` | VARCHAR(255) | 播放列表名稱 | NOT NULL |
| `description` | TEXT | 描述 | NULLABLE |
| `user_id` | UUID | 所有者 | FK → users |
| `created_at` | TIMESTAMPTZ | 建立時間 | |
| `updated_at` | TIMESTAMPTZ | 更新時間 | |

---

### 5. playlist_songs (播放列表歌曲關聯表)

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `playlist_id` | UUID | 播放列表 ID | FK → playlists |
| `song_id` | UUID | 歌曲 ID | FK → songs |
| `order_index` | INT | 排序順序 | NOT NULL |
| `added_at` | TIMESTAMPTZ | 加入時間 | |

---

### 6. sessions (Session 表)

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `user_id` | UUID | 使用者 ID | FK → users |
| `token` | VARCHAR | Session token | UNIQUE |
| `expires_at` | TIMESTAMPTZ | 過期時間 | |
| `created_at` | TIMESTAMPTZ | 建立時間 | |

**說明：** 此表為預留設計，目前 WebSocket session 主要使用 Redis 管理。

---

## ER 圖

```
┌─────────────┐
│   users     │
│  (UUID PK)  │
└──────┬──────┘
       │
       ├──── 1:N ────┬──── 1:N ────┬──── 1:1 ────┬──── 1:N ────┐
       │              │              │              │              │
       ▼              ▼              ▼              ▼              ▼
┌────────────┐ ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│   songs    │ │ playlists │ │ settings │ │ sessions │ │playlist_ │
│            │ │           │ │          │ │          │ │  songs   │
└─────┬──────┘ └─────┬─────┘ └──────────┘ └──────────┘ └──────────┘
      │              │                                       ▲  ▲
      │              │                                       │  │
      └──────────────┴──────── M:N via playlist_songs ───────┘  │
                                                                 │
```

---

## Redis 資料結構

WebSocket session 狀態透過 Redis 持久化（TTL: 1 小時）：

### Key 格式

```
session:{sessionId}             # JSON: SessionState
session:clients:{sessionId}     # SET: ClientInfo JSON
```

### SessionState 結構

```json
{
  "sessionId": "abc123",
  "currentSong": {
    "id": "uuid",
    "title": "歌曲名稱",
    "artist": "歌手",
    "lyrics": ["行1", "行2"],
    "lrcTimestamps": [12.34, 16.78]
  },
  "currentLineIndex": 5,
  "isPlaying": true,
  "settings": {
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
  },
  "controllerCount": 1,
  "displayCount": 2,
  "createdAt": 1710300000000,
  "updatedAt": 1710300060000
}
```

---

## 遷移策略

目前使用 **Ent ORM auto migration**。未來規劃：

- **Atlas** declarative migration（Ent 官方推薦）
- Migration 檔案放置於 `backend/migrations/`
- 生產環境禁止 auto migration，必須透過 Atlas 管理

---

## 相關文檔

- [系統架構](architecture.md)
- [API 文檔](api.md)

---

**文件版本:** 2.0
**最後更新:** 2026-03-13

**變更記錄:**
- v2.0 (2026-03-13): 全面改寫 — 對齊 Ent ORM schema，移除 Supabase/RLS/auth.users 引用，新增 Redis session
- v1.0 (2026-03-11): 初始版本（Supabase）
