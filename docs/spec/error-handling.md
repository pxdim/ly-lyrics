# 統一錯誤處理規範

## 概述

本文檔定義 LY 系統的統一錯誤處理標準，確保所有層級（前端、後端、AI）的錯誤處理一致性。

---

## 一、錯誤分類體系

### 1.1 錯誤碼結構

```typescript
/**
 * 錯誤碼格式: {MODULE}_{CATEGORY}_{SPECIFIC}
 *
 * 模組前綴:
 * - SONG: 歌曲相關
 * - PLAYLIST: 播放列表相關
 * - SYNC: 同步相關
 * - AI: AI 辨識相關
 * - AUTH: 認證授權相關
 * - NET: 網路相關
 * - SYS: 系統相關
 */

/**
 * 完整錯誤碼清單
 */
export const ERROR_CODES = {
  // ========== 歌曲相關 ==========
  SONG_NOT_FOUND: 'SONG_NOT_FOUND',                    // 歌曲不存在
  SONG_INVALID_FORMAT: 'SONG_INVALID_FORMAT',          // 歌詞格式無效
  SONG_EMPTY_LYRICS: 'SONG_EMPTY_LYRICS',              // 歌詞為空
  SONG_TOO_LONG: 'SONG_TOO_LONG',                      // 歌詞過長

  // ========== 播放列表相關 ==========
  PLAYLIST_NOT_FOUND: 'PLAYLIST_NOT_FOUND',            // 播放列表不存在
  PLAYLIST_EMPTY: 'PLAYLIST_EMPTY',                    // 播放列表為空
  PLAYLIST_DUPLICATE: 'PLAYLIST_DUPLICATE',            // 歌曲已存在

  // ========== 同步相關 ==========
  SYNC_SESSION_NOT_FOUND: 'SYNC_SESSION_NOT_FOUND',     // Session 不存在
  SYNC_SESSION_EXPIRED: 'SYNC_SESSION_EXPIRED',         // Session 已過期
 _SYNC_DISCONNECTED: 'SYNC_DISCONNECTED',               // 連線中斷
  SYNC_RECONNECT_FAILED: 'SYNC_RECONNECT_FAILED',       // 重連失敗
  SYNC_TOO_MANY_DISPLAYS: 'SYNC_TOO_MANY_DISPLAYS',     // 顯示端過多

  // ========== AI 相關 ==========
  AI_MICROPHONE_DENIED: 'AI_MICROPHONE_DENIED',        // 麥克風權限拒絕
  AI_TRANSCRIPTION_FAILED: 'AI_TRANSCRIPTION_FAILED',   // 轉錄失敗
  AI_QUOTA_EXCEEDED: 'AI_QUOTA_EXCEEDED',               // 配額超限
  AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',    // 服務不可用
  AI_LOW_CONFIDENCE: 'AI_LOW_CONFIDENCE',              // 低信心度

  // ========== 認證授權相關 ==========
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',                // 未授權
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',            // Token 過期
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS', // 憑證無效

  // ========== 網路相關 ==========
  NET_NETWORK_ERROR: 'NET_NETWORK_ERROR',              // 網路錯誤
  NET_TIMEOUT: 'NET_TIMEOUT',                          // 請求超時
  NET_RATE_LIMITED: 'NET_RATE_LIMITED',                // 請求過於頻繁

  // ========== 系統相關 ==========
  SYS_INTERNAL_ERROR: 'SYS_INTERNAL_ERROR',            // 內部錯誤
  SYS_UNKNOWN_ERROR: 'SYS_UNKNOWN_ERROR',               // 未知錯誤
} as const

/**
 * 錯誤嚴重等級
 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

/**
 * 錯誤上下文資訊
 */
export interface ErrorContext {
  /** 錯誤發生的位置 */
  location: string

  /** 相關用戶 ID */
  userId?: string

  /** 相關歌曲 ID */
  songId?: string

  /** 相關 Session ID */
  sessionId?: string

  /** 額外的偵錯資訊 */
  metadata?: Record<string, unknown>
}
```

