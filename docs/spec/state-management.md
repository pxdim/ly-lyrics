# 狀態管理規格

## 概述

本文檔定義 LY 系統使用 Zustand 的狀態管理架構。狀態管理是整個應用的「大腦」，負責協調：
1. 歌詞顯示狀態
2. WebSocket 連線狀態
3. AI 聽歌狀態
4. 用戶設定持久化

---

## 一、狀態管理架構

### 1.1 Store 結構

```
stores/
├── index.ts                 # Store 匯出
├── lyricsStore.ts          # 主狀態 Store
├── websocketStore.ts       # WebSocket 狀態 Store
├── settingsStore.ts        # 設定 Store (持久化)
└── middleware/
    ├── persist.ts          # LocalStorage 持久化中介軟體
    └── logger.ts           # 開發環境日誌中介軟體
```

---

## 二、LyricsStore (主狀態 Store)

### 2.1 Store 定義

```typescript
// stores/lyricsStore.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Song, DisplaySettings, ConnectionStatus, AiListeningState } from '@/spec/types'

/**
 * LyricsStore 狀態結構
 */
interface LyricsState {
  // ========== 歌曲狀態 ==========
  /** 當前歌曲 */
  currentSong: Song | null

  /** 當前歌詞行索引 */
  currentLineIndex: number

  /** 總行數 (從 currentSong.lyrics.length 計算) */
  totalLines: number

  // ========== 連線狀態 ==========
  /** WebSocket 連線狀態 */
  connectionStatus: ConnectionStatus

  /** Session ID */
  sessionId: string

  /** 已連線的顯示端數量 */
  connectedDisplays: number

  /** 已連線的顯示端 ID 列表 */
  displayIds: string[]

  // ========== AI 狀態 ==========
  /** AI 聽歌狀態 */
  aiListening: AiListeningState

  // ========== 顯示設定 ==========
  /** 顯示設定 */
  displaySettings: DisplaySettings

  // ========== 載入狀態 ==========
  /** 是否正在載入歌曲 */
  isLoadingSongs: boolean

  /** 是否正在處理 AI 辨識 */
  isProcessingAi: boolean
}

/**
 * LyricsStore Actions
 */
interface LyricsActions {
  // ========== 歌曲操作 ==========
  /** 設定當前歌曲 */
  setCurrentSong: (song: Song) => void

  /** 清除當前歌曲 */
  clearCurrentSong: () => void

  /** 下一行 */
  nextLine: () => void

  /** 上一行 */
  prevLine: () => void

  /** 跳到指定行 */
  jumpToLine: (index: number) => void

  // ========== 連線操作 ==========
  /** 設定 Session ID */
  setSessionId: (sessionId: string) => void

  /** 更新連線狀態 */
  setConnectionStatus: (status: ConnectionStatus) => void

  /** 顯示端已連線 */
  onDisplayConnected: (displayId: string) => void

  /** 顯示端已斷線 */
  onDisplayDisconnected: (displayId: string) => void

  /** 重置連線狀態 */
  resetConnection: () => void

  // ========== AI 操作 ==========
  /** 切換 AI 聽歌 */
  toggleAiListening: () => void

  /** 開始 AI 聽歌 */
  startAiListening: () => void

  /** 停止 AI 聽歌 */
  stopAiListening: () => void

  /** 更新 AI 辨識結果 */
  updateAiResult: (result: { lineIndex: number; confidence: number; transcript: string }) => void

  /** 設定 AI 錯誤 */
  setAiError: (error: string) => void

  // ========== 設定操作 ==========
  /** 更新顯示設定 */
  updateDisplaySettings: (settings: Partial<DisplaySettings>) => void

  /** 重置為預設設定 */
  resetDisplaySettings: () => void

  // ========== 載入狀態操作 ==========
  /** 設定載入狀態 */
  setIsLoadingSongs: (loading: boolean) => void

  /** 設定 AI 處理狀態 */
  setIsProcessingAi: (processing: boolean) => void

  // ========== 重置操作 ==========
  /** 重置所有狀態 */
  reset: () => void
}

/**
 * LyricsStore 完整型別
 */
type LyricsStore = LyricsState & LyricsActions

/**
 * 建立 LyricsStore
 */
export const useLyricsStore = create<LyricsStore>()(
  devtools(
    persist(
      (set, get) => ({
        // ========== 初始狀態 ==========
        currentSong: null,
        currentLineIndex: 0,
        totalLines: 0,
        connectionStatus: 'disconnected',
        sessionId: '',
        connectedDisplays: 0,
        displayIds: [],
        aiListening: {
          enabled: false,
          status: 'idle',
        },
        displaySettings: {
          displayLines: 4,
          fontSize: 32,
          lineHeight: 1.5,
          theme: 'dark',
          textAlign: 'center',
          showLineNumber: false,
          enableAnimation: true,
          animationDuration: 300,
        },
        isLoadingSongs: false,
        isProcessingAi: false,

        // ========== Actions 實作 ==========
        setCurrentSong: (song) => set({
          currentSong: song,
          currentLineIndex: 0,
          totalLines: song.lyrics.length,
        }),

        clearCurrentSong: () => set({
          currentSong: null,
          currentLineIndex: 0,
          totalLines: 0,
        }),

        nextLine: () => set((state) => ({
          currentLineIndex: Math.min(state.currentLineIndex + 1, state.totalLines - 1),
        })),

        prevLine: () => set((state) => ({
          currentLineIndex: Math.max(state.currentLineIndex - 1, 0),
        })),

        jumpToLine: (index) => set((state) => ({
          currentLineIndex: Math.max(0, Math.min(index, state.totalLines - 1)),
        })),

        setSessionId: (sessionId) => set({ sessionId }),

        setConnectionStatus: (status) => set({ connectionStatus: status }),

        onDisplayConnected: (displayId) => set((state) => ({
          connectedDisplays: state.connectedDisplays + 1,
          displayIds: [...state.displayIds, displayId],
        })),

        onDisplayDisconnected: (displayId) => set((state) => ({
          connectedDisplays: Math.max(0, state.connectedDisplays - 1),
          displayIds: state.displayIds.filter(id => id !== displayId),
        })),

        resetConnection: () => set({
          connectionStatus: 'disconnected',
          connectedDisplays: 0,
          displayIds: [],
        }),

        toggleAiListening: () => set((state) => {
          if (!state.aiListening.enabled) {
            return {
              aiListening: { enabled: true, status: 'listening' }
            }
          }
          return {
            aiListening: { enabled: false, status: 'idle' }
          }
        }),

        startAiListening: () => set({
          aiListening: { enabled: true, status: 'listening' }
        }),

        stopAiListening: () => set({
          aiListening: { enabled: false, status: 'idle', lastResult: undefined }
        }),

        updateAiResult: (result) => set((state) => ({
          aiListening: {
            ...state.aiListening,
            status: 'idle',
            lastResult: {
              lineIndex: result.lineIndex,
              confidence: result.confidence,
              timestamp: Date.now(),
            }
          },
          currentLineIndex: result.lineIndex,
        })),

        setAiError: (error) => set((state) => ({
          aiListening: {
            ...state.aiListening,
            status: 'error',
            error,
          }
        })),

        updateDisplaySettings: (settings) => set((state) => ({
          displaySettings: { ...state.displaySettings, ...settings }
        })),

        resetDisplaySettings: () => set({
          displaySettings: {
            displayLines: 4,
            fontSize: 32,
            lineHeight: 1.5,
            theme: 'dark',
            textAlign: 'center',
            showLineNumber: false,
            enableAnimation: true,
            animationDuration: 300,
          }
        }),

        setIsLoadingSongs: (loading) => set({ isLoadingSongs: loading }),

        setIsProcessingAi: (processing) => set({ isProcessingAi: processing }),

        reset: () => set({
          currentSong: null,
          currentLineIndex: 0,
          totalLines: 0,
          connectionStatus: 'disconnected',
          sessionId: '',
          connectedDisplays: 0,
          displayIds: [],
          aiListening: { enabled: false, status: 'idle' },
        }),
      }),
      {
        name: 'lyrics-store',
        // 只持久化設定，不持久化連線狀態
        partialize: (state) => ({
          displaySettings: state.displaySettings,
          aiListening: { enabled: state.aiListening.enabled },
        }),
      }
    ),
    { name: 'LyricsStore' }
  )
)
```

