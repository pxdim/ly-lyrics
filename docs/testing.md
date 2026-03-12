# 測試計劃

## 測試策略

LY 系統採用 **Testing Pyramid** 策略，多層次確保品質。

```
        ┌─────────┐
        │   E2E   │  少量關鍵流程
        │  Tests  │  (Playwright)
        ├─────────┤
        │Integration│  中等數量
        │  Tests   │  (API 測試)
        ├─────────┤
        │  Unit    │  大量
        │  Tests   │  (Vitest)
        └─────────┘
```

---

## 測試工具

| 類型 | 工具 | 用途 |
|------|------|------|
| 單元測試 | Vitest | 快速測試組件與函數 |
| 組件測試 | Vitest + RTL | React 組件測試 |
| E2E 測試 | Playwright | 完整使用者流程測試 |
| API 測試 | Vitest + Supertest | API 端點測試 |
| 型別檢查 | TypeScript | 型別安全檢查 |
| Lint | ESLint | 程式碼規範檢查 |

---

## 測試案例

### Unit Tests (單元測試)

#### UT1: 歌詞處理

```typescript
// __tests__/lib/lyricsProcessor.test.ts
describe('LyricsProcessor', () => {
  test('應將文字歌詞轉為陣列', () => {
    const input = '第一句\n第二句\n第三句'
    const output = parseLyrics(input)
    expect(output).toEqual(['第一句', '第二句', '第三句'])
  })

  test('應正確解析 LRC 格式', () => {
    const input = '[00:12.34]第一句\n[00:16.78]第二句'
    const output = parseLRC(input)
    expect(output[0].time).toBe(12.34)
    expect(output[0].text).toBe('第一句')
  })

  test('應處理空行', () => {
    const input = '第一句\n\n第二句'
    const output = parseLyrics(input)
    expect(output).toEqual(['第一句', '第二句'])
  })
})
```

#### UT2: 狀態管理

```typescript
// __tests__/stores/lyricsStore.test.ts
describe('LyricsStore', () => {
  test('應更新當前歌詞行', () => {
    const store = createLyricsStore()
    store.setState({ lyrics: ['A', 'B', 'C'], currentLineIndex: 0 })

    act(() => store.getState().nextLine())

    expect(store.getState().currentLineIndex).toBe(1)
  })

  test('不應超出歌詞範圍', () => {
    const store = createLyricsStore()
    store.setState({ lyrics: ['A', 'B'], currentLineIndex: 1 })

    act(() => store.getState().nextLine())

    expect(store.getState().currentLineIndex).toBe(1) // 不變
  })
})
```

#### UT3: AI 歌詞比對

```typescript
// __tests__/lib/ai/lyricMatcher.test.ts
describe('LyricMatcher', () => {
  test('應正確匹配完全相同的歌詞', () => {
    const lyrics = ['你好世界', '這是測試']
    const result = matchLyric('你好世界', lyrics)
    expect(result.index).toBe(0)
    expect(result.confidence).toBeGreaterThan(0.9)
  })

  test('應處理相似但不完全相同的歌詞', () => {
    const lyrics = ['你好世界', '這是測試']
    const result = matchLyric('你好世介', lyrics) // 錯字
    expect(result.index).toBe(0)
    expect(result.confidence).toBeGreaterThan(0.7)
  })
})
```

---

### Integration Tests (整合測試)

#### IT1: API 整合

```typescript
// __tests__/api/songs.test.ts
describe('Songs API', () => {
  test('POST /api/songs 應創建新歌曲', async () => {
    const response = await app.request('/api/songs', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: '測試歌曲',
        lyrics: '第一句\n第二句'
      })
    })

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.data.title).toBe('測試歌曲')
  })

  test('GET /api/songs 應返回歌曲列表', async () => {
    const response = await app.request('/api/songs', {
      headers: { Authorization: `Bearer ${token}` }
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(Array.isArray(data.data)).toBe(true)
  })
})
```

#### IT2: WebSocket 整合

```typescript
// __tests__/websocket/sync.test.ts
describe('WebSocket Sync', () => {
  test('控制端發送 next_line，顯示端應收到', async () => {
    const controllerSocket = await connectSocket('controller')
    const displaySocket = await connectSocket('display')

    const promise = new Promise((resolve) => {
      displaySocket.on('line_changed', resolve)
    })

    controllerSocket.emit('next_line')

    const result = await promise
    expect(result.lineIndex).toBeDefined()
  })
})
```

