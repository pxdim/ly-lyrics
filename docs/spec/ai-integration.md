# AI 整合規格

## 概述

本文檔定義 LY 系統與 Google Gemini API 的整合規格，包含：
1. Prompt 模板設計
2. API 調用策略
3. 錯誤處理與降級
4. 成本控制機制
5. 歌詞比對演算法

---

## 一、AI 整合架構

### 1.1 系統架構

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (瀏覽器)                        │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ 麥克風錄音   │───▶│ 音訊處理     │───▶│ 歌詞比對   │ │
│  │ (MediaStream)│    │ (前端)       │    │ (前端)     │ │
│  └──────────────┘    └──────────────┘    └────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    後端 (API Route)                     │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────┐ │
│  │ 音訊接收     │───▶│ Gemini API   │───▶│ 結果處理   │ │
│  │ (/api/ai)    │    │ 整合層      │    │ (回傳前端) │ │
│  └──────────────┘    └──────────────┘    └────────────┘ │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Gemini API   │
                    │ (Google)     │
                    └──────────────┘
```

### 1.2 數據流程

```
1. 用戶啟動 AI 聽歌
   │
   ▼
2. 前端請求麥克風權限
   │
   ▼
3. 每 3 秒錄製 5 秒音訊片段
   │
   ▼
4. 發送到 /api/ai/listen
   │
   ▼
5. 後端調用 Gemini API 轉錄
   │
   ▼
6. 前端接收轉錄文字
   │
   ▼
7. 本地比對歌詞 (模糊匹配)
   │
   ▼
8. 更新 currentLineIndex
   │
   ▼
9. 透過 WebSocket 同步到顯示端
```

---

## 二、Gemini API 整合

### 2.1 API 設定

```typescript
// lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * Gemini 配置
 */
const GEMINI_CONFIG = {
  // 使用的模型
  model: 'gemini-2.0-flash-exp', // 或 'gemini-2.5-pro-exp'

  // API 端點
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',

  // 請求限制
  maxRetries: 3,
  timeout: 10000, // 10 秒

  // 音訊設定
  audio: {
    encoding: 'WEBM_OPUS', // 或 'LINEAR16'
    sampleRateHertz: 16000,
    languageCode: 'zh-TW', // 根據歌曲語言動態調整
  },
}

/**
 * 建立 Gemini 客戶端
 */
export function createGeminiClient(apiKey: string) {
  return new GoogleGenerativeAI(apiKey)
}
```

### 2.2 音訊轉錄 API

```typescript
/**
 * 音訊轉錄請求
 */
export interface TranscribeAudioRequest {
  /** 音訊資料 (Base64 或 Buffer) */
  audioData: Buffer | string

  /** 語言代碼 */
  language: string

  /** 可選：提示文字 (提高準確度) */
  prompt?: string
}

/**
 * 音訊轉錄回應
 */
export interface TranscribeAudioResponse {
  /** 轉錄文字 */
  text: string

  /** 信心度 (0-1) */
  confidence: number

  /** 使用的語言 */
  language: string

  /** 處理時間 (ms) */
  processingTime: number
}

/**
 * 轉錄音訊
 *
 * @param request - 轉錄請求
 * @returns 轉錄結果
 */
export async function transcribeAudio(
  request: TranscribeAudioRequest
): Promise<TranscribeAudioResponse> {
  const startTime = Date.now()

  try {
    const client = createGeminiClient(process.env.GEMINI_API_KEY!)
    const model = client.getGenerativeModel({
      model: GEMINI_CONFIG.model,
    })

    // 準備請求
    const prompt = request.prompt || buildTranscriptionPrompt(request.language)

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'audio/webm',
          data: request.audioData.toString('base64'),
        },
      },
      prompt,
    ])

    const text = result.response.text()
    const processingTime = Date.now() - startTime

    return {
      text: text.trim(),
      confidence: 0.8, // Gemini 不提供信心度，使用預設值
      language: request.language,
      processingTime,
    }
  } catch (error) {
    throw new GeminiApiError('Transcription failed', error)
  }
}
```

### 2.3 Prompt 模板

```typescript
/**
 * 建立轉錄 Prompt
 */
