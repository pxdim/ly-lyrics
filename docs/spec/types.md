# 核心型別定義

## 概述

本文檔定義 LY 歌詞顯示系統的所有核心 TypeScript 介面。這些型別定義是整個系統的「契約」，確保前後端、AI 開發時的類型安全。

---

## 一、基礎型別

### 1.1 通用型別

```typescript
/**
 * UUID 字串型別
 */
export type UUID = string

/**
 * 時間戳型別 (Unix milliseconds)
 */
export type Timestamp = number

/**
 * 可選的 UUID
 */
export type NullableUUID = UUID | null

/**
 * JSON 可序列化的值
 */
export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }
```

---

## 二、歌曲相關型別

### 2.1 Song (歌曲)

```typescript
/**
 * 歌曲實體
 *
 * @description
 * 代表一首完整的歌曲，包含歌詞和元數據
 *
 * @example
 * ```ts
 * const song: Song = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   title: '小情歌',
 *   artist: '蘇打綠',
 *   lyrics: ['這是一首簡單的小情歌', '唱著人們心腸的曲折'],
 *   userId: 'user-123',
 *   createdAt: Date.now(),
 *   updatedAt: Date.now()
 * }
 * ```
 */
export interface Song {
  /** 唯一識別碼 */
  id: UUID

  /** 歌曲標題 (必填) */
  title: string

  /** 歌手/樂團名稱 (選填) */
  artist?: string

  /** 歌詞陣列 (一行一句) */
  lyrics: string[]

  /** LRC 時間戳 (秒，可選) */
  lrcTimestamps?: number[]

  /** 歌詞語言代碼 (ISO 639-1) */
  language?: 'zh-TW' | 'zh-CN' | 'en' | 'ja' | 'ko' | 'other'

  /** 創建者 ID */
  userId: UUID

  /** 創建時間 */
  createdAt: Timestamp

  /** 最後更新時間 */
  updatedAt: Timestamp
}

/**
 * 創建歌曲的輸入 DTO
 */
export interface CreateSongInput {
  title: string
  artist?: string
  lyrics: string[] | string  // 支援陣列或換行分隔的字串
  lrcTimestamps?: number[]
  language?: Song['language']
}

/**
 * 更新歌曲的輸入 DTO
 */
export interface UpdateSongInput {
  title?: string
  artist?: string
  lyrics?: string[] | string
  lrcTimestamps?: number[]
  language?: Song['language']
}
```

### 2.2 SongQuery (歌曲查詢)

```typescript
/**
 * 歌曲查詢參數
 */
export interface SongQuery {
  /** 關鍵字搜尋 (標題或歌手) */
  search?: string

  /** 語言篩選 */
  language?: Song['language']

  /** 分頁參數 */
  pagination?: {
    page: number
    limit: number
  }

  /** 排序方式 */
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'artist'
  sortOrder?: 'asc' | 'desc'
}
```

---

## 三、播放列表相關型別

### 3.1 Playlist (播放列表)

```typescript
/**
 * 播放列表實體
 */
export interface Playlist {
  id: UUID
  name: string
  songs: PlaylistSong[]
  userId: UUID
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * 播放列表中的歌曲項目
 */
export interface PlaylistSong {
  /** 關聯 ID */
  id: UUID

  /** 播放列表 ID */
  playlistId: UUID

  /** 歌曲資料 (包含完整 Song 物件或只有 ID) */
  song: Song | UUID

  /** 排序索引 (從 0 開始) */
  orderIndex: number
}

/**
 * 創建播放列表的輸入
 */
export interface CreatePlaylistInput {
  name: string
  songIds?: UUID[]
}
```

---

## 四、同步會話相關型別

### 4.1 Session (同步會話)