### 2.2 選擇器 (Selectors)

```typescript
/**
 * 常用選擇器
 *
 * 使用選擇器可以避免不必要的重渲染
 */
export const lyricsSelectors = {
  /** 當前歌詞 */
  currentLyric: (state: LyricsStore) => {
    return state.currentSong?.lyrics[state.currentLineIndex] || ''
  },

  /** 可見歌詞範圍 */
  visibleLyrics: (state: LyricsStore) => {
    const { currentSong, currentLineIndex, displaySettings } = state
    if (!currentSong) return []

    const halfRange = Math.floor(displaySettings.displayLines / 2)
    const start = Math.max(0, currentLineIndex - halfRange)
    const end = Math.min(currentSong.lyrics.length, currentLineIndex + halfRange + 1)

    return currentSong.lyrics.slice(start, end).map((text, i) => ({
      text,
      index: start + i,
      isActive: start + i === currentLineIndex,
    }))
  },

  /** 是否可以下一行 */
  canGoNext: (state: LyricsStore) => {
    return state.currentLineIndex < state.totalLines - 1
  },

  /** 是否可以上一行 */
  canGoPrev: (state: LyricsStore) => {
    return state.currentLineIndex > 0
  },

  /** 連線是否正常 */
  isConnected: (state: LyricsStore) => {
    return state.connectionStatus === 'connected'
  },

  /** AI 是否正在聽歌 */
  isAiListening: (state: LyricsStore) => {
    return state.aiListening.enabled && state.aiListening.status === 'listening'
  },
}
```