#### IT3: WebSocket 連線中斷處理

```typescript
// __tests__/websocket/reconnection.test.ts
describe('WebSocket 重連機制', () => {
  test('控制端斷線後重連，狀態應恢復', async () => {
    const store = createLyricsStore()
    store.setState({
      currentSong: mockSong,
      currentLineIndex: 5
    })

    const socket = await connectSocket('controller')

    // 模擬斷線
    socket.disconnect()

    // 模擬重連
    await socket.connect()

    // 驗證狀態恢復
    const stateMsg = await waitForMessage('session_state')
    expect(stateMsg.currentLineIndex).toBe(5)
  })

  test('顯示端斷線，控制端應繼續運作', async () => {
    const controllerSocket = await connectSocket('controller')
    const displaySocket = await connectSocket('display')

    // 斷開顯示端
    displaySocket.disconnect()

    // 控制端發送訊息不應報錯
    await expect(async () => {
      controllerSocket.emit('next_line')
    }).not.toThrow()
  })

  test('弱網路環境下的訊息去重', async () => {
    const displaySocket = await connectSocket('display')
    const receivedMessages: string[] = []

    displaySocket.on('line_changed', (msg) => {
      receivedMessages.push(msg.messageId)
    })

    // 模擬收到重複訊息
    const duplicateMsg = { messageId: 'msg-123', lineIndex: 5 }
    displaySocket.emit('line_changed', duplicateMsg)
    displaySocket.emit('line_changed', duplicateMsg)

    // 驗證只處理一次
    expect(receivedMessages.filter(id => id === 'msg-123').length).toBe(1)
  })
})
```

#### IT4: 多裝置並發測試

```typescript
// __tests__/websocket/multi-device.test.ts
describe('多裝置並發', () => {
  test('10 台裝置同時連線應正常運作', async () => {
    const controller = await connectSocket('controller')
    const displays: WebSocket[] = []

    // 建立多個顯示端
    for (let i = 0; i < 10; i++) {
      displays.push(await connectSocket('display'))
    }

    // 控制端發送訊息
    controller.emit('next_line')

    // 所有顯示端都應收到
    const promises = displays.map(d =>
      new Promise(resolve => d.once('line_changed', resolve))
    )

    await expect(Promise.all(promises)).resolves.toHaveLength(10)
  })

  test('訊息順序保證', async () => {
    const display = await connectSocket('display')
    const receivedOrder: number[] = []

    display.on('line_changed', (msg) => {
      receivedOrder.push(msg.lineIndex)
    })

    // 快速連續發送多個訊息
    for (let i = 0; i < 10; i++) {
      controller.emit('set_line', { lineIndex: i })
    }

    // 等待所有訊息
    await new Promise(resolve => setTimeout(resolve, 500))

    // 驗證順序正確 (使用 timestamp 排序)
    expect(receivedOrder).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
```

#### IT5: AI 整合測試

```typescript
// __tests__/ai/integration.test.ts
describe('AI 歌詞辨識整合', () => {
  test('完整聽歌辨識流程', async () => {
    const mockAudioBuffer = createMockAudioBuffer()

    const response = await fetch('/api/ai/listen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioData: mockAudioBuffer,
        sessionId: 'test-session',
        lyrics: ['第一句', '第二句', '第三句']
      })
    })

    const result = await response.json()

    expect(result.matchedLine).toBeGreaterThanOrEqual(0)
    expect(result.confidence).toBeGreaterThan(0)
  })

  test('低信心度應觸發確認對話框', async () => {
    const lowConfidenceResult = {
      matchedLine: 2,
      confidence: 0.4,
      transcript: '聽到的內容'
    }

    // 模擬低信心度回應
    const shouldConfirm = isLowConfidence(lowConfidenceResult.confidence)

    expect(shouldConfirm).toBe(true)
  })

  test('API 限流處理', async () => {
    const promises = []

    // 快速發送多個請求
    for (let i = 0; i < 5; i++) {
      promises.push(fetch('/api/ai/listen', {
        method: 'POST',
        body: JSON.stringify({ audioData: 'mock' })
      }))
    }

    const results = await Promise.all(promises)

    // 至少有一個請應被限流
    const rateLimited = results.some(r => r.status === 429)
    expect(rateLimited).toBe(true)
  })
})
```