function buildTranscriptionPrompt(language: string): string {
  const prompts: Record<string, string> = {
    'zh-TW': '請轉錄這段音訊中的歌詞。只輸出歌詞文字，不要輸出任何解釋或標點符號。',
    'zh-CN': '请转录这段音频中的歌词。只输出歌词文字，不要输出任何解释或标点符号。',
    'en': 'Transcribe the lyrics from this audio. Output only the lyrics text, no explanations or punctuation.',
    'ja': 'この音声から歌詞を転写してください。歌詞のみを出力し、説明や句読点は出力しないでください。',
  }

  return prompts[language] || prompts['zh-TW']
}

/**
 * 歌詞比對 Prompt
 */
export const LYRIC_MATCHING_PROMPT = `
你是一個專業的歌詞識別助手。

**任務：**
分析音訊轉文字內容，從提供的歌詞列表中找出最匹配的行。

**輸入格式：**
- 音訊內容：{transcript}
- 候選歌詞：{lyrics}

**匹配規則：**
1. 完全相同匹配優先
2. 部分相同次之（考慮同音字、錯字）
3. 語意相似再次之

**輸出格式（JSON）：**
\`\`\`json
{
  "matched_line": <行索引，從 0 開始，如果無匹配則為 -1>,
  "confidence": <信心度 0-1>,
  "reasoning": "<簡短說明匹配理由>"
}
\`\`\`

**範例：**
音訊：「你好世界」
歌詞：["你好世界", "這是測試", "再見"]

輸出：
\`\`\`json
{
  "matched_line": 0,
  "confidence": 1.0,
  "reasoning": "完全匹配"
}
\`\`\`
`

/**
 * 多語言歌詞比對 Prompt
 */
export const MULTILINGUAL_LYRIC_PROMPT = `
你是一個專業的多語言歌詞識別助手。

**任務：**
從混合語言的歌詞中找出最匹配的行。

**特殊處理：**
- 支援中英混合
- 支援拼音/英文諧音
- 支援簡繁轉換

**輸出格式同上**
`
```

---

## 三、歌詞比對演算法

### 3.1 前端比對策略

```typescript
// lib/lyricMatcher.ts

/**
 * 歌詞比對選項
 */
export interface MatchOptions {
  /** 是否啟用模糊匹配 */
  enableFuzzyMatch: boolean

  /** 模糊匹配閾值 (0-1) */
  fuzzyThreshold: number

  /** 是否啟用拼音匹配 (中文) */
  enablePinyin: boolean

  /** 是否忽略標點符號 */
  ignorePunctuation: boolean

  /** 是否忽略空格 */
  ignoreSpaces: boolean
}

/**
 * 比對結果
 */
export interface MatchResult {
  /** 匹配的行索引 */
  lineIndex: number

  /** 信心度 (0-1) */
  confidence: number

  /** 匹配的歌詞內容 */
  matchedLyric: string

  /** 匹配類型 */
  matchType: 'exact' | 'fuzzy' | 'partial' | 'none'
}

/**
 * 從歌詞列表中匹配文字
 *
 * @param transcript - 轉錄文字
 * @param lyrics - 歌詞列表
 * @param options - 匹配選項
 * @returns 匹配結果
 */
export function matchLyric(
  transcript: string,
  lyrics: string[],
  options: MatchOptions = {}
): MatchResult {
  const {
    enableFuzzyMatch = true,
    fuzzyThreshold = 0.7,
    ignorePunctuation = true,
    ignoreSpaces = true,
  } = options

  // 預處理輸入
  const normalizedTranscript = normalizeText(transcript, { ignorePunctuation, ignoreSpaces })

  let bestMatch: MatchResult = {
    lineIndex: -1,
    confidence: 0,
    matchedLyric: '',
    matchType: 'none',
  }

  // 1. 完全匹配
  for (let i = 0; i < lyrics.length; i++) {
    const normalizedLyric = normalizeText(lyrics[i], { ignorePunctuation, ignoreSpaces })

    if (normalizedTranscript === normalizedLyric) {
      return {
        lineIndex: i,
        confidence: 1.0,
        matchedLyric: lyrics[i],
        matchType: 'exact',
      }
    }
  }

  if (!enableFuzzyMatch) {
    return bestMatch
  }

  // 2. 模糊匹配 (Levenshtein 距離)
  for (let i = 0; i < lyrics.length; i++) {
    const normalizedLyric = normalizeText(lyrics[i], { ignorePunctuation, ignoreSpaces })
    const similarity = calculateSimilarity(normalizedTranscript, normalizedLyric)

    if (similarity > bestMatch.confidence && similarity >= fuzzyThreshold) {
      bestMatch = {
        lineIndex: i,
        confidence: similarity,
        matchedLyric: lyrics[i],
        matchType: similarity > 0.9 ? 'fuzzy' : 'partial',
      }
    }
  }

  return bestMatch
}