---

## 三、WebSocketStore (連線狀態 Store)

### 3.1 Store 定義

```typescript
// stores/websocketStore.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

/**
 * WebSocket 狀態
 */
interface WebSocketState {
  /** WebSocket 實例 */
  socket: WebSocket | null

  /** 連線狀態 */
  status: 'connecting' | 'connected' | 'disconnected' | 'error'

  /** 錯誤訊息 */
  error: string | null

  /** 重連次數 */
  reconnectAttempts: number

  /** 最後心跳時間 */
  lastHeartbeat: number
}

/**
 * WebSocket Actions
 */
interface WebSocketActions {
  /** 設定 Socket 實例 */
  setSocket: (socket: WebSocket | null) => void

  /** 更新狀態 */
  setStatus: (status: WebSocketState['status']) => void

  /** 設定錯誤 */
  setError: (error: string | null) => void

  /** 增加重連次數 */
  incrementReconnectAttempts: () => void

  /** 重置重連次數 */
  resetReconnectAttempts: () => void

  /** 更新心跳時間 */
  updateHeartbeat: () => void

  /** 重置所有狀態 */
  reset: () => void
}

type WebSocketStore = WebSocketState & WebSocketActions

export const useWebSocketStore = create<WebSocketStore>()(
  devtools((set) => ({
    socket: null,
    status: 'disconnected',
    error: null,
    reconnectAttempts: 0,
    lastHeartbeat: 0,

    setSocket: (socket) => set({ socket }),

    setStatus: (status) => set({ status, error: null }),

    setError: (error) => set({ error }),

    incrementReconnectAttempts: () => set((state) => ({
      reconnectAttempts: state.reconnectAttempts + 1
    })),

    resetReconnectAttempts: () => set({ reconnectAttempts: 0 }),

    updateHeartbeat: () => set({ lastHeartbeat: Date.now() }),

    reset: () => set({
      socket: null,
      status: 'disconnected',
      error: null,
      reconnectAttempts: 0,
      lastHeartbeat: 0,
    }),
  })),
  { name: 'WebSocketStore' }
)
```

---

## 四、SettingsStore (設定 Store)

### 4.1 Store 定義

