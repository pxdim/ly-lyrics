# 技術債報告 - LY 歌詞顯示系統

**報告日期:** 2026-03-12
**審查者:** AI Technical Architect
**最後更新:** 2026-03-12 14:30
**嚴重性:** 🔴 高優先級

---

## 執行摘要

經過全面的代碼審查，發現以下主要技術債需要立即處理：

| 類別 | 嚴重性 | 預估工時 | 狀態 |
|------|--------|----------|------|
| 錯誤處理系統 | 🔴 高 | 4-6h | ✅ 已完成 |
| 數據驗證 (Zod) | 🟡 低 | 2-3h | ✅ 已完成 |
| WebSocket 完整實作 | 🔴 高 | 6-8h | 🟡 部分完成 |
| 邊緣情況處理 | 🟠 中 | 4-5h | ❌ 未實現 |
| 測試框架 | 🟠 中 | 6-8h | ❌ 未實現 |
| 日誌監控 | 🟡 低 | 2-3h | 🟡 部分完成 |

**總預估工時:** 24-33 小時
**已完成工時:** ~6-8 小時
**剩餘工時:** ~16-23 小時

---

## 一、錯誤處理系統 ✅

### 1.1 問題描述

已定義的錯誤處理規範 (`docs/spec/error-handling.md`) 與實際實現不一致：

```typescript
// ✅ 已完成: lib/errors/AppError.ts
// ✅ 已完成: app/api/_errors.ts
// ✅ 已完成: components/ui/ErrorBoundary.tsx
// ✅ 已完成: components/ui/Toast.tsx
// ✅ 已完成: app/layout-client.tsx
```

### 1.2 當前狀態

| 組件 | 規範 | 實現 | 狀態 |
|------|------|------|------|
| AppError 類別 | ✅ 定義 | ✅ lib/errors/AppError.ts | 完成 |
| SongError, SyncError 等 | ✅ 定義 | ✅ lib/errors/AppError.ts | 完成 |
| ErrorBoundary 組件 | ✅ 定義 | ✅ components/ui/ErrorBoundary.tsx | 完成 |
| Toast 通知系統 | ✅ 定義 | ✅ components/ui/Toast.tsx | 完成 |
| 統一 API 錯誤格式 | ✅ 定義 | ✅ app/api/_errors.ts | 完成 |
| 全域錯誤監聽 | ✅ 定義 | ✅ app/layout-client.tsx | 完成 |

### 1.3 實現細節

#### 1.3.1 錯誤類別層級 (`lib/errors/AppError.ts`)

```typescript
// 20+ 錯誤碼定義
export const ERROR_CODES = {
  SONG_NOT_FOUND: "SONG_NOT_FOUND",
  SONG_INVALID_FORMAT: "SONG_INVALID_FORMAT",
  // ... 更多錯誤碼
};

// 基礎錯誤類別
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public userMessage: string,
    public technicalMessage?: string,
    public severity: ErrorSeverity = "error",
    public context?: ErrorContext
  ) { ... }
}

// 專用錯誤類別
export class SongError extends AppError { ... }
export class SyncError extends AppError { ... }
export class AiError extends AppError { ... }
// ... 更多
```

#### 1.3.2 API 錯誤回應工廠 (`app/api/_errors.ts`)

```typescript
// 統一錯誤格式
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse>

// 常用錯誤工廠
export const ErrorResponses = {
  notFound: (resource: string, id?: string) => ...
  unauthorized: (message?) => ...
  forbidden: (message?) => ...
  // ... 更多
}
```

#### 1.3.3 React 錯誤邊界 (`components/ui/ErrorBoundary.tsx`)

```typescript
// 完整的 ErrorBoundary 實現
// - Dark Tech v2.0 設計風格
// - 開發模式堆疊追蹤顯示
// - 重試和回首頁按鈕
// - 錯誤上下文 Hook
```

#### 1.3.4 Toast 通知系統 (`components/ui/Toast.tsx`)

```typescript
// 四種通知類型
export type ToastVariant = "success" | "error" | "warning" | "info";

// Hook 用法
const { toast } = useToast();
toast({ title: "成功", description: "操作完成", variant: "success" });
```