/**
 * 計算兩個字串的相似度 (0-1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2)
  const maxLength = Math.max(str1.length, str2.length)

  if (maxLength === 0) return 1.0

  return 1 - distance / maxLength
}

/**
 * Levenshtein 距離演算法
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(0))

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      )
    }
  }

  return matrix[str2.length][str1.length]
}

/**
 * 正規化文字
 */
function normalizeText(
  text: string,
  options: { ignorePunctuation?: boolean; ignoreSpaces?: boolean }
): string {
  let result = text

  // 移除標點符號
  if (options.ignorePunctuation) {
    result = result.replace(/[^\w\s\u4e00-\u9fff]/g, '')
  }

  // 移除空格
  if (options.ignoreSpaces) {
    result = result.replace(/\s+/g, '')
  }

  return result.toLowerCase()
}
```

---

## 四、API Route 實作

### 4.1 POST /api/ai/listen

```typescript
// app/api/ai/listen/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { transcribeAudio } from '@/lib/gemini'
import { rateLimit } from '@/lib/rate-limit'

/**
 * AI 聽歌 API
 *
 * POST /api/ai/listen
 *
 * Request Body:
 * {
 *   audioData: string (Base64)
 *   language: string
 *   lyrics: string[] (可選，用於比對)
 * }
 *
 * Response:
 * {
 *   transcript: string
 *   matchResult?: MatchResult
 *   confidence: number
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting
    const rateLimitResult = await rateLimit({
      key: 'ai-listen',
      limit: 10, // 每分鐘 10 次
      window: 60,
    })

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'RATE_LIMIT_EXCEEDED', message: '請求過於頻繁，請稍後再試' },
        { status: 429 }
      )
    }

    // 2. 解析請求
    const body = await request.json()
    const { audioData, language, lyrics } = body

    if (!audioData) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: '缺少音訊資料' },
        { status: 400 }
      )
    }

    // 3. 轉錄音訊
    const transcriptResult = await transcribeAudio({
      audioData: Buffer.from(audioData, 'base64'),
      language: language || 'zh-TW',
    })

    // 4. 可選：歌詞比對
    let matchResult = null
    if (lyrics && lyrics.length > 0) {
      matchResult = matchLyric(transcriptResult.text, lyrics, {
        enableFuzzyMatch: true,
        fuzzyThreshold: 0.6,
      })
    }

    // 5. 回傳結果
    return NextResponse.json({
      transcript: transcriptResult.text,
      matchResult,
      confidence: transcriptResult.confidence,
      processingTime: transcriptResult.processingTime,
    })
  } catch (error) {
    console.error('AI listen error:', error)

    return NextResponse.json(
      {
        error: 'AI_API_FAILED',
        message: 'AI 辨識失敗，請稍後再試',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    )
  }
}
```

---

## 五、前端音訊錄製

### 5.1 音訊錄製 Hook

```typescript
// hooks/useAudioRecorder.ts
import { useState, useRef, useCallback } from 'react'

/**
 * 音訊錄製選項
 */
export interface AudioRecorderOptions {
  /** 錄製持續時間 (ms) */
  duration: number

  /** 採樣率 */
  sampleRate: number

  /** 是否使用噪音抑制 */
  noiseSuppression: boolean

  /** 是否使用回聲消除 */
  echoCancellation: boolean
}

