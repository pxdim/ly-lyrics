# P0 品質鞏固：測試覆蓋補齊設計規格

## 目標

為 LY 歌詞顯示系統建立完整的測試安全網：Vitest 單元測試覆蓋前端核心邏輯（Zustand Store、NativeWSClient），Playwright E2E 測試覆蓋關鍵端到端流程（Auth、歌曲 CRUD、WebSocket 同步）。

## 決策

| 決策 | 選擇 | 理由 |
|------|------|------|
| 測試策略 | 混合策略（Vitest mock + Playwright 真實後端） | 單元測試快速覆蓋邏輯分支，E2E 驗證真實整合 |
| Store 測試方式 | 直接呼叫 actions，不渲染 React | Store 是純 JS 邏輯，無需 DOM |
| WS Client 測試方式 | Mock 全域 WebSocket 建構子 | 隔離網路層，專注事件邏輯和重連行為 |
| E2E 環境 | docker-compose.test.yml（PostgreSQL + Redis） | 一鍵啟動，port 錯開避免衝突 |
| TDD 方法論 | 嚴格 Red → Green → Refactor | 每個測試先紅燈確認失敗，再綠燈，發現 bug 即修 |

## 架構

```
測試金字塔：

E2E (Playwright)          ← 3 specs, ~15 cases, 真實全棧
─────────────────────────
Unit (Vitest)             ← 2 模組, ~45 cases, 全 mock
─────────────────────────
已有 Unit (Vitest)        ← LRC parser 36 + session-code 6
已有 Unit (Go test)       ← auth, handler, service, redis, ws
```

## 新增檔案

### Vitest 單元測試

| 檔案 | 測試對象 | 預估 cases |
|------|---------|-----------|
| `lib/store/index.test.ts` | Zustand store actions + selectors | ~25 |
| `lib/websocket/native-client.test.ts` | NativeWSClient 事件、重連、session | ~20 |

### E2E 基礎設施

| 檔案 | 用途 |
|------|------|
| `docker-compose.test.yml` | 測試用 PostgreSQL 16 (port 5433) + Redis 7 (port 6380) |
| `.env.test` | E2E 測試環境變數（測試 DB URL、測試 Redis URL、JWT secret） |
| `e2e/helpers/auth.ts` | 註冊/登入 API helper，取得 access token |
| `e2e/helpers/api.ts` | 歌曲 seed/cleanup helper，直接呼叫 Go API |

### E2E 測試 Specs

| 檔案 | 流程 | 預估 cases |
|------|------|-----------|
| `e2e/auth.spec.ts` | 註冊 → 登入 → token refresh → /auth/me | ~5 |
| `e2e/songs.spec.ts` | 建歌 → 列表 → 編輯 → 刪除 | ~5 |
| `e2e/websocket-sync.spec.ts` | Controller 加入 → Display 加入 → 切歌 → 換行 → 播放 | ~5 |

### 設定修改

| 檔案 | 修改 |
|------|------|
| `playwright.config.ts` | 加入 webServer（Go backend + Next.js）、envFile 指向 .env.test |
| `package.json` | 新增 `test:unit`, `test:e2e:setup`, `test:e2e:teardown` scripts |

---

## 模組設計

### 1. Zustand Store 測試 (`lib/store/index.test.ts`)

**Mock 策略**：vi.mock `lib/websocket/native-client.ts`，替換 `initNativeWSClient` / `getNativeWSClient` 回傳 mock 物件。

**每次測試前**：`store.setState(initialState)` 重設狀態，避免測試間污染。

**測試分組：**

#### 歌詞導航 (~6 cases)
- `nextLine`：currentIndex 從 0 → 1
- `nextLine`：到最後一行時不超出（邊界守護）
- `nextLine`：lyrics 為空時不動作
- `prevLine`：currentIndex 從 2 → 1
- `prevLine`：在第 0 行時不低於 0
- `jumpToLine`：直接跳到指定行