```typescript
/**
 * 同步會話狀態
 *
 * @description
 * 控制端與顯示端之間的同步會話
 */
export interface Session {
  /** 會話唯一 ID (6 位數字) */
  id: string

  /** 會話類型 */
  type: 'controller' | 'display'

  /** 當前歌曲 */
  currentSong: Song | null

  /** 當前歌詞行索引 */
  currentLineIndex: number

  /** 已連線的顯示端數量 */
  connectedDisplays: number

  /** 連線狀態 */
  status: ConnectionStatus

  /** AI 聽歌狀態 */
  aiListening: AiListeningState

  /** 會話創建時間 */
  createdAt: Timestamp

  /** 最後活動時間 */
  lastActivityAt: Timestamp
}

/**
 * 連線狀態
 */
export type ConnectionStatus =
  | 'connecting'    // 連線中
  | 'connected'     // 已連線
  | 'disconnected'  // 已斷線
  | 'reconnecting'  // 重連中
  | 'failed'        // 連線失敗

/**
 * AI 聽歌狀態
 */
export interface AiListeningState {
  /** 是否啟用 */
  enabled: boolean

  /** 當前狀態 */
  status: 'idle' | 'listening' | 'processing' | 'error'

  /** 最後辨識結果 */
  lastResult?: {
    lineIndex: number
    confidence: number
    timestamp: Timestamp
  }

  /** 錯誤訊息 (如有) */
  error?: string
}
```

---

## 五、WebSocket 訊息型別

### 5.1 WebSocketMessage (通用訊息格式)

```typescript
/**
 * WebSocket 訊息基底格式
 */
export interface WebSocketMessage<T = unknown> {
  /** 訊息類型 */
  type: string

  /** 訊息載荷 */
  payload: T

  /** 時間戳 */
  timestamp: Timestamp

  /** 訊息 ID (用於去重) */
  messageId?: string
}

/**
 * 客戶端 → 伺服器 訊息類型
 */
export type ClientToServerMessage =
  | WebSocketMessage<JoinSessionPayload>
  | WebSocketMessage<NextLinePayload>
  | WebSocketMessage<PrevLinePayload>
  | WebSocketMessage<SetLinePayload>
  | WebSocketMessage<UpdateSettingsPayload>
  | WebSocketMessage<PingPayload>

/**
 * 伺服器 → 客戶端 訊息類型
 */
export type ServerToClientMessage =
  | WebSocketMessage<LineChangedPayload>
  | WebSocketMessage<SongChangedPayload>
  | WebSocketMessage<SettingsUpdatedPayload>
  | WebSocketMessage<SessionStatePayload>
  | WebSocketMessage<DisplayConnectedPayload>
  | WebSocketMessage<DisplayDisconnectedPayload>
  | WebSocketMessage<AiResultPayload>
  | WebSocketMessage<PongPayload>
  | WebSocketMessage<ErrorPayload>
```

### 5.2 訊息載荷型別

```typescript
// ===== 會話控制 =====
export interface JoinSessionPayload {
  sessionId: string
  clientType: 'controller' | 'display'
}

// ===== 歌詞控制 =====
export interface NextLinePayload {
  /** 可選：指定跳到哪一行 (不指定則下一行) */
  targetIndex?: number
}

export interface PrevLinePayload {
  /** 可選：指定跳到哪一行 (不指定則上一行) */
  targetIndex?: number
}

export interface SetLinePayload {
  lineIndex: number
}

// ===== 設定更新 =====
export interface UpdateSettingsPayload {
  displayLines?: number
  fontSize?: number
  theme?: Theme
  lineHeight?: number
}

// ===== 伺服器推送 =====
export interface LineChangedPayload {
  lineIndex: number
  totalLines: number
  currentLyric: string
}

export interface SongChangedPayload {
  song: Song
}

export interface SettingsUpdatedPayload {
  settings: DisplaySettings
}

export interface SessionStatePayload {
  session: Session
}

export interface DisplayConnectedPayload {
  displayId: string
  totalDisplays: number
}

export interface DisplayDisconnectedPayload {
  displayId: string
  totalDisplays: number
}

export interface AiResultPayload {
  lineIndex: number
  confidence: number
  transcript: string
}

// ===== 心跳 =====
export interface PingPayload {
  clientTime: Timestamp
}

export interface PongPayload {
  serverTime: Timestamp
  clientTime: Timestamp
}

// ===== 錯誤 =====
export interface ErrorPayload {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
}
```

---

## 六、顯示設定型別

### 6.1 DisplaySettings (顯示設定)