/**
 * 音訊錄製 Hook
 */
export function useAudioRecorder(options: AudioRecorderOptions) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  /** 開始錄製 */
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: options.sampleRate,
          noiseSuppression: options.noiseSuppression,
          echoCancellation: options.echoCancellation,
        },
      })

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      })

      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setIsRecording(false)

        // 停止所有音軌
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)

      // 自動停止
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop()
        }
      }, options.duration)
    } catch (error) {
      console.error('Microphone access error:', error)
      throw new Error('無法存取麥克風')
    }
  }, [options])

  /** 停止錄製 */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  /** 取消錄製 */
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
      setAudioBlob(null)
    }
  }, [])

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
```

### 5.2 AI 聽歌 Hook

```typescript
// hooks/useAiListening.ts
import { useState, useCallback, useRef } from 'react'
import { useAudioRecorder } from './useAudioRecorder'
import { useLyricsStore } from '@/stores/lyricsStore'

/**
 * AI 聽歌 Hook
 */
export function useAiListening() {
  const { currentSong, currentLineIndex, updateAiResult, setAiError } = useLyricsStore()
  const [isListening, setIsListening] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const { audioBlob, startRecording, stopRecording } = useAudioRecorder({
    duration: 5000, // 錄製 5 秒
    sampleRate: 16000,
    noiseSuppression: true,
    echoCancellation: true,
  })

  /** 啟動 AI 聽歌 */
  const startListening = useCallback(() => {
    if (!currentSong) {
      setAiError('請先選擇一首歌')
      return
    }

    setIsListening(true)
    setAiError(null)

    // 每 3 秒錄製一次
    intervalRef.current = setInterval(async () => {
      if (!isListening) return

      setIsProcessing(true)

      try {
        // 1. 開始錄製
        await startRecording()

        // 等待錄製完成 (由 useAudioRecorder 自動處理)
        await new Promise((resolve) => setTimeout(resolve, 5100))

        // 2. 發送到後端
        if (audioBlob) {
          const arrayBuffer = await audioBlob.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')

          const response = await fetch('/api/ai/listen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              audioData: base64,
              language: currentSong.language || 'zh-TW',
              lyrics: currentSong.lyrics,
            }),
          })

          const data = await response.json()

          if (data.matchResult && data.matchResult.confidence > 0.6) {
            // 3. 更新歌詞位置
            updateAiResult({
              lineIndex: data.matchResult.lineIndex,
              confidence: data.matchResult.confidence,
              transcript: data.transcript,
            })
          }
        }
      } catch (error) {
        console.error('AI listening error:', error)
        setAiError('AI 辨識失敗')
      } finally {
        setIsProcessing(false)
      }
    }, 3000)
  }, [currentSong, isListening])

  /** 停止 AI 聽歌 */
  const stopListening = useCallback(() => {
    setIsListening(false)
    setIsProcessing(false)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  return {
    isListening,
    isProcessing,
    startListening,
    stopListening,
  }
```

---

## 六、錯誤處理與降級

### 6.1 錯誤類型

```typescript
/**
 * Gemini API 錯誤
 */
export class GeminiApiError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'GeminiApiError'
  }
}

/**
 * 錯誤處理策略
 */
export const ERROR_HANDLING_STRATEGIES = {
  /** 網路錯誤：重試 3 次 */
  NETWORK_ERROR: {
    retry: true,
    maxRetries: 3,
    retryDelay: 1000,
    fallback: 'manual',
  },

  /** API 超時：增加超時時間後重試 */
  TIMEOUT_ERROR: {
    retry: true,
    maxRetries: 1,
    increaseTimeout: true,
    fallback: 'manual',
  },

  /** 配額超限：停止 AI 功能 */
  QUOTA_EXCEEDED: {
    retry: false,
    fallback: 'disabled',
    userMessage: 'AI 使用次數已達上限，請明天再試',
  },

  /** 無效請求：不重試 */
  INVALID_REQUEST: {
    retry: false,
    fallback: 'manual',
  },

  /** 服務不可用：降級為手動模式 */
  SERVICE_UNAVAILABLE: {
    retry: true,
    maxRetries: 2,
    fallback: 'manual',
    userMessage: 'AI 服務暫時無法使用，請使用手動模式',
  },
}
```

### 6.2 降級策略

```typescript
/**
 * 處理 AI 錯誤並降級
 */
