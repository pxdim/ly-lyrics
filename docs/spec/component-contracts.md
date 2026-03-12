# 組件契約規格

## 概述

本文檔定義 LY 系統中所有 React 組件的輸入/輸出契約。這些契約是 AI 生成組件時的規範，確保：
1. 組件間的正確通訊
2. WebSocket 整合的一致性
3. 狀態管理的標準化
4. 可測試性和可維護性

---

## 一、歌詞顯示組件

### 1.1 LyricsDisplay (歌詞顯示器)

```typescript
import type { Song, DisplaySettings } from './types'

/**
 * LyricsDisplay 組件契約
 *
 * @description
 * 核心歌詞顯示組件，負責渲染歌詞並處理滾動動畫。
 * 此組件會自動訂閱 WebSocket 的 'line_changed' 事件。
 *
 * @location components/lyrics/LyricsDisplay.tsx
 */
export interface LyricsDisplayProps {
  // ========== 資料輸入 ==========

  /** 歌詞陣列 */
  lyrics: string[]

  /** 當前啟用的歌詞行索引 */
  currentIndex: number

  /** 顯示設定 */
  settings: DisplaySettings

  // ========== 事件回調 ==========

  /** 當用戶點擊某一行時觸發 */
  onLineClick?: (lineIndex: number) => void

  /** 當歌詞載入完成時觸發 */
  onLoad?: () => void

  // ========== WebSocket 整合 ==========

  /** WebSocket 連線狀態 (用於顯示連線指示器) */
  connectionStatus: 'connected' | 'disconnected' | 'connecting'

  // ========== 樣式覆蓋 ==========

  /** 自訂容器樣式類名 */
  className?: string

  /** 是否啟用動畫效果 */
  enableAnimation?: boolean
}

/**
 * LyricsDisplay 行為規範
 *
 * 1. 自動滾動行為：
 *    - 當 currentIndex 變化時，自動滾動使當前行位於可視區域中心
 *    - 使用 CSS transform 實現平滑滾動
 *
 * 2. 高亮規則：
 *    - 當前行：使用 settings.colors.textActive 顏色
 *    - 相鄰行：使用 settings.colors.textDim 顏色
 *    - 其他行：使用 settings.colors.text 顏色
 *
 * 3. 響應式斷點：
 *    - mobile: < 768px → 單行顯示
 *    - tablet: 768px - 1024px → 2-3 行顯示
 *    - desktop: > 1024px → 使用 settings.displayLines
 *
 * 4. 空狀態處理：
 *    - lyrics 為空陣列時顯示 "等待歌詞..."
 *    - currentIndex 超出範圍時使用最後一行
 */
```

### 1.2 LyricsLine (單行歌詞)

```typescript
/**
 * LyricsLine 組件契約
 *
 * @description
 * 單行歌詞組件，由 LyricsDisplay 內部使用
 *
 * @location components/lyrics/LyricsLine.tsx
 */
export interface LyricsLineProps {
  /** 歌詞內容 */
  text: string

  /** 行號 (從 0 開始) */
  index: number

  /** 是否為當前啟用行 */
  isActive: boolean

  /** 是否為相鄰行 (用於漸層效果) */
  isAdjacent: boolean

  /** 字體大小 */
  fontSize: number

  /** 主題配色 */
  colors: {
    text: string
    textActive: string
    textDim: string
  }

  /** 行高倍數 */
  lineHeight: number

  /** 對齊方式 */
  textAlign: 'left' | 'center' | 'right'

  /** 是否顯示行號 */
  showLineNumber: boolean

  /** 點擊事件 */
  onClick?: (index: number) => void
}
```

---

## 二、控制面板組件

### 2.1 LyricsControl (歌詞控制器)

```typescript
/**
 * LyricsControl 組件契約
 *
 * @description
 * 控制端的主要控制器組件，包含播放控制和歌曲選擇
 *
 * @location components/controller/LyricsControl.tsx
 */
export interface LyricsControlProps {
  // ========== 狀態輸入 ==========

  /** 當前歌曲 */
  currentSong: Song | null

  /** 當前行索引 */
  currentIndex: number

  /** 總行數 */
  totalLines: number

  /** WebSocket 連線狀態 */
  connectionStatus: 'connected' | 'disconnected' | 'connecting'

  /** 已連線的顯示端數量 */
  connectedDisplays: number

  /** Session ID (用於顯示 QR Code) */
  sessionId: string

  /** AI 聽歌狀態 */
  aiListeningState: {
    enabled: boolean
    status: 'idle' | 'listening' | 'processing' | 'error'
  }

  // ========== 事件回調 ==========

  /** 下一行 */
  onNextLine: () => void

  /** 上一行 */
  onPrevLine: () => void

  /** 跳到指定行 */
  onJumpToLine: (lineIndex: number) => void

  /** 選擇歌曲 */
  onSelectSong: (songId: string) => void

  /** 切換 AI 聽歌 */
  onToggleAiListening: () => void

  /** 開啟設定 */
  onOpenSettings: () => void
}

/**
 * LyricsControl 按鍵規範
 *
 * 快捷鍵綁定：
 * - ArrowLeft / ArrowUp: onPrevLine
 * - ArrowRight / ArrowDown: onNextLine
 * - Home: onJumpToLine(0)
 * - End: onJumpToLine(totalLines - 1)
 * - Space: 暫停/繼續 (預留功能)
 * - KeyA: onToggleAiListening
 * - KeyS: onOpenSettings
 */
```