### 1.4 API 路由整合

已更新所有 API 路由使用統一錯誤處理：

```typescript
// app/api/songs/route.ts - 當前實現
import { createErrorResponse, ErrorResponses } from "../_errors";
import { songListParamsSchema, createSongSchema } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const paramsResult = songListParamsSchema.safeParse(...);
  if (!paramsResult.success) {
    return createErrorResponse(
      "SONG_INVALID_FORMAT",
      "Invalid query parameters",
      400,
      { issues: paramsResult.error.issues }
    );
  }
  // ...
}
```

---

## 二、數據驗證 (Zod Schemas) ✅

### 2.1 問題描述

API 路由缺少輸入驗證，可能導致：
- 無效數據進入系統
- 類型錯誤
- 安全漏洞

### 2.2 當前狀態

| 組件 | 規範 | 實現 | 狀態 |
|------|------|------|------|
| Zod Schemas | ✅ 定義 | ✅ lib/schemas/index.ts | 完成 |
| 類型安全 | ✅ | ✅ exactOptionalPropertyTypes | 完成 |
| API 整合 | ✅ | ✅ 所有 API 路由 | 完成 |

### 2.3 實現細節

#### 2.3.1 核心 Schemas (`lib/schemas/index.ts`)

```typescript
// Common Schemas
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export const searchParamsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  userId: z.string().uuid().optional(),
});

// Song Schemas
export const createSongSchema = z.object({
  title: z.string().trim().min(1).max(255),
  artist: z.string().trim().max(255).optional(),
  lyrics: z.array(z.string().trim()).min(1),
  lrcTimestamps: z.array(z.number().nonnegative()).optional(),
  language: z.string().length(2).optional(),
  userId: z.string().uuid().optional(),
});

export const updateSongSchema = z.object({...}).refine(
  (data) => Object.keys(data).length > 0,
  { message: "At least one field must be provided" }
);

// WebSocket Schemas
export const joinSessionSchema = z.object({
  sessionId: z.string().min(1),
  role: z.enum(["controller", "display", "admin"]),
  userId: z.string().uuid().optional(),
});
```

#### 2.3.2 exactOptionalPropertyTypes 兼容性

為了兼容 `exactOptionalPropertyTypes: true`，創建了輔助函數：

```typescript
export function toSongListParams(
  data: z.infer<typeof songListParamsSchema>
): SongListParams;

export function toCreateSongInput(
  data: z.infer<typeof createSongSchema>
): CreateSongInput;

export function toUpdateSongInput(
  data: z.infer<typeof updateSongSchema>
): UpdateSongInput;

export function createPartialSongListParams(
  partial: Partial<SongListParams>
): SongListParams;
```

### 2.4 API 整合範例

```typescript
// GET /api/songs
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const paramsResult = songListParamsSchema.safeParse({
    limit: searchParams.get("limit"),
    offset: searchParams.get("offset"),
    search: searchParams.get("search"),
    userId: searchParams.get("userId"),
  });

  if (!paramsResult.success) {
    return createErrorResponse(
      "SONG_INVALID_FORMAT",
      "Invalid query parameters",
      400,
      { issues: paramsResult.error.issues }
    );
  }

  const result = await getSongs(toSongListParams(paramsResult.data));
  return NextResponse.json(result);
}

// POST /api/songs
export async function POST(request: NextRequest) {
  const body = await request.json();
  const bodyResult = createSongSchema.safeParse(body);

  if (!bodyResult.success) {
    return createErrorResponse(
      "SONG_INVALID_FORMAT",
      bodyResult.error.issues[0]?.message || "Invalid request body",
      400,
      { issues: bodyResult.error.issues }
    );
  }

  const input = toCreateSongInput({
    ...bodyResult.data,
    userId: bodyResult.data.userId || defaultUserId,
  });

  const newSong = await createSong(input);
  return NextResponse.json(newSong, { status: 201 });
}
```

---

## 三、WebSocket 實作 🔴

### 2.1 問題描述