```typescript
// stores/settingsStore.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Theme } from '@/spec/types'

/**
 * 使用者偏好設定
 */
interface UserPreferences {
  /** 預設語言 */
  preferredLanguage: string

  /** 預設主題 */
  defaultTheme: Theme

  /** 自動儲存 */
  autoSave: boolean

  /** 啟用音效 */
  soundEnabled: boolean

  /** 啟用震動 (行動裝置) */
  vibrationEnabled: boolean
}

interface SettingsState {
  /** 使用者偏好 */
  preferences: UserPreferences

  /** 最近的播放列表 */
  recentPlaylists: string[]

  /** 最後選擇的歌曲 */
  lastSongId: string | null
}

interface SettingsActions {
  /** 更新偏好設定 */
  updatePreferences: (prefs: Partial<UserPreferences>) => void

  /** 加入最近播放列表 */
  addRecentPlaylist: (playlistId: string) => void

  /** 移除最近播放列表 */
  removeRecentPlaylist: (playlistId: string) => void

  /** 設定最後選擇的歌曲 */
  setLastSongId: (songId: string) => void
}

type SettingsStore = SettingsState & SettingsActions

export const useSettingsStore = create<SettingsStore>()(
  devtools(
    persist(
      (set) => ({
        preferences: {
          preferredLanguage: 'zh-TW',
          defaultTheme: 'dark',
          autoSave: true,
          soundEnabled: true,
          vibrationEnabled: true,
        },
        recentPlaylists: [],
        lastSongId: null,

        updatePreferences: (prefs) => set((state) => ({
          preferences: { ...state.preferences, ...prefs }
        })),

        addRecentPlaylist: (playlistId) => set((state) => ({
          recentPlaylists: [
            playlistId,
            ...state.recentPlaylists.filter(id => id !== playlistId)
          ].slice(0, 10)
        })),

        removeRecentPlaylist: (playlistId) => set((state) => ({
          recentPlaylists: state.recentPlaylists.filter(id => id !== playlistId)
        })),

        setLastSongId: (songId) => set({ lastSongId: songId }),
      }),
      {
        name: 'settings-store',
      }
    )
  ),
  { name: 'SettingsStore' }
)
```

---

## 五、Store 整合使用

### 5.1 組件中使用

```typescript
// 使用範例
import { useLyricsStore } from '@/stores/lyricsStore'

function LyricsControl() {
  // 1. 直接使用 store (會在所有變化時重渲染)
  const { currentSong, currentLineIndex, nextLine, prevLine } = useLyricsStore()

  // 2. 使用選擇器 (只在選擇的值變化時重渲染)
  const currentLyric = useLyricsStore(lyricsSelectors.currentLyric)
  const canGoNext = useLyricsStore(lyricsSelectors.canGoNext)

  // 3. 只監聽特定值
  const isConnected = useLyricsStore(state => state.connectionStatus === 'connected')

  return (
    <div>
      <p>{currentLyric}</p>
      <button onClick={prevLine} disabled={!canGoPrev}>上一句</button>
      <button onClick={nextLine} disabled={!canGoNext}>下一句</button>
    </div>
  )
}
```

### 5.2 Actions 使用

```typescript
// 範例：外部更新狀態
import { useLyricsStore } from '@/stores/lyricsStore'

export function handleWebSocketMessage(message: ServerToClientMessage) {
  switch (message.type) {
    case 'line_changed':
      useLyricsStore.getState().jumpToLine(message.payload.lineIndex)
      break

    case 'song_changed':
      useLyricsStore.getState().setCurrentSong(message.payload.song)
      break

    case 'display_connected':
      useLyricsStore.getState().onDisplayConnected(message.payload.displayId)
      break
  }
}
```

---

## 六、狀態更新流程

### 6.1 數據流向圖

```
用戶操作
   │
   ▼
組件 Event Handler
   │
   ▼
Store Action
   │
   ├─▶ 更新 State
   │        │
   │        ▼
   │   Zustand 通知訂閱者
   │        │
   │        ▼
   │    組件重渲染
   │
   ├─▶ (可選) 發送 WebSocket 訊息
   │        │
   │        ▼
   │   WebSocket Server
   │        │
   │        ▼
   │    廣播給其他客戶端
   │
   └─▶ (可選) 持久化到 LocalStorage
            │
            ▼
       下次啟動時還原
```

### 6.2 WebSocket 事件處理流程

```
WebSocket 接收訊息
   │
   ▼
messageHandler 解析
   │
   ▼
根據 type 分發
   │
   ├─▶ line_changed ──▶ updateCurrentLine()
   │                        │
   │                        ▼
   │                   lyricsStore.jumpToLine()
   │
   ├─▶ song_changed ────▶ updateSong()
   │                        │
   ▼                        ▼
   ...                   lyricsStore.setCurrentSong()
```

