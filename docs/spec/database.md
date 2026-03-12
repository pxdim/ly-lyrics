# 資料庫設計

## 資料庫概覽

LY 系統使用 **Supabase PostgreSQL** 作為主資料庫。

**連線資訊:**
- Host: `ylwtfaczffuzyaijhhqu.supabase.co`
- Port: `5432`
- Database: `postgres`

---

## 資料表 (Tables)

### 1. songs (歌曲表)

儲存所有歌曲資訊與歌詞。

```sql
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  lyrics TEXT NOT NULL,              -- JSON 陣列: ["第一句", "第二句"]
  lrc_timestamps TEXT,               -- LRC 格式時間戳
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_songs_user_id ON songs(user_id);
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_artist ON songs(artist);

-- 觸發器: 更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `title` | VARCHAR(255) | 歌曲名稱 | NOT NULL |
| `artist` | VARCHAR(255) | 歌手名稱 | |
| `lyrics` | TEXT | 歌詞 JSON 陣列 | NOT NULL |
| `lrc_timestamps` | TEXT | LRC 時間戳 | |
| `user_id` | UUID | 建立者 ID | FOREIGN KEY |
| `created_at` | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | 更新時間 | DEFAULT NOW() |

---

### 2. playlists (播放列表表)

```sql
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_playlists_user_id ON playlists(user_id);

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `name` | VARCHAR(255) | 播放列表名稱 | NOT NULL |
| `user_id` | UUID | 建立者 ID | FOREIGN KEY |
| `created_at` | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |
| `updated_at` | TIMESTAMPTZ | 更新時間 | DEFAULT NOW() |

---

### 3. playlist_songs (播放列表歌曲關聯表)

```sql
CREATE TABLE playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

CREATE INDEX idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX idx_playlist_songs_song_id ON playlist_songs(song_id);
```

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `playlist_id` | UUID | 播放列表 ID | FOREIGN KEY |
| `song_id` | UUID | 歌曲ID | FOREIGN KEY |
| `order_index` | INT | 排序順序 | NOT NULL |
| `created_at` | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |

---

### 4. user_settings (用戶設定表)

```sql
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_lines INT DEFAULT 4 CHECK (display_lines BETWEEN 1 AND 10),
  font_size INT DEFAULT 24 CHECK (font_size BETWEEN 12 AND 72),
  line_height DECIMAL(3,2) DEFAULT 1.5 CHECK (line_height BETWEEN 1.0 AND 3.0),
  theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  auto_scroll BOOLEAN DEFAULT true,
  background_color VARCHAR(7) DEFAULT '#000000',
  background_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `user_id` | UUID | 用戶 ID | FOREIGN KEY, UNIQUE |
| `display_lines` | INT | 顯示行數 | DEFAULT 4, 1-10 |
| `font_size` | INT | 字體大小 | DEFAULT 24, 12-72 |
| `line_height` | DECIMAL | 行高 | DEFAULT 1.5, 1.0-3.0 |
| `theme` | VARCHAR(20) | 主題 | 'dark' 或 'light' |
| `auto_scroll` | BOOLEAN | 自動滾動 | DEFAULT true |
| `background_color` | VARCHAR(7) | 背景顏色 | Hex 格式 |
| `background_image` | TEXT | 背景圖片 URL | |

---

### 5. sessions (同步會話表)

追蹤控制端與顯示端的同步會話。

```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code VARCHAR(20) UNIQUE NOT NULL,
  controller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  current_line_index INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX idx_sessions_session_code ON sessions(session_code);