---

## 二、AppError 類別

### 2.1 基礎錯誤類別

```typescript
// lib/errors/AppError.ts

/**
 * 應用程式錯誤基類
 */
export class AppError extends Error {
  constructor(
    public code: keyof typeof ERROR_CODES,
    public userMessage: string,
    public technicalMessage?: string,
    public severity: ErrorSeverity = 'error',
    public context?: ErrorContext
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
      severity: this.severity,
      context: this.context,
    }
  }

  /**
   * 建立錯誤回應
   */
  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.userMessage,
        details: this.context,
      },
      timestamp: Date.now(),
    }
  }
}

/**
 * 錯誤回應格式
 */
export interface ErrorResponse {
  error: {
    code: keyof typeof ERROR_CODES
    message: string
    details?: ErrorContext
  }
  timestamp: number
}
```

### 2.2 專用錯誤類別

```typescript
/**
 * 歌曲相關錯誤
 */
export class SongError extends AppError {
  constructor(code: keyof typeof ERROR_CODES, userMessage: string, context?: ErrorContext) {
    super(code, userMessage, undefined, 'error', context)
    this.name = 'SongError'
  }
}

/**
 * 同步相關錯誤
 */
export class SyncError extends AppError {
  constructor(code: keyof typeof ERROR_CODES, userMessage: string, context?: ErrorContext) {
    super(code, userMessage, undefined, 'warning', context)
    this.name = 'SyncError'
  }
}

/**
 * AI 相關錯誤
 */
export class AiError extends AppError {
  constructor(code: keyof typeof ERROR_CODES, userMessage: string, context?: ErrorContext) {
    super(code, userMessage, undefined, 'info', context) // AI 錯誤不中斷流程
    this.name = 'AiError'
  }
}

/**
 * 網路相關錯誤
 */
export class NetworkError extends AppError {
  constructor(code: keyof typeof ERROR_CODES, userMessage: string, context?: ErrorContext) {
    super(code, userMessage, undefined, 'warning', context)
    this.name = 'NetworkError'
  }
}
```

---

## 三、前端錯誤處理

### 3.1 錯誤邊界組件

```typescript
// components/ErrorBoundary.tsx

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends React.Component<PropsWithChildren, ErrorBoundaryState> {
  constructor(props: PropsWithChildren) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 記錄到錯誤追蹤服務
    logError(error, {
      componentStack: errorInfo.componentStack,
      location: 'ErrorBoundary',
    })
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} reset={() => this.setState({ hasError: false, error: null })} />
    }

    return this.props.children
  }
}

/**
 * 錯誤回饋組件
 */
function ErrorFallback({ error, reset }: { error: Error | null; reset: () => void }) {
  return (
    <div className="error-fallback">
      <h2>哎呀，出了點問題</h2>
      <p>{error?.message || '未知錯誤'}</p>
      <button onClick={reset}>重新載入</button>
    </div>
  )
}
```

### 3.2 Toast 通知系統

```typescript
// hooks/useToast.ts

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])

    if (toast.duration !== 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration || 5000)
    }
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // 錯誤通知
  const showError = useCallback((message: string, context?: ErrorContext) => {
    showToast({
      type: 'error',
      title: '錯誤',
      message,
      duration: 0, // 需要手動關閉
    })
  }, [])

  return { toasts, showToast, showError, removeToast }
}
```

### 3.3 全域錯誤處理

```typescript
// app/layout.tsx

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 處理未捕獲的 Promise rejection
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)

      // 記錄到錯誤追蹤
      logError(event.reason, { location: 'unhandledRejection' })

      // 通知用戶
      if (event.reason?.message) {
        showError('發生錯誤：' + event.reason.message)
      }

      event.preventDefault()
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  return (
    <ErrorBoundary>
      {children}
      <ToastContainer />
    </ErrorBoundary>
  )
}
```

---

## 四、後端錯誤處理

### 4.1 API 錯誤回應格式