---

## AI 測試案例

### AI 單元測試

#### AI-UT1: 音訊處理

```typescript
// __tests__/lib/audio/audioProcessor.test.ts
describe('AudioProcessor', () => {
  test('應正確轉換音訊為 WebSocket 格式', () => {
    const processor = new AudioProcessor()
    const mockStream = createMockMediaStream()

    const chunks = processor.convertToChunks(mockStream)

    expect(chunks.length).toBeGreaterThan(0)
    expect(chunks[0]).InstanceOf(Buffer)
  })

  test('應處理無聲音輸入', async () => {
    const processor = new AudioProcessor()
    const silentBuffer = createSilentBuffer(30000) // 30 秒靜音

    const result = await processor.detectVoice(silentBuffer)

    expect(result.hasVoice).toBe(false)
  })
})
```

#### AI-UT2: 歌詞比對

```typescript
// __tests__/lib/ai/lyricMatcher.test.ts
describe('LyricMatcher', () => {
  test('應使用 Levenshtein 距離比對', () => {
    const lyrics = ['你好世界', '這是測試', '最後一句']
    const result = matchLyric('你好世界', lyrics)

    expect(result.index).toBe(0)
    expect(result.confidence).toBe(1.0)
  })

  test('應處理錯字', () => {
    const lyrics = ['你好世界', '這是測試']
    const result = matchLyric('你好世介', lyrics) // 錯字

    expect(result.index).toBe(0)
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  test('應處理歌詞不在 AI 識別結果中', () => {
    const lyrics = ['第一句', '第二句']
    const result = matchLyric('完全不相關的內容', lyrics)

    expect(result.confidence).toBeLessThan(0.3)
  })

  test('應處理非歌詞內容 (開口音、間奏)', () => {
    const lyrics = ['第一句', '第二句']
    const result = matchLyric('啊～', lyrics)

    expect(result.confidence).toBeLessThan(0.5)
  })
})
```

#### AI-UT3: Prompt 建構

```typescript
// __tests__/lib/ai/promptBuilder.test.ts
describe('PromptBuilder', () => {
  test('應正確建構歌詞比對 Prompt', () => {
    const builder = new PromptBuilder()
    const prompt = builder.buildMatchingPrompt(
      '聽到的內容',
      ['第一句', '第二句'],
      'zh-TW'
    )

    expect(prompt).toContain('聽到的內容')
    expect(prompt).toContain('第一句')
    expect(prompt).toContain('JSON')
  })

  test('應包含回傳格式指示', () => {
    const builder = new PromptBuilder()
    const prompt = builder.buildMatchingPrompt('test', ['lyrics'])

    expect(prompt).toContain('matched_line')
    expect(prompt).toContain('confidence')
  })
})
```

---

## WebSocket 測試案例

### WS 單元測試

#### WS-UT1: 訊息序列化

```typescript
// __tests__/lib/websocket/messageSerializer.test.ts
describe('MessageSerializer', () => {
  test('應正確序列化訊息', () => {
    const msg = {
      type: 'line_changed',
      payload: { lineIndex: 5, lyrics: ['A', 'B'] },
      timestamp: Date.now()
    }

    const serialized = serializeMessage(msg)
    const deserialized = deserializeMessage(serialized)

    expect(deserialized).toEqual(msg)
  })

  test('應處理重複 messageId', () => {
    const tracker = new MessageIdTracker()

    expect(tracker.isProcessed('msg-1')).toBe(false)
    tracker.markProcessed('msg-1')
    expect(tracker.isProcessed('msg-1')).toBe(true)
  })
})
```

#### WS-UT2: 心跳檢測