CREATE INDEX idx_sessions_controller_id ON sessions(controller_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

| 欄位 | 型別 | 說明 | 限制 |
|------|------|------|------|
| `id` | UUID | 主鍵 | PRIMARY KEY |
| `session_code` | VARCHAR(20) | 會話代碼 | UNIQUE |
| `controller_id` | UUID | 控制者 ID | FOREIGN KEY |
| `current_song_id` | UUID | 當前歌曲 ID | FOREIGN KEY |
| `current_line_index` | INT | 當前行索引 | DEFAULT 0 |
| `status` | VARCHAR(20) | 狀態 | 'active' 或 'ended' |
| `created_at` | TIMESTAMPTZ | 建立時間 | DEFAULT NOW() |
| `expires_at` | TIMESTAMPTZ | 過期時間 | DEFAULT +24h |

---

### 6. ai_listening_logs (AI 監聽日誌)

記錄 AI 聽歌辨識的結果。

```sql
CREATE TABLE ai_listening_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  audio_snippet TEXT,                    -- Base64 音頻片段
  transcript TEXT,                       -- AI 識別結果
  matched_line_index INT,
  confidence DECIMAL(4,3),
  processing_time_ms INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_logs_session_id ON ai_listening_logs(session_id);
CREATE INDEX idx_ai_logs_song_id ON ai_listening_logs(song_id);
CREATE INDEX idx_ai_logs_created_at ON ai_listening_logs(created_at);
```

---

## ER 圖

```
┌─────────────────┐
│  auth.users     │
│  (Supabase)     │
└────────┬────────┘
         │
         ├──┬──────────────────────────────────────┐
         │  │  │  │                               │
         ▼  ▼  ▼  ▼                               ▼
    ┌────────┐ ┌──────────┐ ┌──────────────┐ ┌─────────────┐
    │ songs  │ │playlists │ │user_settings │ │  sessions   │
    └────────┘ └──────────┘ └──────────────┘ └─────────────┘
         │            │
         │            └──────┬────────────────┐
         │                    │                │
         ▼                    ▼                ▼
    ┌─────────────────────────────────────────────────┐
    │             playlist_songs                       │
    └─────────────────────────────────────────────────┘
                                                   │
                                                   ▼
                                          ┌────────────────────┐
                                          │ ai_listening_logs  │
                                          └────────────────────┘
```

---

## 資料範例

### songs 範例資料

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "小幸運",
  "artist": "田馥甄",
  "lyrics": "[\"我聽見雨滴\", \"落在青青草地\", \"我遠方的一位\", \"那個少年\"]",
  "lrc_timestamps": "[00:12.34]我聽見雨滴\n[00:16.78]落在青青草地",
  "user_id": "user_uuid",
  "created_at": "2026-03-11T10:00:00Z",
  "updated_at": "2026-03-11T10:00:00Z"
}
```

### playlists 範例資料

```json
{
  "id": "playlist_uuid",
  "name": "演唱會歌單",
  "user_id": "user_uuid",
  "songs": [
    {
      "song_id": "song_uuid_1",
      "order_index": 1
    },
    {
      "song_id": "song_uuid_2",
      "order_index": 2
    }
  ]
}
```

---

## 常用查詢

### 取得用戶所有歌曲

```sql
SELECT * FROM songs
WHERE user_id = $1
ORDER BY created_at DESC;
```

### 搜索歌曲

```sql
SELECT * FROM songs
WHERE user_id = $1
  AND (title ILIKE '%' || $2 || '%'
       OR artist ILIKE '%' || $2 || '%')
ORDER BY title;
```

### 取得播放列表及其歌曲

```sql
SELECT p.*, ps.order_index, s.*
FROM playlists p
JOIN playlist_songs ps ON p.id = ps.playlist_id
JOIN songs s ON ps.song_id = s.id
WHERE p.id = $1
ORDER BY ps.order_index;
```

---

## 備份策略

- **自動備份**: Supabase 自動每日備份
- **手動備份**: 重要更新前手動匯出
- **保留期限**: 保留 30 天內的備份

---

## 遷移策略

使用 Supabase Migrations:

```bash
# 建立遷移
supabase migration new add_songs_table

# 套用遷移
supabase db push

# 重置資料庫
supabase db reset
```

---

## 相關文檔

- [系統架構](architecture.md)
- [API 文檔](api.md)
- [部署文檔](../deployment.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