```typescript
// app/api/_errors.ts

import { NextResponse } from 'next/server'
import type { ErrorResponse } from '@/spec/types'

/**
 * 建立錯誤回應
 */
export function createErrorResponse(
  code: keyof typeof ERROR_CODES,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
      timestamp: Date.now(),
    },
    { status }
  )
}

/**
 * 常用錯誤回應工廠
 */
export const ErrorResponses = {
  notFound: (resource: string) =>
    createErrorResponse('SONG_NOT_FOUND', `${resource} 不存在`, 404),

  unauthorized: (message = '未授權的存取') =>
    createErrorResponse('AUTH_UNAUTHORIZED', message, 401),

  forbidden: (message = '無權限執行此操作') =>
    createErrorResponse('AUTH_UNAUTHORIZED', message, 403),

  rateLimited: (retryAfter?: number) =>
    createErrorResponse('NET_RATE_LIMITED', '請求過於頻繁', 429, {
      retryAfter,
    }),

  internalError: () =>
    createErrorResponse('SYS_INTERNAL_ERROR', '伺服器錯誤，請稍後再試', 500),

  badRequest: (message = '請求格式錯誤') =>
    createErrorResponse('SONG_INVALID_FORMAT', message, 400),

  serviceUnavailable: (message = '服務暫時無法使用') =>
    createErrorResponse('AI_SERVICE_UNAVAILABLE', message, 503),
}
```

### 4.2 API Route 錯誤處理範例

```typescript
// app/api/songs/[id]/route.ts

import { z } from 'zod'
import { ErrorResponses } from '../_errors'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. 驗證輸入
    const songId = params.id

    // 2. 查詢資料庫
    const song = await getSongById(songId)

    if (!song) {
      return ErrorResponses.notFound('歌曲')
    }

    // 3. 回傳結果
    return NextResponse.json({ data: song })
  } catch (error) {
    console.error('GET /api/songs/[id] error:', error)

    // 處理特定錯誤
    if (error instanceof ValidationError) {
      return ErrorResponses.badRequest(error.message)
    }

    if (error instanceof DatabaseError) {
      return ErrorResponses.internalError()
    }

    // 預設錯誤回應
    return ErrorResponses.internalError()
  }
}
```

---

## 五、WebSocket 錯誤處理

### 5.1 WebSocket 錯誤訊息

```typescript
// lib/websocket/errors.ts

/**
 * WebSocket 錯誤訊息類型
 */
export type WsErrorMessage = WebSocketMessage<{
  code: keyof typeof ERROR_CODES
  message: string
  recoverable: boolean // 是否可恢復
}>

/**
 * 建立 WebSocket 錯誤訊息
 */
export function createWsErrorMessage(
  code: keyof typeof ERROR_CODES,
  message: string,
  recoverable: boolean = false
): WsErrorMessage {
  return {
    type: 'error',
    payload: { code, message, recoverable },
    timestamp: Date.now(),
  }
}

/**
 * 錯誤處理策略
 */
export const WS_ERROR_STRATEGIES: Record<keyof typeof ERROR_CODES, {
  recoverable: boolean
  retry: boolean
  userAction?: string
}> = {
  // 可恢復：重新連線
  _SYNC_DISCONNECTED: {
    recoverable: true,
    retry: true,
    userAction: '正在重新連線...',
  },

  // 可恢復：稍後重試
  _AI_SERVICE_UNAVAILABLE: {
    recoverable: true,
    retry: true,
    userAction: 'AI 服務暫時無法使用，將自動重試',
  },

  // 不可恢復：需要用戶操作
  _AI_QUOTA_EXCEEDED: {
    recoverable: false,
    retry: false,
    userAction: '今日使用次數已達上限',
  },

  // 不可恢復：權限問題
  _AI_MICROPHONE_DENIED: {
    recoverable: false,
    retry: false,
    userAction: '請允許麥克風權限以使用此功能',
  },

  // 其他錯誤
  SONG_NOT_FOUND: {
    recoverable: false,
    retry: false,
    userAction: '歌曲不存在',
  },
}
```

### 5.2 WebSocket 錯誤處理 Hook