#### 歌曲操作 (~4 cases)
- `setCurrentSong`：設定歌曲，currentIndex 重設為 0
- `setCurrentSong(null)`：清除歌曲
- `setLyrics`：更新歌詞陣列
- `setLyrics([])`：空陣列

#### 連線狀態 (~5 cases)
- `connect`：呼叫 WS client connect()
- `disconnect`：connectionState 變為 'disconnected'，清除 sessionId
- 收到 `_connected` 事件：connectionState → 'connected'
- 收到 `_reconnecting` 事件：connectionState → 'reconnecting'，reconnectAttempt 遞增
- 收到 `_reconnect_exhausted` 事件：connectionState → 'disconnected'

#### Session 操作 (~3 cases)
- `joinSession`：sessionId 和 role 正確設定
- `leaveSession`：sessionId 清空、role 清空
- `joinSession` 呼叫 WS client joinSession()

#### 播放控制 (~3 cases)
- `setPlaying(true/false)`：直接設定
- `togglePlaying`：true ↔ false 切換

#### 顯示設定 (~2 cases)
- `updateDisplaySettings({ fontSize: 24 })`：部分 merge
- `resetDisplaySettings`：重設回預設值

#### Selectors (~4 cases)
- `selectVisibleLyrics`：根據 displayLines 截取正確 startIndex/endIndex
- `selectVisibleLyrics`：highlightIndex 指向 currentIndex 在可見範圍的位置
- `selectConnectionStatus`：isConnected 從 connectionState 導出
- `selectNavigationState`：canGoNext / canGoPrev 邊界正確

---

### 2. NativeWSClient 測試 (`lib/websocket/native-client.test.ts`)

**Mock 策略**：
```typescript
class MockWebSocket {
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  readyState = 1; // OPEN
}
```

`vi.stubGlobal("WebSocket", vi.fn(() => mockWs))`，每次測試前重建。

**使用 `vi.useFakeTimers()`** 控制重連的 setTimeout delay，避免測試等待真實時間。

**測試分組：**

#### 連線管理 (~4 cases)
- `connect()`：WebSocket 建構子以正確 URL 被呼叫
- `disconnect()`：ws.close() 被呼叫
- `isConnected()`：連線後回傳 true、斷線後回傳 false
- 重複 `connect()` 不建立第二條連線

#### 事件發送 (~5 cases)
- `changeLine(3)`：send 收到 `{"type":"change_line","payload":{"lineIndex":3}}`
- `nextLine()`：send 收到 `{"type":"next_line"}`
- `setSong("abc")`：send 收到 `{"type":"set_song","payload":{"songId":"abc"}}`
- `setPlaying(true)`：正確 payload
- `updateSettings({ fontSize: 24 })`：正確 payload

#### 事件接收 (~4 cases)
- Server 推送 `line_changed`：on("line_changed") callback 收到正確 payload
- Server 推送 `song_changed`：callback 觸發
- Server 推送 `playing_changed`：callback 觸發
- Server 推送 `error`：callback 觸發

#### 內部事件 (~3 cases)
- `onopen` 觸發 → `_connected` 事件被發出
- `onclose` 觸發 → `_disconnected` 事件被發出
- 重連中 → `_reconnecting` 事件帶 `{ attempt, maxAttempts }`

#### 重連邏輯 (~4 cases)
- 斷線後自動重連（WebSocket 建構子再次被呼叫）
- 指數退避：第 1 次 1000ms、第 2 次 1500ms、第 3 次 2250ms
- 超過 maxReconnectAttempts(5) 觸發 `_reconnect_exhausted`
- 手動 `disconnect()` 後不自動重連

#### Session 恢復 (~2 cases)
- 重連成功後自動 send `join_session`（帶之前的 sessionId + role）
- 無先前 session 時不發送 join

---

### 3. E2E 基礎設施