### 2.2 ControlButton (控制按鈕)

```typescript
/**
 * ControlButton 通用契約
 *
 * @description
 * 所有控制按鈕的統一介面
 *
 * @location components/ui/ControlButton.tsx
 */
export interface ControlButtonProps {
  /** 按鈕類型 */
  variant: 'primary' | 'secondary' | 'icon' | 'danger'

  /** 按鈕圖示 (僅 icon 類型使用) */
  icon?: React.ReactNode

  /** 按鈕文字 */
  children?: string

  /** 是否禁用 */
  disabled?: boolean

  /** 是否載入中 */
  loading?: boolean

  /** 按鈕尺寸 */
  size?: 'sm' | 'md' | 'lg'

  /** 點擊事件 */
  onClick: () => void

  /** Tooltip 提示文字 */
  tooltip?: string

  /** 快捷鍵提示 */
  shortcut?: string
}
```

---

## 三、歌曲管理組件

### 3.1 SongSelector (歌曲選擇器)

```typescript
/**
 * SongSelector 組件契約
 *
 * @description
 * 歌曲選擇下拉選單
 *
 * @location components/songs/SongSelector.tsx
 */
export interface SongSelectorProps {
  /** 可選歌曲列表 */
  songs: Song[]

  /** 當前選中歌曲 ID */
  selectedSongId: string | null

  /** 選擇變更回調 */
  onSelect: (songId: string) => void

  /** 是否載入中 */
  loading?: boolean

  /** 是否禁用 */
  disabled?: boolean

  /** 佔位文字 */
  placeholder?: string

  /** 是否顯示歌手名稱 */
  showArtist?: boolean
}
```

### 3.2 SongEditor (歌曲編輯器)

```typescript
/**
 * SongEditor 組件契約
 *
 * @description
 * 新增/編輯歌曲的表單對話框
 *
 * @location components/songs/SongEditor.tsx
 */
export interface SongEditorProps {
  /** 編輯的歌曲 (null 表示新增) */
  song: Song | null

  /** 是否開啟對話框 */
  open: boolean

  /** 儲存回調 */
  onSave: (input: CreateSongInput | UpdateSongInput) => Promise<void>

  /** 取消回調 */
  onCancel: () => void

  /** 刪除回調 (僅編輯模式) */
  onDelete?: () => Promise<void>

  /** 是否正在儲存 */
  saving?: boolean
}

/**
 * SongEditor 驗證規則
 *
 * 1. title:
 *    - 必填，長度 1-255 字符
 *    - 前後去除空白
 *
 * 2. lyrics:
 *    - 必填，至少 1 行
 *    - 自動去除空行
 *    - 每行最多 500 字符
 *
 * 3. artist:
 *    - 選填，長度 0-255 字符
 *
 * 4. lrcTimestamps:
 *    - 數量必須與 lyrics 一致
 *    - 必須為遞增數列
 */
```

---

## 四、播放列表組件

### 4.1 PlaylistPanel (播放列表面板)

```typescript
/**
 * PlaylistPanel 組件契約
 *
 * @description
 * 顯示和管理播放列表的側邊面板
 *
 * @location components/playlists/PlaylistPanel.tsx
 */
export interface PlaylistPanelProps {
  /** 播放列表陣列 */
  playlists: Playlist[]

  /** 當前選中播放列表 ID */
  selectedPlaylistId: string | null

  /** 是否開啟面板 */
  open: boolean

  /** 選擇播放列表 */
  onSelectPlaylist: (playlistId: string) => void

  /** 新增播放列表 */
  onCreatePlaylist: (name: string) => Promise<void>

  /** 刪除播放列表 */
  onDeletePlaylist: (playlistId: string) => Promise<void>

  /** 重新排序歌曲 */
  onReorderSongs: (playlistId: string, songIds: string[]) => Promise<void>

  /** 關閉面板 */
  onClose: () => void
}
```