```typescript
// __tests__/lib/websocket/heartbeat.test.ts
describe('Heartbeat', () => {
  test('應定期發送心跳', async () => {
    const socket = createMockSocket()
    const heartbeat = new HeartbeatManager(socket, {
      interval: 1000 // 1 秒
    })

    heartbeat.start()

    await new Promise(resolve => setTimeout(resolve, 1100))

    expect(socket.emit).toHaveBeenCalledWith('heartbeat', expect.anything())
  })

  test('應偵測連線中斷', async () => {
    const socket = createMockSocket()
    const heartbeat = new HeartbeatManager(socket, {
      interval: 100,
      timeout: 300
    })

    let disconnected = false
    socket.on('disconnect', () => { disconnected = true })

    heartbeat.start()

    // 模擬無回應
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(disconnected).toBe(true)
  })
})
```

#### WS-UT3: 重連策略

```typescript
// __tests__/lib/websocket/reconnect.test.ts
describe('ReconnectStrategy', () => {
  test('應使用指數退避重連', async () => {
    const strategy = new ExponentialBackoffStrategy({
      maxAttempts: 5,
      baseDelay: 1000
    })

    const delays = []
    for (let i = 0; i < 5; i++) {
      delays.push(strategy.getNextDelay())
    }

    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000])
  })

  test('超過最大重連次數應停止', async () => {
    const strategy = new ExponentialBackoffStrategy({
      maxAttempts: 3,
      baseDelay: 100
    })

    for (let i = 0; i < 3; i++) {
      strategy.recordAttempt()
    }

    expect(strategy.shouldContinue()).toBe(false)
  })
})
```

---

## 邊緣情況測試

### 歌詞邊緣情況

```typescript
// __tests__/lyrics/edge-cases.test.ts
describe('歌詞邊緣情況', () => {
  test('空歌詞陣列應顯示「無歌詞」', () => {
    const { container } = render(<LyricsDisplay lyrics={[]} currentIndex={0} />)
    expect(container.textContent).toContain('無歌詞')
  })

  test('超長歌詞行應自動換行', () => {
    const longLyric = 'A'.repeat(300)
    const processed = preprocessLyrics([longLyric])

    expect(processed[0].length).toBeLessThanOrEqual(100)
    expect(processed.length).toBeGreaterThan(1) // 應被換行
  })

  test('特殊字符應正常顯示', () => {
    const specialLyrics = ['🎵 音樂符號', '測試 <script>alert(1)</script>']
    const processed = preprocessLyrics(specialLyrics)

    expect(processed[1]).not.toContain('<script>')
    expect(processed[1]).toContain('&lt;script&gt;')
  })

  test('currentIndex 超出範圍應自動修正', () => {
    const lyrics = ['A', 'B', 'C']

    expect(clampLineIndex(-1, lyrics.length)).toBe(0)
    expect(clampLineIndex(10, lyrics.length)).toBe(2)
  })
})
```

### 網路邊緣情況

```typescript
// __tests__/websocket/network-edge-cases.test.ts
describe('網路邊緣情況', () => {
  test('伺服器重啟時客戶端應自動重連', async () => {
    const client = createWebSocketClient()
    await client.connect()

    // 模擬伺服器重啟
    server.restart()

    // 等待重連
    await waitFor(() => client.status === 'connected')

    expect(client.status).toBe('connected')
  })

  test('超過 10 台裝置應拒絕新連線', async () => {
    const clients: WebSocketClient[] = []

    // 建立第 11 台裝置
    for (let i = 0; i < 11; i++) {
      clients.push(await createWebSocketClient())
    }

    // 第 11 台應收到錯誤
    const lastClient = clients[10]
    await waitFor(() => lastClient.lastError !== null)

    expect(lastClient.lastError?.code).toBe('TOO_MANY_DISPLAYS')
  })
})
```

---

## 測試覆蓋率目標

---

### E2E Tests (端對端測試)

#### E2E1: 完整歌詞同步流程

```typescript
// e2e/lyrics-sync.spec.ts
import { test, expect } from '@playwright/test'

test.describe('歌詞同步流程', () => {
  test('控制端與顯示端同步歌詞', async ({ browser }) => {
    // 建立兩個瀏覽器視窗
    const controllerContext = await browser.newContext()
    const displayContext = await browser.newContext()

    const controllerPage = await controllerContext.newPage()
    const displayPage = await displayContext.newPage()

    // 導航到應用
    await controllerPage.goto('/controller')
    await displayPage.goto('/display')

    // 控制端選擇歌曲
    await controllerPage.click('[data-testid="song-selector"]')
    await controllerPage.click('text=測試歌曲')

    // 等待顯示端更新
    await expect(displayPage.locator('text=測試歌曲')).toBeVisible()

    // 控制端點擊下一句
    await controllerPage.click('[data-testid="next-line"]')

    // 確認顯示端同步更新
    await expect(displayPage.locator('.current-line')).toHaveClass(/active/)
  })
})
```