export async function handleAiError(
  error: Error,
  context: {
    retryCount: number
    maxRetries: number
  }
): Promise<{
  shouldRetry: boolean
  fallbackMode: 'manual' | 'disabled' | 'none'
  userMessage?: string
}> {
  // 判斷錯誤類型
  let errorType = 'UNKNOWN'

  if (error.message.includes('network') || error.message.includes('fetch')) {
    errorType = 'NETWORK_ERROR'
  } else if (error.message.includes('timeout')) {
    errorType = 'TIMEOUT_ERROR'
  } else if (error.message.includes('quota') || error.message.includes('429')) {
    errorType = 'QUOTA_EXCEEDED'
  }

  const strategy = ERROR_HANDLING_STRATEGIES[errorType] || ERROR_HANDLING_STRATEGIES.UNKNOWN

  // 決定是否重試
  const shouldRetry = strategy.retry && context.retryCount < (strategy.maxRetries || 0)

  return {
    shouldRetry,
    fallbackMode: strategy.fallback,
    userMessage: strategy.userMessage,
  }
}
```

---

## 七、成本控制

### 7.1 使用量追蹤

```typescript
// lib/aiQuota.ts

/**
 * AI 使用量追蹤
 */
export interface AiQuota {
  /** 今日使用次數 */
  dailyUsage: number

  /** 上次重置日期 */
  lastResetDate: string

  /** 每日限制 */
  dailyLimit: number
}

/**
 * 檢查是否可以調用 AI
 */
export async function canUseAi(): Promise<boolean> {
  // 從 LocalStorage 讀取
  const quota = getQuota()

  // 檢查是否需要重置
  resetQuotaIfNeeded(quota)

  // 檢查是否超限
  return quota.dailyUsage < quota.dailyLimit
}

/**
 * 記錄 AI 使用
 */
export async function recordAiUsage(): Promise<void> {
  const quota = getQuota()
  quota.dailyUsage += 1
  saveQuota(quota)

  // 同步到後端
  await fetch('/api/user/ai-usage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 1 }),
  })
}

/**
 * 重置配額 (新的一天)
 */
function resetQuotaIfNeeded(quota: AiQuota): void {
  const today = new Date().toDateString()

  if (quota.lastResetDate !== today) {
    quota.dailyUsage = 0
    quota.lastResetDate = today
    saveQuota(quota)
  }
}
```

### 7.2 使用量顯示

```typescript
/**
 * AI 使用量狀態
 */
export interface AiUsageStatus {
  /** 今日已使用次數 */
  used: number

  /** 每日限制 */
  limit: number

  /** 剩餘次數 */
  remaining: number

  /** 是否即將用盡 */
  isLow: boolean

  /** 是否已用盡 */
  isExhausted: boolean
}

/**
 * 取得使用量狀態
 */
export function getAiUsageStatus(): AiUsageStatus {
  const quota = getQuota()
  const remaining = quota.dailyLimit - quota.dailyUsage

  return {
    used: quota.dailyUsage,
    limit: quota.dailyLimit,
    remaining,
    isLow: remaining < 100, // 少於 100 次
    isExhausted: remaining <= 0,
  }
}
```

---

## 八、效能優化

### 8.1 前端優化

```typescript
/**
 * 效能優化策略
 *
 * 1. 錄製間隔：
 *    - 預設：3 秒
 *    - 可調整：2-5 秒
 *    - 較短間隔 = 更即時但更多 API 調用
 *
 * 2. 錄製持續時間：
 *    - 預設：5 秒
 *    - 足夠覆蓋一句歌詞
 *    - 避免過長導致延遲
 *
 * 3. 音訊壓縮：
 *    - 使用 Opus 編碼
 *    - 採樣率 16kHz (語音足夠)
 *    - 降低資料傳輸量
 *
 * 4. 快取策略：
 *    - 記錄最近一次的匹配結果
 *    - 重複內容不重新匹配
 */