```typescript
/**
 * 顯示設定
 */
export interface DisplaySettings {
  /** 顯示行數 (1-10) */
  displayLines: number

  /** 字體大小 (px) */
  fontSize: number

  /** 行高倍數 */
  lineHeight: number

  /** 主題 */
  theme: Theme

  /** 對齊方式 */
  textAlign: 'left' | 'center' | 'right'

  /** 是否顯示行號 */
  showLineNumber: boolean

  /** 是否啟用自動滾動動畫 */
  enableAnimation: boolean

  /** 動畫持續時間 (ms) */
  animationDuration: number
}

/**
 * 主題類型
 */
export type Theme =
  | 'dark'      // 深色主題
  | 'light'     // 淺色主題
  | 'transparent' // 透明背景 (NDI 輸出用)

/**
 * 主題配置
 */
export interface ThemeConfig {
  name: Theme
  colors: {
    background: string
    text: string
    textActive: string
    textDim: string
    overlay: string
  }
  fonts: {
    primary: string
    fallback: string[]
  }
}
```

---

## 七、AI 相關型別

### 7.1 AI (AI 辨識相關)

```typescript
/**
 * AI 辨識結果
 */
export interface AiRecognitionResult {
  /** 匹配的歌詞行索引 */
  lineIndex: number

  /** 信心度 (0-1) */
  confidence: number

  /** 原始辨識文字 */
  transcript: string

  /** 匹配的歌詞內容 */
  matchedLyric: string

  /** 辨識時間 */
  timestamp: Timestamp
}

/**
 * AI 辨識選項
 */
export interface AiRecognitionOptions {
  /** 取樣間隔 (ms) */
  sampleInterval: number

  /** 最小信心度閾值 */
  minConfidence: number

  /** 是否啟用模糊匹配 */
  enableFuzzyMatch: boolean

  /** 最大重試次數 */
  maxRetries: number
}

/**
 * AI Prompt 模板變數
 */
export interface AiPromptVariables {
  transcript: string
  lyrics: string[]
  currentLine?: number
  context?: {
    songTitle: string
    artist: string
    language: string
  }
}
```

---

## 八、錯誤型別

### 8.1 AppError (應用錯誤)

```typescript
/**
 * 錯誤代碼
 */
export type ErrorCode =
  | 'SONG_NOT_FOUND'
  | 'PLAYLIST_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'WEBSOCKET_DISCONNECTED'
  | 'AI_API_FAILED'
  | 'AI_API_QUOTA_EXCEEDED'
  | 'INVALID_LYRICS_FORMAT'
  | 'INVALID_SETTINGS'
  | 'RATE_LIMIT_EXCEEDED'
  | 'UNAUTHORIZED'
  | 'INTERNAL_ERROR'

/**
 * 應用錯誤類別
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public userMessage: string,
    public technicalMessage?: string,
    public details?: Record<string, unknown>
  ) {
    super(userMessage)
    this.name = 'AppError'
  }

  /**
   * 轉換為可序列化的物件
   */
  toJSON() {
    return {
      code: this.code,
      message: this.userMessage,
      details: this.details
    }
  }
}

/**
 * 錯誤回應格式
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode
    message: string
    details?: Record<string, unknown>
  }
  timestamp: Timestamp
}
```

---

## 九、API 請求/回應型別

### 9.1 API (API 相關)

```typescript
/**
 * API 成功回應格式
 */
export interface ApiResponse<T = unknown> {
  data: T
  success: true
  timestamp: Timestamp
}

/**
 * API 分頁回應
 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

/**
 * 歌曲 API 回應
 */
export type SongApiResponse = ApiResponse<Song>
export type SongsApiResponse = ApiResponse<PaginatedResponse<Song>>

/**
 * 播放列表 API 回應
 */
export type PlaylistApiResponse = ApiResponse<Playlist>
export type PlaylistsApiResponse = ApiResponse<PaginatedResponse<Playlist>>
```

---

## 十、NDI 輸出型別

### 10.1 NDI (NDI 相關)