---

## 七、狀態持久化策略

### 7.1 持久化規則

```typescript
/**
 * 持久化策略
 *
 * 不持久化 (每次啟動重置):
 * - connectionStatus
 * - sessionId
 * - connectedDisplays
 * - aiListening.status
 *
 * 持久化到 LocalStorage:
 * - displaySettings (完整)
 * - aiListening.enabled (僅啟用狀態)
 * - preferences (完整)
 * - recentPlaylists
 * - lastSongId
 *
 * 持久化到 Supabase:
 * - songs (由 API 管理)
 * - playlists (由 API 管理)
 * - userSettings (由 API 管理)
 */
```

### 7.2 持久化配置

```typescript
// stores/middleware/persist.ts
import { persist } from 'zustand/middleware'

export const lyricsPersist = persist(
  (config) => config,
  {
    name: 'lyrics-store',
    // 只持久化部分狀態
    partialize: (state) => ({
      displaySettings: state.displaySettings,
      aiListening: { enabled: state.aiListening.enabled },
    }),
  }
)
```

---

## 八、狀態重置策略

### 8.1 重置場景

```typescript
/**
 * 重置策略
 *
 * 1. 用戶登出:
 *    - reset() 所有狀態
 *    - 清除 LocalStorage
 *
 * 2. 切換歌曲:
 *    - 清除 currentLineIndex
 *    - 保留 displaySettings
 *    - 清除 aiListening.lastResult
 *
 * 3. 斷線重連:
 *    - 保留 currentSong
 *    - 重置 connectionStatus
 *    - 重置 displayIds
 *
 * 4. 離開顯示端頁面:
 *    - 發送 leave_session
 *    - 重置連線相關狀態
 */
```

---

## 九、測試策略

### 9.1 Store 測試範例

```typescript
// stores/__tests__/lyricsStore.test.ts
import { renderHook, act } from '@testing-library/react'
import { useLyricsStore } from '../lyricsStore'

describe('LyricsStore', () => {
  beforeEach(() => {
    useLyricsStore.getState().reset()
  })

  it('should set current song', () => {
    const { result } = renderHook(() => useLyricsStore())

    act(() => {
      result.current.setCurrentSong({
        id: '1',
        title: 'Test Song',
        lyrics: ['Line 1', 'Line 2'],
        userId: 'user-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    })

    expect(result.current.currentSong?.title).toBe('Test Song')
    expect(result.current.totalLines).toBe(2)
  })

  it('should increment line index', () => {
    const { result } = renderHook(() => useLyricsStore())

    act(() => {
      result.current.setCurrentSong(mockSong)
      result.current.nextLine()
    })

    expect(result.current.currentLineIndex).toBe(1)
  })

  it('should not increment beyond last line', () => {
    const { result } = renderHook(() => useLyricsStore())

    act(() => {
      result.current.setCurrentSong(mockSong)
      result.current.jumpToLine(1)
      result.current.nextLine()
    })

    expect(result.current.currentLineIndex).toBe(1) // Should stay at last line
  })
})
```

---

## 十、最佳實踐

### 10.1 Do's and Don'ts

```typescript
// ✅ DO: 使用選擇器避免不必要渲染
const currentLyric = useLyricsStore(lyricsSelectors.currentLyric)

// ❌ DON'T: 直接使用會導致所有狀態變化時重渲染
const { currentSong, currentLineIndex } = useLyricsStore()

// ✅ DO: 在組件卸載時清理
useEffect(() => {
  const unsubscribe = useLyricsStore.subscribe(
    (state) => state.currentSong,
    (song) => console.log('Song changed:', song)
  )
  return unsubscribe
}, [])

// ❌ DON'T: 在非 React 環境中使用 hooks
// 使用 getState() 代替
const currentSong = useLyricsStore.getState().currentSong

// ✅ DO: 批次更新狀態
set((state) => ({
  ...state,
  currentLineIndex: newIndex,
  lastUpdate: Date.now(),
}))

// ❌ DON'T: 多次調用 set
set({ currentLineIndex: newIndex })
set({ lastUpdate: Date.now() })
```

---

## 相關文檔

- [核心型別定義](types.md)
- [組件契約](component-contracts.md)
- [API 規格](api.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