WebSocket 伺服器已定義但未實際運作：

```typescript
// app/api/ws/route.ts - 當前實現
export async function GET(_request: NextRequest) {
  // ❌ 只返回文檔，沒有實際的 WebSocket 伺服器
  // ❌ Socket.IO 需要自定義伺服器，未在 Next.js 中整合
  return NextResponse.json({
    message: "WebSocket server for real-time lyrics synchronization",
    // ...
  });
}
```

### 2.2 缺失功能

| 功能 | 規範 | 實現 | 狀態 |
|------|------|------|------|
| Socket.IO 整合 | ✅ | ❌ | 未實現 |
| 心跳檢測 | ✅ | ❌ | 未實現 |
| 訊息去重 (messageId) | ✅ | ❌ | 未實現 |
| 指數退避重連 | 🟡 | ❌ | 客戶端有基礎重連 |
| 限流機制 | ✅ | ❌ | 未實現 |
| Session 管理檢查清單 | ✅ | ❌ | 部分實現 |

### 2.3 需要實現

1. **自定義伺服器設定** - 整合 Socket.IO 與 Next.js
2. **WebSocket 心跳** - server.ts 中的心跳機制
3. **訊息去重** - MessageIdTracker 類別
4. **限流** - 每秒最多 100 則訊息
5. **重連策略** - 指數退避完整實現

---

## 三、邊緣情況處理 🟠

### 3.1 問題描述

規範定義的邊緣情況 (`docs/spec/edge-cases.md`) 未在代碼中實現：

```typescript
// ❌ 缺少: lib/lyrics/preprocessor.ts - 歌詞預處理
// ❌ 缺少: lib/utils/debounce.ts - 防抖
// ❌ 缺少: 響應式行數調整
```

### 3.2 未處理的邊緣情況

| 類別 | 邊緣情況 | 狀態 |
|------|----------|------|
| 歌詞 | 空歌詞陣列 | 🟡 部分處理 |
| 歌詞 | 超長行 (>200字) | ❌ 未處理 |
| 歌詞 | 特殊字符 (emoji) | 🟡 基本支援 |
| 歌詞 | HTML 轉義 | ❌ 未處理 (XSS 風險) |
| 操作 | 快速連續點擊 | ❌ 無防抖 |
| 網路 | 訊息順序錯亂 | ❌ 未處理 |
| 網路 | 限流 | ❌ 未處理 |

### 3.3 需要實現

1. **lib/lyrics/preprocessor.ts** - 歌詞預處理
2. **lib/utils/debounce.ts** - 防抖和節流
3. **lib/utils/escapeHtml.ts** - HTML 轉義
4. **響應式行數調整** - 根據螢幕尺寸調整顯示行數

---

## 四、測試框架 🟠

### 4.1 問題描述

測試規範完整，但實際測試檔案不存在：

```bash
# ❌ __tests__/ 目錄不存在或為空
# ❌ 沒有 vitest.config.ts
# ❌ 沒有 playwright.config.ts
```

### 4.2 測試覆蓋現狀

| 類型 | 規範 | 實現 | 覆蓋率 |
|------|------|------|--------|
| 單元測試 | ✅ | ❌ | 0% |
| 組件測試 | ✅ | ❌ | 0% |
| 整合測試 | ✅ | ❌ | 0% |
| E2E 測試 | ✅ | ❌ | 0% |

### 4.3 需要實現

1. **vitest.config.ts** - Vitest 設定
2. **playwright.config.ts** - Playwright 設定
3. **__tests__/lib/store.test.ts** - Store 測試
4. **__tests__/lib/websocket/client.test.ts** - WebSocket 測試
5. **__tests__/components/LyricsDisplay.test.tsx** - 組件測試
6. **__tests__/e2e/lyrics-sync.spec.ts** - E2E 測試

---

## 五、數據驗證 🟡

### 5.1 問題描述

Zod 已安裝但未在 API 路由中使用：

```typescript
// app/api/songs/route.ts - 當前實現
export async function POST(request: NextRequest) {
  const body = await request.json();

  // ❌ 手動檢查，未使用 Zod
  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }
}
```