```typescript
// hooks/useWebSocketErrorHandler.ts

export function useWebSocketErrorHandler(socket: WebSocket) {
  const { showError } = useToast()

  useEffect(() => {
    socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data)

        // 檢查是否為錯誤訊息
        if (message.type === 'error') {
          const strategy = WS_ERROR_STRATEGIES[message.payload.code]

          // 顯示錯誤訊息
          if (strategy?.userAction) {
            showError(message.payload.message)
          }

          // 可恢復時自動重試
          if (strategy?.retry && strategy?.recoverable) {
            setTimeout(() => {
              // 觸發重連邏輯
            }, 3000)
          }
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error)
      }
    })
  }, [socket])
}
```

---

## 六、AI 錯誤處理

### 6.1 AI 錯誤分類

```typescript
// lib/ai/errors.ts

/**
 * AI 錯誤型別
 */
export type AiErrorType =
  | 'MICROPHONE_DENIED'
  | 'TRANSCRIPTION_FAILED'
  | 'QUOTA_EXCEEDED'
  | 'SERVICE_UNAVAILABLE'
  | 'LOW_CONFIDENCE'
  | 'TIMEOUT'

/**
 * AI 錯誤處理器
 */
export class AiErrorHandler {
  /**
   * 處理 AI 錯誤
   */
  static handle(error: Error, context: { failCount: number }): {
    shouldRetry: boolean
    fallbackMode: 'manual' | 'disabled' | 'none'
    userMessage: string
  } {
    // 根據錯誤類型決定處理方式
    if (error.name === 'NotAllowedError') {
      return {
        shouldRetry: false,
        fallbackMode: 'manual',
        userMessage: '請允許麥克風權限以使用 AI 聽歌功能',
      }
    }

    if (error.message.includes('quota') || error.message.includes('429')) {
      return {
        shouldRetry: false,
        fallbackMode: 'disabled',
        userMessage: '今日 AI 使用次數已用盡，請明天再試或使用手動模式',
      }
    }

    if (error.message.includes('timeout')) {
      const shouldRetry = context.failCount < 2
      return {
        shouldRetry,
        fallbackMode: shouldRetry ? 'none' : 'manual',
        userMessage: shouldRetry ? 'AI 回應較慢，正在重試...' : 'AI 服務回應超時，請稍後再試',
      }
    }

    // 預設處理
    const shouldRetry = context.failCount < 3
    return {
      shouldRetry,
      fallbackMode: shouldRetry ? 'none' : 'manual',
      userMessage: 'AI 辨識失敗' + (shouldRetry ? '，正在重試...' : ''),
    }
  }

  /**
   * 建立使用者友善的錯誤訊息
   */
  static getUserMessage(errorType: AiErrorType): string {
    const messages: Record<AiErrorType, string> = {
      MICROPHONE_DENIED: '請允許麥克風權限以使用 AI 聽歌功能',
      TRANSCRIPTION_FAILED: 'AI 辨識失敗，請稍後再試',
      QUOTA_EXCEEDED: '今日 AI 使用次數已用盡',
      SERVICE_UNAVAILABLE: 'AI 服務暫時無法使用',
      LOW_CONFIDENCE: '無法確定歌詞位置，請手動調整',
      TIMEOUT: 'AI 回應時間過長',
    }

    return messages[errorType] || '發生未知錯誤'
  }
}
```

---

## 七、日誌與監控

### 7.1 錯誤日誌格式