#### E2E2: 歌詞管理流程

```typescript
// e2e/song-management.spec.ts
test('新增、編輯、刪除歌曲', async ({ page }) => {
  // 登入
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.click('button[type="submit"]')

  // 新增歌曲
  await page.click('text=新增歌曲')
  await page.fill('[name="title"]', '新歌')
  await page.fill('[name="lyrics"]', '第一句\n第二句')
  await page.click('text=儲存')

  // 驗證歌曲出現在列表
  await expect(page.locator('text=新歌')).toBeVisible()

  // 編輯歌曲
  await page.click('text=新歌')
  await page.click('text=編輯')
  await page.fill('[name="title"]', '更新歌名')
  await page.click('text=儲存')

  // 驗證更新
  await expect(page.locator('text=更新歌名')).toBeVisible()

  // 刪除歌曲
  await page.click('text=更新歌名')
  await page.click('text=刪除')
  await page.click('text=確認')

  // 驗證刪除
  await expect(page.locator('text=更新歌名')).not.toBeVisible()
})
```

---

## 測試覆蓋率目標

| 類型 | 目標覆蓋率 |
|------|-----------|
| Statements | > 85% |
| Branches | > 80% |
| Functions | > 85% |
| Lines | > 85% |

### 執行覆蓋率報告

```bash
# 執行測試並產生覆蓋率報告
pnpm test:coverage

# 開啟報告
pnpm test:coverage:report
```

---

## 測試指令

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "type-check": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

---

## 測試環境

### 環境變數

```env
# .env.test
NEXT_PUBLIC_SUPABASE_URL=test_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=test_anon_key
GEMINI_API_KEY=test_api_key
WS_PORT=3001
```

### 測試資料庫

使用獨立的測試資料庫 Schema：

```sql
-- 建立測試 Schema
CREATE SCHEMA test_ly;

-- 在測試中使用 SET schema
SET search_path TO test_ly;
```

---

## 效能測試

### 同步延遲測試

```typescript
// __tests__/performance/sync-latency.test.ts
describe('同步延遲', () => {
  test('雙頁同步延遲應 < 100ms', async () => {
    const latency = await measureSyncLatency()
    expect(latency).toBeLessThan(100)
  })
})
```

### 頁面載入測試

```typescript
// __tests__/performance/page-load.test.ts
describe('頁面載入', () => {
  test('首頁載入應 < 2s', async ({ page }) => {
    const start = Date.now()
    await page.goto('/')
    const loadTime = Date.now() - start
    expect(loadTime).toBeLessThan(2000)
  })
})
```

---

## CI/CD 整合

### GitHub Actions Workflow

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: pnpm install

      - name: Type check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test

      - name: E2E tests
        run: pnpm test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 測試檢查清單

### 開發前
- [ ] 寫好測試案例
- [ ] 確認測試環境設定正確

### 開發中
- [ ] TDD: 紅燈 → 綠燈 → 重構
- [ ] 每完成一個功能執行相關測試

### 提交前
- [ ] 所有測試通過
- [ ] 覆蓋率達標
- [ ] Lint 無錯誤
- [ ] 型別檢查通過

---

## 相關文檔

- [需求文檔](requirements.md)
- [開發規範](development.md)
- [API 文檔](spec/api.md)
- [邊緣情況處理](spec/edge-cases.md)
- [AI 整合規格](spec/ai-integration.md)
- [組件契約](spec/component-contracts.md)

---

**文件版本:** 1.1
**最後更新:** 2026-03-11
**更新內容:**
- 新增 WebSocket 連線中斷處理測試
- 新增多裝置並發測試
- 新增 AI 整合測試案例
- 新增音訊處理單元測試
- 新增歌詞比對單元測試
- 新增 Prompt 建構測試
- 新增 WebSocket 訊息序列化測試
- 新增心跳檢測測試
- 新增重連策略測試
- 新增歌詞邊緣情況測試
- 新增網路邊緣情況測試
