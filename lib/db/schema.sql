-- ============================================================================
-- LY Lyrics Display System - Database Schema
-- ============================================================================
-- Migration: 001_initial_schema
-- Date: 2026-03-12
-- Description: Initial database schema for self-hosted PostgreSQL
-- Replaces: Supabase schema
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Users Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100),
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Application users';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.email_verified IS 'Email verification status';

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================================================
-- Songs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  lyrics TEXT NOT NULL,              -- JSON array: ["line1", "line2", ...]
  lrc_timestamps TEXT,               -- JSON array: [1000, 2000, ...] in milliseconds
  lrc_content JSONB,                 -- Parsed LRC content: [{time: 1000, text: "..."}]
  language VARCHAR(2),                -- ISO 639-1 language code (e.g., "zh", "en")
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_user FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE songs IS 'Song lyrics and metadata';
COMMENT ON COLUMN songs.lyrics IS 'JSON array of lyric lines';
COMMENT ON COLUMN songs.lrc_timestamps IS 'JSON array of LRC timestamps in milliseconds';
COMMENT ON COLUMN songs.lrc_content IS 'Parsed LRC content with time and text';

-- Indexes for songs
CREATE INDEX IF NOT EXISTS idx_songs_user_id ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_title ON songs USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs USING gin(to_tsvector('simple', artist));
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON songs(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Playlists Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_playlists_user FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE playlists IS 'User playlists';

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON playlists(user_id);

-- ============================================================================
-- Playlist Songs Join Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS playlist_songs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL,
  song_id UUID NOT NULL,
  order_index INT NOT NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_playlist FOREIGN KEY (playlist_id)
    REFERENCES playlists(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_song FOREIGN KEY (song_id)
    REFERENCES songs(id)
    ON DELETE CASCADE,

  CONSTRAINT uk_playlist_song_order UNIQUE (playlist_id, song_id, order_index)
);

COMMENT ON TABLE playlist_songs IS 'Join table for playlists and songs with order';
COMMENT ON COLUMN playlist_songs.order_index IS 'Order of song in playlist (0-based)';

CREATE INDEX IF NOT EXISTS idx_playlist_songs_playlist ON playlist_songs(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_songs_song ON playlist_songs(song_id);

-- ============================================================================
-- Settings Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,

  -- Display Settings
  display_lines INT DEFAULT 4 CHECK (display_lines BETWEEN 1 AND 10),
  font_size INT DEFAULT 24 CHECK (font_size BETWEEN 12 AND 72),
  font_family VARCHAR(100) DEFAULT 'Inter',
  theme VARCHAR(50) DEFAULT 'dark' CHECK (theme IN ('light', 'dark', 'transparent')),
  show_background BOOLEAN DEFAULT true,
  background_color VARCHAR(7),  -- Hex color: #RRGGBB
  text_color VARCHAR(7),         -- Hex color: #RRGGBB
  highlight_color VARCHAR(7),    -- Hex color: #RRGGBB

  -- Scroll Settings
  auto_scroll BOOLEAN DEFAULT true,
  scroll_duration INT DEFAULT 300 CHECK (scroll_duration BETWEEN 100 AND 1000),

  -- Animation Settings
  enable_animation BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_settings_user FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT uk_settings_user UNIQUE (user_id)
);

COMMENT ON TABLE settings IS 'User display and scroll settings';

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Sessions Table (for future authentication)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

COMMENT ON TABLE sessions IS 'User sessions for authentication';

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ============================================================================
-- Demo User (for development)
-- ============================================================================

-- Insert demo user (password: "password123")
-- Hash generated with bcrypt (10 rounds)
INSERT INTO users (id, email, password_hash, name, email_verified)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@ly-lyrics.local',
  '$2a$10$YourBcryptHashHere',  -- Will be replaced by actual hash
  'Demo User',
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Views for Common Queries
-- ============================================================================

-- Songs with user info
CREATE OR REPLACE VIEW songs_with_user AS
SELECT
  s.id,
  s.title,
  s.artist,
  s.lyrics,
  s.lrc_timestamps,
  s.lrc_content,
  s.language,
  s.user_id,
  u.name AS user_name,
  u.email AS user_email,
  s.created_at,
  s.updated_at
FROM songs s
JOIN users u ON s.user_id = u.id;

-- Playlists with song counts
CREATE OR REPLACE VIEW playlists_with_counts AS
SELECT
  p.id,
  p.name,
  p.description,
  p.user_id,
  COUNT(ps.song_id) AS song_count,
  p.created_at,
  p.updated_at
FROM playlists p
LEFT JOIN playlist_songs ps ON p.id = ps.playlist_id
GROUP BY p.id, p.name, p.description, p.user_id, p.created_at, p.updated_at;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to search songs by title or artist
CREATE OR REPLACE FUNCTION search_songs(search_query TEXT)
RETURNS TABLE (
  id UUID,
  title VARCHAR(255),
  artist VARCHAR(255),
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.artist,
    ts_rank(to_tsvector('simple', s.title || ' ' || COALESCE(s.artist, '')), query) AS rank
  FROM songs s
  WHERE
    to_tsvector('simple', s.title || ' ' || COALESCE(s.artist, '')) @@ query
    OR s.title ILIKE '%' || search_query || '%'
    OR s.artist ILIKE '%' || search_query || '%'
  ORDER BY rank ASC, s.title ASC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Migration Info
-- ============================================================================

-- Record migration in schema_migrations table (for future use)
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO schema_migrations (name) VALUES ('001_initial_schema')
ON CONFLICT (name) DO NOTHING;
