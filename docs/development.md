# 開發規範

## 開發概覽

LY 系統遵循 **AI-First Development** 原則，優先考慮與 AI 工具的協作效率。

---

## 程式碼規範

### TypeScript 規範

```typescript
// 使用嚴格模式
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 命名慣例

| 類型 | 慣例 | 範例 |
|------|------|------|
| 組件 | PascalCase | `LyricsDisplay.tsx` |
| 函數 | camelCase | `getNextLine()` |
| 常數 | UPPER_SNAKE_CASE | `MAX_DISPLAY_LINES` |
| 型別 | PascalCase | `Song`, `LyricsState` |
| 介面 | PascalCase + I 前綴 (可選) | `ISong` |
| 檔案 | kebab-case | `lyrics-store.ts` |

### 檔案組織

```
src/
├── app/                    # Next.js App Router
│   ├── (controller)/       # 控制端路由群組
│   ├── (display)/          # 顯示端路由群組
│   ├── api/                # API 路由
│   └── layout.tsx
├── components/             # React 組件
│   ├── lyrics/             # 歌詞相關組件
│   ├── ui/                 # UI 基礎組件
│   └── layout/             # 佈局組件
├── lib/                    # 核心函式庫
│   ├── trpc/               # tRPC 設定
│   ├── db/                 # 資料庫
│   ├── websocket/          # WebSocket
│   └── ai/                 # AI 整合
├── stores/                 # 狀態管理
├── types/                  # 型別定義
└── utils/                  # 工具函數
```

---

## ESLint 規則

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error",
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

---

## Prettier 設定

```json
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## Git 工作流程

### 分支策略

```
main          ───┬────> 生產環境
               │
develop       ───┼────> 開發整合
               │
feature/*     ───┼────> 功能開發
               │
fix/*         ───┴────> Bug 修復
```

### 分支命名

| 類型 | 命名 | 範例 |
|------|------|------|
| 功能 | `feature/功能名稱` | `feature/ai-listening` |
| 修復 | `fix/問題描述` | `fix/websocket-reconnect` |
| Hotfix | `hotfix/緊急修復` | `hotfix/critical-bug` |
| 發布 | `release/版本` | `release/v1.0.0` |

### Commit 訊息規範

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type:**
- `feat`: 新功能
- `fix`: Bug 修復
- `docs`: 文檔更新
- `style`: 程式碼格式 (不影響功能)
- `refactor`: 重構
- `perf`: 效能優化
- `test`: 測試相關
- `chore`: 建置/工具相關

**範例:**
```
feat(ai): add Gemini API integration for lyric matching

Implement audio transcription using Gemini API to automatically
identify current lyric position during playback.

Closes #123
```

---

## Code Review 檢查清單

### 功能性
- [ ] 功能符合需求
- [ ] 邊缘情況已處理
- [ ] 錯誤處理完善

### 程式碼品質
- [ ] 遵循程式碼規範
- [ ] 無重複程式碼
- [ ] 函數單一職責
- [ ] 變數命名清晰

### 測試
- [ ] 單元測試已撰寫
- [ ] 測試覆蓋率足夠
- [ ] 所有測試通過

### 文檔
- [ ] API 文檔已更新
- [ ] 複雜邏輯有註解
- [ ] README 已更新 (如需要)

---

## 開發工作流程

### 1. 開始新功能

```bash
# 從 main 建立功能分支
git checkout main
git pull origin main
git checkout -b feature/new-feature

# 安裝依賴 (如有更新)
pnpm install

# 啟動開發伺服器
pnpm dev
```

### 2. 開發過程

```bash
# 型別檢查
pnpm type-check

# Lint 檢查
pnpm lint

# 執行測試
pnpm test

# 修復 Lint 錯誤
pnpm lint:fix
```

### 3. 提交程式碼

```bash
# 暫存變更
git add .

# 提交 (遵循規範)
git commit -m "feat: add lyrics sync functionality"

# 推送到遠端
git push origin feature/new-feature
```

### 4. 建立 Pull Request

標題格式: `[功能類型] 簡短描述`

內容包含:
- 功能描述
- 相關 Issue
- 測試說明
- 截圖 (如適用)

---

## 常用指令

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write .",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "db:push": "supabase db push",
    "db:studio": "supabase studio"
  }
}
```

---

## AI 開發輔助

### AI 友善的程式碼風格

1. **清晰命名**: 變數和函數名稱要描述性
2. **型別註解**: 完整的 TypeScript 型別
3. **註解說明**: 複雜邏輯的中文註解
4. **模組化**: 小而專注的函數
5. **一致性**: 統一的程式碼風格

### 範例：AI 友善的函數

```typescript
/**
 * 將 LRC 格式歌詞轉換為歌詞物件陣列
 *
 * @param lrcContent - LRC 格式的歌詞字串
 * @returns 包含時間戳和文字的歌詞物件陣列
 *
 * @example
 * ```ts
 * const result = parseLRC("[00:12.34]你好\n[00:16.78]世界")
 * // [{ time: 12.34, text: "你好" }, { time: 16.78, text: "世界" }]
 * ```
 */
export function parseLRC(lrcContent: string): LyricsLine[] {
  // 使用正則表達式匹配每一行
  const lineRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/
  const lines = lrcContent.split('\n')

  return lines
    .map((line) => {
      const match = line.match(lineRegex)
      if (!match) return null

      const [, minutes, seconds, milliseconds, text] = match
      const time = parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 100

      return { time, text: text.trim() }
    })
    .filter((line): line is LyricsLine => line !== null && line.text !== '')
}
```

---

## 測試開發流程 (TDD)

1. **紅燈**: 寫失敗的測試
2. **綠燈**: 實作最小程式碼讓測試通過
3. **重構**: 優化程式碼品質

```bash
# TDD 循環
pnpm test --watch  # 監聽模式
```

---

## 效能優化建議

### React 組件

```typescript
// 使用 React.memo 避免不必要的重渲染
export const LyricsLine = React.memo(({ line, isActive }: LyricsLineProps) => {
  return <div className={isActive ? 'active' : ''}>{line}</div>
})

// 使用 useMemo 快取計算結果
const visibleLyrics = useMemo(
  () => lyrics.slice(currentIndex, currentIndex + displayLines),
  [lyrics, currentIndex, displayLines]
)

// 使用 useCallback 穩定函數引用
const handleNextLine = useCallback(() => {
  setIndex((i) => Math.min(i + 1, lyrics.length - 1))
}, [lyrics.length])
```

---

## 安全最佳實踐

### 資料驗證

```typescript
import { z } from 'zod'

// 使用 Zod 驗證輸入
const CreateSongSchema = z.object({
  title: z.string().min(1).max(255),
  artist: z.string().max(255).optional(),
  lyrics: z.string().min(1),
})

// API 路由中使用
export async function POST(request: Request) {
  const body = await request.json()
  const validated = CreateSongSchema.parse(body)
  // ...
}
```

### 環境變數

```typescript
// 驗證必要環境變數
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'CLAUDE_API_KEY',
] as const

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`)
  }
}
```

---

## 相關文檔

- [測試計劃](testing.md)
- [系統架構](spec/architecture.md)
- [API 文檔](spec/api.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