```typescript
/**
 * NDI 輸出設定
 */
export interface NdiOutputSettings {
  /** 是否啟用 */
  enabled: boolean

  /** 輸出名稱 */
  outputName: string

  /** 輸出解析度 */
  resolution: {
    width: number
    height: number
    frameRate: number
  }

  /** 背景設定 */
  background: {
    type: 'transparent' | 'color' | 'image'
    color?: string
    imageUrl?: string
  }
}

/**
 * Spout 輸出設定 (Windows)
 */
export interface SpoutOutputSettings {
  /** 是否啟用 */
  enabled: boolean

  /** 輸出名稱 */
  senderName: string
}
```

---

## 十一、用戶相關型別

### 11.1 User (用戶)

```typescript
/**
 * 用戶實體
 */
export interface User {
  id: UUID
  email: string
  displayName?: string
  avatarUrl?: string
  createdAt: Timestamp
}

/**
 * 用戶設定
 */
export interface UserSettings {
  id: UUID
  userId: UUID

  /** 預設顯示設定 */
  defaultDisplaySettings: DisplaySettings

  /** 預設語言 */
  preferredLanguage: Song['language']

  /** 是否啟用 AI 聽歌 */
  aiEnabled: boolean

  /** 每日 AI 使用量計數 */
  dailyAiUsageCount: number

  /** 上次重置日期 */
  lastAiResetDate: Timestamp
}
```

---

## 十二、型別守衛

### 12.1 Type Guards (型別守衛)

```typescript
/**
 * 檢查是否為 Song
 */
export function isSong(value: unknown): value is Song {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'title' in value &&
    'lyrics' in value &&
    Array.isArray((value as Song).lyrics)
  )
}

/**
 * 檢查是否為 WebSocketMessage
 */
export function isWebSocketMessage(value: unknown): value is WebSocketMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'payload' in value &&
    'timestamp' in value
  )
}

/**
 * 檢查是否為 AppError
 */
export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError
}
```

---

## 十三、常數定義

### 13.1 Constants (常數)

```typescript
/**
 * 應用常數
 */
export const CONSTANTS = {
  /** 顯示行數限制 */
  DISPLAY_LINES_MIN: 1,
  DISPLAY_LINES_MAX: 10,
  DISPLAY_LINES_DEFAULT: 4,

  /** 字體大小限制 */
  FONT_SIZE_MIN: 16,
  FONT_SIZE_MAX: 72,
  FONT_SIZE_DEFAULT: 32,

  /** AI 相關 */
  AI_SAMPLE_INTERVAL_DEFAULT: 3000, // ms
  AI_MIN_CONFIDENCE_DEFAULT: 0.6,
  AI_MAX_DAILY_CALLS: 1000,

  /** WebSocket */
  WS_HEARTBEAT_INTERVAL: 30000, // ms
  WS_RECONNECT_DELAY: 2000, // ms
  WS_MAX_RECONNECT_ATTEMPTS: 5,

  /** Session */
  SESSION_CODE_LENGTH: 6,
  SESSION_EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24 hours
} as const

/**
 * 主題配置常數
 */
export const THEME_CONFIGS: Record<Theme, ThemeConfig> = {
  dark: {
    name: 'dark',
    colors: {
      background: '#0a0a0a',
      text: '#ffffff',
      textActive: '#00d4ff',
      textDim: '#666666',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    fonts: {
      primary: 'Noto Sans TC',
      fallback: ['system-ui', 'sans-serif'],
    },
  },
  light: {
    name: 'light',
    colors: {
      background: '#ffffff',
      text: '#1a1a1a',
      textActive: '#0066cc',
      textDim: '#888888',
      overlay: 'rgba(255, 255, 255, 0.5)',
    },
    fonts: {
      primary: 'Noto Sans TC',
      fallback: ['system-ui', 'sans-serif'],
    },
  },
  transparent: {
    name: 'transparent',
    colors: {
      background: 'transparent',
      text: '#ffffff',
      textActive: '#00d4ff',
      textDim: 'rgba(255, 255, 255, 0.5)',
      overlay: 'transparent',
    },
    fonts: {
      primary: 'Noto Sans TC',
      fallback: ['system-ui', 'sans-serif'],
    },
  },
}
```

---

## 相關文檔

- [API 規格](api.md)
- [資料庫設計](database.md)
- [組件契約](component-contracts.md)
- [狀態管理](state-management.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