### 5.2 需要實現

1. **lib/schemas/song.schema.ts** - Zod schemas
2. **lib/schemas/api.schema.ts** - API 請求/回應 schemas
3. **整合到所有 API 路由**

---

## 六、實作優先級

### Phase 1: 關鍵基礎 (必須先完成)

1. **錯誤處理系統** - 4-6h
   - AppError 類別層級
   - ErrorBoundary 組件
   - Toast 通知系統

2. **數據驗證** - 2-3h
   - Zod schemas
   - API 路由整合

### Phase 2: WebSocket 完善

3. **WebSocket 實作** - 6-8h
   - 自定義伺服器
   - 心跳檢測
   - 訊息去重

### Phase 3: 邊緣情況

4. **邊緣情況處理** - 4-5h
   - 歌詞預處理
   - 防抖/節流
   - 響應式調整

### Phase 4: 測試

5. **測試框架** - 6-8h
   - 單元測試
   - 組件測試
   - E2E 測試

---

## 七、風險評估

| 風險 | 影響 | 機率 | 緩解措施 |
|------|------|------|----------|
| 錯誤未捕獲導致崩潰 | 高 | 中 | 實現 ErrorBoundary |
| WebSocket 連線不穩 | 高 | 高 | 心跳 + 重連機制 |
| XSS 攻擊 | 高 | 低 | HTML 轉義 |
| 測試不足導致回歸 | 中 | 高 | 優先實現關鍵測試 |

---

## 八、建議行動

### 立即行動

1. **暫停新功能開發**，先完成技術債清理
2. **建立錯誤處理基礎** - 這是系統穩定性的關鍵
3. **實現 WebSocket 心跳** - 這是多裝置同步的核心

### 短期目標 (1週內)

- 完成 Phase 1-2
- 達到基礎穩定性標準

### 中期目標 (2週內)

- 完成所有技術債清理
- 測試覆蓋率 > 70%

---

## 九、已完成工作摘要 (2026-03-12)

### 新增檔案

| 檔案 | 行數 | 描述 |
|------|------|------|
| `lib/errors/AppError.ts` | 350 | 錯誤類別層級、錯誤碼、工具函數 |
| `app/api/_errors.ts` | 219 | API 錯誤回應工廠、withErrorHandler、參數解析器 |
| `components/ui/ErrorBoundary.tsx` | 251 | React 錯誤邊界、Dark Tech 設計 |
| `components/ui/Toast.tsx` | 280 | Toast 通知系統、Provider、Hook |
| `app/layout-client.tsx` | 53 | 客戶端錯誤監聽包裝器 |
| `lib/schemas/index.ts` | 237 | Zod 驗證 schemas、輔助函數 |

### 修改檔案

| 檔案 | 變更 |
|------|------|
| `app/layout.tsx` | 整合 ErrorBoundary 和 ToastProvider |
| `app/api/songs/route.ts` | 添加 Zod 驗證、統一錯誤處理 |
| `app/api/songs/[id]/route.ts` | 添加 Zod 驗證、統一錯誤處理 |
| `lib/services/songService.ts` | 更新類型以支援 exactOptionalPropertyTypes |
| `components/lyrics/SongSelector.tsx` | 使用 createPartialSongListParams |

### TypeScript 嚴格模式相容

- ✅ `exactOptionalPropertyTypes: true` - 完全相容
- ✅ 所有類型定義使用明確的 `| undefined` 而非 `?`
- ✅ 創建輔助函數來轉換 Zod 輸出

### 構建狀態

```bash
✅ npm run type-check - 通過
✅ npm run build - 通過
📦 First Load JS: 102 kB (shared)
📦 /controller: 205 kB
📦 /display: 124 kB
```

### Phase 1 完成驗證

- ✅ 錯誤處理系統完整實現
- ✅ 數據驗證 (Zod) 完整實現
- ✅ TypeScript 嚴格模式相容
- ✅ 生產構建通過

**下一步:** Phase 2 - WebSocket 連線完善

---

**報告版本:** 1.0
**下次審查:** 實作完成後