#### docker-compose.test.yml
```yaml
services:
  test-postgres:
    image: postgres:16-alpine
    ports: ["5433:5432"]
    environment:
      POSTGRES_DB: ly_test
      POSTGRES_USER: ly_test
      POSTGRES_PASSWORD: ly_test_pass
    tmpfs: /var/lib/postgresql/data  # RAM disk，測試完即消失
  test-redis:
    image: redis:7-alpine
    ports: ["6380:6379"]
```

#### .env.test
```env
DATABASE_URL=postgres://ly_test:ly_test_pass@localhost:5433/ly_test?sslmode=disable
REDIS_URL=redis://localhost:6380
JWT_SECRET=test-secret-key-for-e2e
NEXT_PUBLIC_APP_URL=http://localhost:3000
GO_BACKEND_URL=http://localhost:8080
NEXT_PUBLIC_GO_WS_URL=ws://localhost:8080/ws
```

#### playwright.config.ts 修改
- `webServer` 陣列：先啟動 Go backend（port 8080），再啟動 Next.js（port 3000）
- Go backend 用 `.env.test` 的環境變數
- `use.baseURL` = `http://localhost:3000`

#### Helpers
- `e2e/helpers/auth.ts`：`registerUser(email, password)` / `loginUser(email, password)` — 直接 fetch Go API，回傳 token
- `e2e/helpers/api.ts`：`seedSong(token, data)` / `cleanupSongs(token)` — 測試前建資料、測試後清除

---

### 4. E2E 測試 Specs

#### auth.spec.ts (~5 cases)
1. 註冊新帳號 → 201 + 取得 token
2. 用同帳號登入 → 200 + token
3. 用 token 打 /auth/me → 回傳 user 資訊
4. Refresh token → 取得新 access token
5. 錯誤密碼登入 → 401

#### songs.spec.ts (~5 cases)
1. 建立歌曲（POST /api/songs）→ 201
2. 列表查詢（GET /api/songs）→ 包含剛建的歌
3. 取得單首（GET /api/songs/:id）→ 歌詞正確
4. 更新歌名（PUT /api/songs/:id）→ 確認更新
5. 刪除歌曲（DELETE /api/songs/:id）→ 再 GET 回 404

#### websocket-sync.spec.ts (~5 cases)
1. Controller 開頁面 → 產生 session code → WebSocket 連線
2. Display 輸入 code → 加入同 session → 連線成功
3. Controller 切歌 → Display 收到 song_changed
4. Controller 切行 → Display 歌詞高亮更新
5. Controller 播放/暫停 → Display 同步狀態

---

## TDD 執行規範

每個測試分組嚴格遵循 Red → Green → Refactor：

1. **Red**：寫測試，執行 → 確認失敗（截圖/日誌記錄失敗原因）
2. **Green**：補 mock / 修正預期 / 修 production code → 執行 → 確認通過
3. **Refactor**：清理重複 setup、提取 helper → 執行 → 確認仍通過
4. **Commit**：每個分組完成後 commit

**紅燈必須是有意義的失敗**：
- 測試邏輯正確但因缺少 mock 而失敗 ✅
- 測試邏輯正確但因 production code bug 而失敗 ✅ → 修 production code
- 測試本身語法錯誤 ❌ → 不算紅燈，先修語法

**發現 production code bug 時**：
1. 紅燈暴露問題
2. 記錄 bug 描述
3. 修 production code
4. 綠燈確認修復
5. Commit 包含 test + fix

---

## 成功標準

- [ ] Vitest：~45 個新 test cases 全部通過
- [ ] Playwright E2E：~15 個 test cases 全部通過
- [ ] `npm run test:unit` 零失敗
- [ ] `npm run test:e2e` 零失敗（需先 `test:e2e:setup`）
- [ ] 發現的 production code bugs 全部修復
- [ ] TDD 每個分組獨立 commit，commit message 含 test scope
