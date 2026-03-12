-- ============================================
-- LY - 歌詞顯示系統 資料庫初始化
-- ============================================
-- Version: 1.0.0
-- Date: 2026-03-12
-- Description: 建立所有資料表、索引、觸發器與 RLS 政策
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Functions
-- ============================================

-- 更新 updated_at 欄位的觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 生成 4 位數字代碼 (用於 session_code)
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS CHAR(4) AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result CHAR(4) := '';
  i INT;
BEGIN
  FOR i IN 1..4 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- ============================================
-- Tables
-- ============================================

-- 1. songs (歌曲表)
CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  lyrics TEXT NOT NULL,              -- JSON 陣列: ["第一句", "第二句"]
  lrc_timestamps TEXT,               -- LRC 格式時間戳
  language VARCHAR(10),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. playlists (播放列表表)
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. playlist_songs (播放列表歌曲關聯表)
CREATE TABLE IF NOT EXISTS playlist_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playlist_id, song_id)
);

-- 4. user_settings (用戶設定表)
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  display_lines INT DEFAULT 4 CHECK (display_lines BETWEEN 1 AND 10),
  font_size INT DEFAULT 32 CHECK (font_size BETWEEN 12 AND 72),
  font_family VARCHAR(100) DEFAULT 'Inter',
  theme VARCHAR(20) DEFAULT 'dark' CHECK (theme IN ('dark', 'light', 'auto')),
  show_background BOOLEAN DEFAULT true,
  background_color VARCHAR(7) DEFAULT '#000000',
  text_color VARCHAR(7) DEFAULT '#ffffff',
  highlight_color VARCHAR(7) DEFAULT '#0ea5e9',
  auto_scroll BOOLEAN DEFAULT true,
  scroll_duration INT DEFAULT 300,
  enable_animation BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. sessions (同步會話表)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code VARCHAR(20) UNIQUE NOT NULL DEFAULT generate_session_code(),
  controller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  current_line_index INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  connected_clients INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- 6. session_clients (會話客戶端連線記錄)
CREATE TABLE IF NOT EXISTS session_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  client_type VARCHAR(20) NOT NULL CHECK (client_type IN ('controller', 'display')),
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ai_listening_logs (AI 監聽日誌)
CREATE TABLE IF NOT EXISTS ai_listening_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  song_id UUID REFERENCES songs(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transcript TEXT,
  matched_line_index INT,
  confidence DECIMAL(4,3),
  processing_time_ms INT,
  api_provider VARCHAR(50) DEFAULT 'gemini',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- songs indexes
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs USING gin(to_tsvector('simple', artist));
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at DESC);

-- playlists indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_created_at ON playlists(created_at DESC);

-- playlist_songs indexes
CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist_id ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_song_id ON playlist_songs(song_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_order ON playlist_songs(playlist_id, order_index);

-- user_settings indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_session_code ON sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_sessions_controller_id ON sessions(controller_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- session_clients indexes
CREATE INDEX IF NOT EXISTS idx_session_clients_session_id ON session_clients(session_id);
CREATE INDEX IF NOT EXISTS idx_session_clients_last_seen ON session_clients(last_seen);

-- ai_listening_logs indexes
CREATE INDEX IF NOT EXISTS idx_ai_logs_session_id ON ai_listening_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_song_id ON ai_listening_logs(song_id);
CREATE INDEX IF NOT EXISTS idx_ai_logs_created_at ON ai_listening_logs(created_at DESC);

-- ============================================
-- Triggers
-- ============================================

-- songs updated_at trigger
CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- playlists updated_at trigger
CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- user_settings updated_at trigger
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- sessions updated_at trigger
CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_listening_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for songs
CREATE POLICY "Users can view their own songs"
  ON songs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own songs"
  ON songs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own songs"
  ON songs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own songs"
  ON songs FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for playlists
CREATE POLICY "Users can view their own playlists"
  ON playlists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own playlists"
  ON playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON playlists FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for playlist_songs (through playlists)
CREATE POLICY "Users can view songs in their playlists"
  ON playlist_songs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_songs.playlist_id
        AND playlists.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can modify songs in their playlists"
  ON playlist_songs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_songs.playlist_id
        AND playlists.user_id = auth.uid()
    )
  );

-- RLS Policies for user_settings
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for sessions
CREATE POLICY "Users can view their own sessions"
  ON sessions FOR SELECT
  USING (auth.uid() = controller_id);

CREATE POLICY "Users can create sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() = controller_id);

CREATE POLICY "Users can update their own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid() = controller_id);

-- RLS Policies for session_clients
CREATE POLICY "Users can view clients for their sessions"
  ON session_clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id = session_clients.session_id
        AND sessions.controller_id = auth.uid()
    )
  );

-- RLS Policies for ai_listening_logs
CREATE POLICY "Users can view their own AI logs"
  ON ai_listening_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own AI logs"
  ON ai_listening_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Helper Views
-- ============================================

-- 播放列表與歌曲的關聯視圖
CREATE OR REPLACE VIEW v_playlists_with_songs AS
SELECT
  p.id as playlist_id,
  p.name as playlist_name,
  p.user_id,
  ps.order_index,
  s.id as song_id,
  s.title,
  s.artist,
  s.lyrics,
  s.lrc_timestamps
FROM playlists p
LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
LEFT JOIN songs s ON ps.song_id = s.id
ORDER BY p.id, ps.order_index;

-- 活躍會話視圖
CREATE OR REPLACE VIEW v_active_sessions AS
SELECT
  s.id,
  s.session_code,
  s.controller_id,
  s.current_song_id,
  s.current_line_index,
  s.connected_clients,
  song.title as current_song_title,
  song.artist as current_song_artist,
  s.created_at,
  s.updated_at,
  s.expires_at
FROM sessions s
LEFT JOIN songs song ON s.current_song_id = song.id
WHERE s.status = 'active' AND s.expires_at > NOW();

-- ============================================
-- Sample Data (optional - for development)
-- ============================================

-- Insert sample song (if none exists)
INSERT INTO songs (title, artist, lyrics, language, user_id)
SELECT
  '示範歌曲',
  'LY 範例',
  '["這是第一行歌詞", "這是第二行歌詞", "這是第三行歌詞", "這是第四行歌詞", "這是第五行歌詞", "這是第六行歌詞", "這是第七行歌詞", "這是第八行歌詞"]',
  'zh-TW',
  (SELECT id FROM auth.users LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM songs WHERE title = '示範歌曲')
ON CONFLICT DO NOTHING;

-- ============================================
-- Grant Permissions (if using service role)
-- ============================================

-- Grant usage on schemas
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ============================================
-- Done
-- ============================================