---

## 五、顯示端組件

### 5.1 DisplayView (顯示端頁面)

```typescript
/**
 * DisplayView 組件契約
 *
 * @description
 * 顯示端的主要頁面組件
 *
 * @location app/(display)/page.tsx
 */
export interface DisplayViewProps {
  /** Session ID (用於連線) */
  sessionId: string

  /** 連線狀態 */
  connectionStatus: 'connected' | 'disconnected' | 'connecting' | 'failed'

  /** 當前接收的資料 */
  sessionData: {
    song: Song | null
    currentIndex: number
    settings: DisplaySettings
  }

  /** 錯誤訊息 (如有) */
  error?: string

  /** 重新連線 */
  onReconnect: () => void

  /** 斷開連線 */
  onDisconnect: () => void
}

/**
 * DisplayView 生命週期規範
 *
 * 1. 組件掛載時：
 *    - 嘗試連接到 WebSocket 伺服器
 *    - 發送 join_session 訊息
 *
 * 2. 連線建立後：
 *    - 監聽 line_changed 事件
 *    - 監聽 song_changed 事件
 *    - 監聽 settings_updated 事件
 *
 * 3. 組件卸載時：
 *    - 發送 leave_session 訊息
 *    - 關閉 WebSocket 連線
 *
 * 4. 連線中斷時：
 *    - 顯示「連線中斷，正在重新連線...」
 *    - 自動嘗試重連 (最多 5 次)
 */
```

---

## 六、設定組件

### 6.1 SettingsPanel (設定面板)

```typescript
/**
 * SettingsPanel 組件契約
 *
 * @description
 * 顯示設定的對話框
 *
 * @location components/settings/SettingsPanel.tsx
 */
export interface SettingsPanelProps {
  /** 當前設定 */
  settings: DisplaySettings

  /** 是否開啟 */
  open: boolean

  /** 設定變更回調 */
  onChange: (settings: Partial<DisplaySettings>) => void

  /** 儲存回調 */
  onSave: (settings: DisplaySettings) => Promise<void>

  /** 重置為預設值 */
  onReset: () => void

  /** 關閉面板 */
  onClose: () => void
}
```

---

## 七、佈局組件

### 7.1 ControllerLayout (控制端佈局)

```typescript
/**
 * ControllerLayout 組件契約
 *
 * @description
 * 控制端頁面的根佈局
 *
 * @location app/(controller)/layout.tsx
 */
export interface ControllerLayoutProps {
  children: React.ReactNode

  /** Session ID */
  sessionId: string

  /** WebSocket 連線狀態 */
  connectionStatus: ConnectionStatus

  /** 已連線顯示端數量 */
  connectedDisplays: number
}

/**
 * ControllerLayout 結構
 *
 * ┌────────────────────────────────────┐
 * │ Header (Logo, Session ID, Settings) │
 * ├────────────────────────────────────┤
 * │                                    │
 * │  Main Content (LyricsPreview)      │
 * │                                    │
 * ├────────────────────────────────────┤
 * │ Controls (Prev, Next, AI Toggle)    │
 * ├────────────────────────────────────┤
 * │ Sidebar (Song List, Playlist)       │
 * └────────────────────────────────────┘
 */
```

### 7.2 DisplayLayout (顯示端佈局)

```typescript
/**
 * DisplayLayout 組件契約
 *
 * @description
 * 顯示端頁面的根佈局 (極簡設計)
 *
 * @location app/(display)/layout.tsx
 */
export interface DisplayLayoutProps {
  children: React.ReactNode

  /** 當前主題 */
  theme: Theme
}

/**
 * DisplayLayout 結構
 *
 * ┌────────────────────────────────────┐
 * │                                    │
 * │                                    │
 * │       Lyrics Display               │
 * │       (Full Height)                 │
 * │                                    │
 * │                                    │
 * └────────────────────────────────────┘
 *
 * 備註：顯示端無 Header、Sidebar 等多餘元素
 */
```

---

## 八、WebSocket 整合規範

### 8.1 useWebSocket Hook

```typescript
/**
 * useWebSocket Hook 契約
 *
 * @description
 * 統一的 WebSocket 連線管理 Hook
 *
 * @location hooks/useWebSocket.ts
 */
export interface UseWebSocketOptions {
  /** WebSocket 伺服器 URL */
  url: string

  /** Session ID */
  sessionId: string

  /** 客戶端類型 */
  clientType: 'controller' | 'display'

  /** 心跳間隔 (ms) */
  heartbeatInterval?: number

  /** 自動重連 */
  autoReconnect?: boolean

  /** 最大重連次數 */
  maxReconnectAttempts?: number
}

export interface UseWebSocketReturn {
  /** 連線狀態 */
  status: 'connecting' | 'connected' | 'disconnected' | 'error'

  /** 發送訊息 */
  send: <T>(type: string, payload: T) => void

  /** 訂閱事件 */
  on: <T>(event: string, callback: (payload: T) => void) => void

  /** 取消訂閱 */
  off: (event: string) => void

  /** 手動重連 */
  reconnect: () => void

  /** 手動斷線 */
  disconnect: () => void
}
```