```

### 8.2 後端優化

```typescript
/**
 * 後端優化策略
 *
 * 1. 請求佇列：
 *    - 使用 Redis 佇列處理請求
 *    - 避免同時發起過多 API 調用
 *
 * 2. 批次處理：
 *    - 合併短時間內的多個請求
 *    - 減少 API 調用次數
 *
 * 3. 快取：
 *    - 快取常見歌詞的匹配結果
 *    - 使用 Redis，TTL 1 小時
 *
 * 4. 預熱：
 *    - 定期 ping API 保持連線
 *    - 避免冷啟動延遲
 */
```

---

## 九、測試策略

### 9.1 單元測試

```typescript
// __tests__/lib/lyricMatcher.test.ts
import { matchLyric } from '@/lib/lyricMatcher'

describe('matchLyric', () => {
  const lyrics = ['你好世界', '這是測試', '再見明天']

  it('should match exact lyric', () => {
    const result = matchLyric('你好世界', lyrics)

    expect(result.lineIndex).toBe(0)
    expect(result.confidence).toBe(1.0)
    expect(result.matchType).toBe('exact')
  })

  it('should match fuzzy lyric', () => {
    const result = matchLyric('你好世介', lyrics, { enableFuzzyMatch: true })

    expect(result.lineIndex).toBe(0)
    expect(result.confidence).toBeGreaterThan(0.7)
  })

  it('should return no match for different text', () => {
    const result = matchLyric('完全不相關的歌詞', lyrics)

    expect(result.lineIndex).toBe(-1)
    expect(result.matchType).toBe('none')
  })
})
```

### 9.2 整合測試

```typescript
// __tests__/api/ai/listen.test.ts
import { POST } from '@/app/api/ai/listen/route'

describe('POST /api/ai/listen', () => {
  it('should transcribe audio', async () => {
    const request = new Request('http://localhost/api/ai/listen', {
      method: 'POST',
      body: JSON.stringify({
        audioData: 'base64EncodedAudio',
        language: 'zh-TW',
      }),
    })

    const response = await POST(request as any)

    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data).toHaveProperty('transcript')
  })

  it('should enforce rate limit', async () => {
    // 快速發送 11 個請求 (限制為 10)
    const requests = Array.from({ length: 11 }, (_, i) =>
      POST(new Request(`http://localhost/api/ai/listen?t=${i}`, {
        method: 'POST',
        body: JSON.stringify({ audioData: 'data' }),
      }) as any)
    )

    const responses = await Promise.all(requests)

    // 至少有一個被 rate limited
    const rateLimited = responses.some((r) => r.status === 429)
    expect(rateLimited).toBe(true)
  })
})
```

---

## 十、監控與日誌

### 10.1 監控指標

```typescript
/**
 * 監控指標
 *
 * 1. API 調用次數：
 *    - 每日總調用次數
 *    - 每小時調用次數
 *    - 峰值時段
 *
 * 2. 效能指標：
 *    - 平均回應時間
 *    - P95 回應時間
 *    - 超時率
 *
 * 3. 準確度指標：
 *    - 平均信心度
 *    - 低信心度比例
 *    - 手動校正次數
 *
 * 4. 錯誤指標：
 *    - 錯誤類型分佈
 *    - 錯誤率趨勢
 *    - 重試次數分佈
 */
```

### 10.2 日誌格式

```typescript
/**
 * AI 調用日誌
 */
export interface AiCallLog {
  /** 時間戳 */
  timestamp: number

  /** 用戶 ID */
  userId: string

  /** 歌曲 ID */
  songId: string

  /** 語言 */
  language: string

  /** 音訊長度 (bytes) */
  audioSize: number

  /** 轉錄結果 */
  transcript: string

  /** 匹配結果 */
  matchResult: {
    lineIndex: number
    confidence: number
  } | null

  /** 處理時間 (ms) */
  processingTime: number

  /** 是否成功 */
  success: boolean

  /** 錯誤訊息 (如有) */
  error?: string
}
```

---

## 相關文檔

- [核心型別定義](types.md)
- [狀態管理](state-management.md)
- [API 規格](api.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