```typescript
// lib/logger.ts

/**
 * 錯誤日誌項目
 */
export interface ErrorLog {
  /** 時間戳 */
  timestamp: number

  /** 錯誤碼 */
  code: keyof typeof ERROR_CODES

  /** 錯誤訊息 */
  message: string

  /** 嚴重等級 */
  severity: ErrorSeverity

  /** 發生位置 */
  location: string

  /** 用戶 ID */
  userId?: string

  /** Session ID */
  sessionId?: string

  /** 堆疊資訊 */
  stack?: string

  /** 額外資訊 */
  metadata?: Record<string, unknown>
}

/**
 * 記錄錯誤
 */
export async function logError(error: Error, context?: ErrorContext): Promise<void> {
  const log: ErrorLog = {
    timestamp: Date.now(),
    code: (error as any).code || 'SYS_UNKNOWN_ERROR',
    message: error.message,
    severity: 'error',
    location: context?.location || 'unknown',
    userId: context?.userId,
    sessionId: context?.sessionId,
    stack: error.stack,
    metadata: context?.metadata,
  }

  // 1. Console (開發環境)
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', log)
  }

  // 2. 發送到監控服務 (生產環境)
  if (process.env.NODE_ENV === 'production') {
    await sendToMonitoring(log)
  }

  // 3. 儲存到 LocalStorage (除錯用)
  if (typeof window !== 'undefined') {
    const recentErrors = JSON.parse(localStorage.getItem('recentErrors') || '[]')
    recentErrors.unshift(log)
    localStorage.setItem('recentErrors', JSON.stringify(recentErrors.slice(0, 50)))
  }
}

/**
 * 發送到監控服務
 */
async function sendToMonitoring(log: ErrorLog): Promise<void> {
  // TODO: 整合 Sentry 或其他監控服務
  // await Sentry.captureException(log)
}
```

---

## 八、測試覆蓋

### 8.1 錯誤處理測試

```typescript
// __tests__/lib/errors/AppError.test.ts

import { AppError, SongError, SyncError } from '@/lib/errors/AppError'

describe('AppError', () => {
  it('should create error with code and message', () => {
    const error = new AppError('SONG_NOT_FOUND', '歌曲不存在')

    expect(error.code).toBe('SONG_NOT_FOUND')
    expect(error.userMessage).toBe('歌曲不存在')
    expect(error.severity).toBe('error')
  })

  it('should convert to response format', () => {
    const error = new AppError('SONG_NOT_FOUND', '歌曲不存在')

    const response = error.toResponse()

    expect(response).toHaveProperty('error')
    expect(response.error).toHaveProperty('code', 'SONG_NOT_FOUND')
    expect(response).toHaveProperty('timestamp')
  })

  it('should include context in response', () => {
    const error = new AppError('SONG_NOT_FOUND', '歌曲不存在', undefined, 'error', {
      userId: 'user-123',
      songId: 'song-456',
    })

    const response = error.toResponse()

    expect(response.error.details).toEqual({
      userId: 'user-123',
      songId: 'song-456',
    })
  })
})

describe('SongError', () => {
  it('should have correct severity', () => {
    const error = new SongError('SONG_NOT_FOUND', '歌曲不存在')

    expect(error.severity).toBe('error')
    expect(error.name).toBe('SongError')
  })
})
```

---

## 九、錯誤處理檢查清單

### 9.1 開發檢查清單

```markdown
## 錯誤處理實作檢查清單

### 前端
- [ ] ErrorBoundary 包裹根組件
- [ ] unhandledrejection 監聽
- [ ] Toast 通知系統
- [ ] 錯誤頁面 (fallback)
- [ ] 載入狀態顯示

### 後端 API
- [ ] 統一錯誤回應格式
- [ ] try-catch 包裹所有路由
- [ ] 錯誤日誌記錄
- [ ] 適當的 HTTP 狀態碼
- [ ] 錯誤訊息不洩漏系統資訊

### WebSocket
- [ ] 錯誤訊息協議
- [ ] 可恢復錯誤自動重試
- [ ] 不可恢復錯誤提示用戶
- [ ] 錯誤狀態同步

### AI
- [ ] 麥克風權限錯誤處理
- [ ] API 失敗重試機制
- [ ] 配額超限提示
- [ ] 低信心度確認
- [ ] 降級到手動模式

### 日誌
- [ ] 統一日誌格式
- [ ] 開發環境 console 輸出
- [ ] 生產環境監控服務整合
- [ ] 敏感資訊過濾
```

---

## 相關文檔

- [核心型別定義](types.md)
- [邊緣情況處理](edge-cases.md)
- [AI 整合規格](ai-integration.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