---

## 九、狀態管理整合

### 9.1 useLyricsStore Hook

```typescript
/**
 * useLyricsStore Hook 契約
 *
 * @description
 * 從 Zustand store 取用狀態和 actions
 *
 * @location stores/lyricsStore.ts
 */
export interface UseLyricsStoreReturn {
  // ========== 狀態 ==========
  currentSong: Song | null
  currentIndex: number
  displaySettings: DisplaySettings
  connectionStatus: ConnectionStatus
  connectedDisplays: number
  aiListeningState: AiListeningState

  // ========== Actions ==========
  setCurrentSong: (song: Song) => void
  nextLine: () => void
  prevLine: () => void
  jumpToLine: (index: number) => void
  updateSettings: (settings: Partial<DisplaySettings>) => void
  setConnectionStatus: (status: ConnectionStatus) => void
  toggleAiListening: () => void
}
```

---

## 十、組件層級結構

### 10.1 Component Tree (組件樹)

```
App
├── (controller)/
│   └── ControllerLayout
│       ├── Header
│       │   ├── Logo
│       │   ├── SessionDisplay (sessionId, QR Code)
│       │   └── SettingsButton
│       ├── MainContent
│       │   └── LyricsPreview
│       │       └── LyricsDisplay × N
│       │           └── LyricsLine × N
│       ├── ControlBar
│       │   ├── LyricsControl
│       │   │   ├── ControlButton (Prev)
│       │   │   ├── ControlButton (Next)
│       │   │   ├── AiToggleButton
│       │   │   └── ConnectionIndicator
│       │   └── ProgressBar
│       └── Sidebar (可摺疊)
│           ├── SongList
│           │   ├── SongSelector
│           │   └── SongItem × N
│           └── PlaylistPanel
│               └── PlaylistItem × N
│
├── (display)/
│   └── DisplayLayout
│       ├── ConnectionStatus (僅斷線時顯示)
│       └── LyricsDisplay
│           └── LyricsLine × N
│
└── Modals
    ├── SongEditor
    ├── SettingsPanel
    └── PlaylistEditor
```

---

## 十一、組件測試契約

### 11.1 測試要求

每個組件必須包含：

```typescript
// 測試檔案範例: components/lyrics/__tests__/LyricsDisplay.test.tsx

describe('LyricsDisplay', () => {
  // Props 介面測試
  it('should accept all required props', () => {
    const props = {
      lyrics: ['第一句', '第二句'],
      currentIndex: 0,
      settings: mockDisplaySettings,
      connectionStatus: 'connected'
    }
    render(<LyricsDisplay {...props} />)
    // ...
  })

  // 行為測試
  it('should highlight current line', () => {
    // ...
  })

  it('should scroll to current line when index changes', () => {
    // ...
  })

  // 事件測試
  it('should call onLineClick when line is clicked', () => {
    // ...
  })

  // WebSocket 整合測試
  it('should update when receiving line_changed event', () => {
    // ...
  })

  // 響應式測試
  it('should adjust display lines on mobile', () => {
    // ...
  })

  // 邊緣情況測試
  it('should handle empty lyrics array', () => {
    // ...
  })

  it('should handle currentIndex out of bounds', () => {
    // ...
  })
})
```

---

## 十二、效能要求

### 12.1 Performance (效能)

每個組件必須遵守：

```typescript
/**
 * 效能規範
 *
 * 1. React.memo:
 *    - 所有列表項目組件必須使用 React.memo
 *    - LyricsLine 必須使用 React.memo
 *
 * 2. useCallback:
 *    - 所有事件處理器必須使用 useCallback
 *
 * 3. useMemo:
 *    - 計算密集的操作必須使用 useMemo
 *    - 可見歌詞陣列必須使用 useMemo
 *
 * 4. 虛擬化:
 *    - 歌詞列表超過 100 行時必須使用虛擬滾動
 *
 * 5. CSS Transform:
 *    - 滾動動畫必須使用 transform 而非 top/left
 *
 * 6. 防抖/節流:
 *    - onLineClick 必須使用防抖 (300ms)
 */
```

---

## 相關文檔

- [核心型別定義](types.md)
- [狀態管理](state-management.md)
- [系統架構](architecture.md)
- [API 規格](api.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
