# Neon Brutalist Glass 主題實作計畫

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 LY 歌詞顯示系統的視覺主題從 Dark Tech (cyan/purple) 切換為 Neon Brutalist Glass (烈焰橘/冰藍)，涵蓋全站所有頁面。

**Architecture:** 純視覺換膚。CSS 變數值替換 + Tailwind config 更新 + 元件 class 微調。不改架構、不改邏輯、不改後端。設計系統已統一到 CSS 變數，大部分色彩透過變數自動生效。

**Tech Stack:** Next.js 15 + React 19 + Tailwind CSS 3.4 + next/font/google

**Spec:** `docs/specs/2026-03-17-neon-brutalist-theme-design.md` (v1.1 Final)

---

## File Structure

### 修改檔案

| 路徑 | 變更摘要 |
|------|---------|
| `app/globals.css` | CSS 變數色盤值、`.glass-card` 改為粗邊框毛玻璃、新增 glass 變體 + glow-orb class、neon-pulse/glow keyframe 色 |
| `tailwind.config.ts` | shade palette 橘/藍、fontFamily、boxShadow、backgroundImage 漸層、glow keyframe 色 |
| `app/layout.tsx` | next/font/google 改為 Archivo_Black + Noto_Sans_TC、theme-color meta |
| `components/ui/GlowButton.tsx` | variant classes — 粗邊框 2px + 橘色 glow |
| `components/ui/GlowInput.tsx` | 邊框 2px + 背景透明度調整 |
| `components/ui/ConfirmDialog.tsx` | backdrop 改 `bg-black/85`、card 加 `glass-elevated` |
| `components/ui/Toast.tsx` | success type 改 `text-success border-success` |
| `components/ui/ErrorBoundary.tsx` | accent → primary |
| `components/auth/AuthLayout.tsx` | 光球背景、標題漸層改雙色 |
| `components/lyrics/LyricsControl.tsx` | ~14 處硬編碼 rgba 替換 |
| `app/page.tsx` | 光球背景、三色→雙色漸層、FeatureCard accent→primary |
| `app/display/page.tsx` | 光球背景 |
| `components/controller/*.tsx` | 透過 CSS 變數自動生效，僅微調個別硬編碼 |

---

## Chunk 1: 設計系統基礎

### Task 1: CSS 變數色盤替換

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: 替換 `:root` 色盤值**

將 `app/globals.css` 第 7-32 行的色盤值替換為新主題：

```css
    /* === 背景層次 === */
    --color-void: 0 0% 4%;
    --color-surface: 0 0% 7%;
    --color-elevated: 0 0% 10%;

    /* === 品牌色 === */
    --color-primary: 25 100% 50%;
    --color-secondary: 186 100% 50%;
    --color-accent: 145 80% 45%;

    /* === 文字 === */
    --color-text-primary: 0 0% 100%;
    --color-text-muted: 0 0% 50%;

    /* === 邊框 === */
    --color-border-dim: 0 0% 100% / 0.08;

    /* === 語意色 === */
    --color-success: 145 80% 45%;
    --color-warning: 35 95% 55%;
    --color-error: 0 85% 55%;

    /* === 發光專用 === */
    --color-glow-primary: 25 100% 50%;
    --color-glow-secondary: 186 100% 50%;
    --color-glow-accent: 145 80% 45%;
```

動效 timing tokens（`--ease-*`, `--duration-*`）維持不變。

- [ ] **Step 2: 更新 `.glass-card` 為 Neon Brutalist 風格**

替換第 71-73 行的 `.glass-card`：

```css
  .glass-card {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background: rgba(255, 255, 255, 0.04);
    border: 2px solid hsl(var(--color-primary) / 0.3);
    border-radius: 16px;
  }
```

- [ ] **Step 3: 新增 glass 變體 + glow-orb classes**

在 `@layer components` 末尾新增：

```css
  .glass-secondary {
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    background: rgba(255, 255, 255, 0.03);
    border: 2px solid hsl(var(--color-secondary) / 0.2);
    border-radius: 16px;
  }

  .glass-subtle {
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
  }

  .glass-elevated {
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    background: rgba(255, 255, 255, 0.06);
    border: 2px solid hsl(var(--color-primary) / 0.4);
    border-radius: 16px;
  }

  /* 背景光暈 */
  .glow-orb-primary {
    position: fixed;
    width: 300px;
    height: 300px;
    background: hsl(var(--color-glow-primary));
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.15;
    pointer-events: none;
    z-index: 0;
  }

  .glow-orb-secondary {
    position: fixed;
    width: 250px;
    height: 250px;
    background: hsl(var(--color-glow-secondary));
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.10;
    pointer-events: none;
    z-index: 0;
  }
```

- [ ] **Step 4: 型別檢查**

Run: `npx tsc --noEmit`
Expected: 無錯誤

- [ ] **Step 5: Commit**

```bash
git add app/globals.css
git commit -m "feat(theme): update CSS vars to Neon Brutalist orange/cyan palette, add glass variants"
```

---

### Task 2: Tailwind config 更新

**Files:**
- Modify: `tailwind.config.ts`

- [ ] **Step 1: 更新 shade palettes**

替換 `colors.primary` shade 值（50-900）為橘色系：
```ts
50: '#FFF3E6', 100: '#FFE0BF', 200: '#FFC285',
300: '#FFA34A', 400: '#FF8A1F', 500: '#FF6A00',
600: '#CC5500', 700: '#993F00', 800: '#662A00',
900: '#331500',
```

替換 `colors.secondary` shade 值為冰藍系：
```ts
50: '#E6FDFF', 100: '#B3F8FF', 200: '#80F3FF',
300: '#4DEEFF', 400: '#1AE9FF', 500: '#00E5FF',
600: '#00B8CC', 700: '#008A99', 800: '#005C66',
900: '#002E33',
```

Accent shade palette 保持綠色不變。

- [ ] **Step 2: 更新 fontFamily**

```ts
fontFamily: {
  heading: ['"Archivo Black"', '"Noto Sans TC"', 'sans-serif'],
  body: ['"Noto Sans TC"', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
},
```

- [ ] **Step 3: 更新 boxShadow**

```ts
boxShadow: {
  'glow-sm': '0 0 10px hsl(var(--color-glow-primary) / 0.3)',
  'glow-md': '0 0 20px hsl(var(--color-glow-primary) / 0.4)',
  'glow-lg': '0 0 30px hsl(var(--color-glow-primary) / 0.5), 0 0 60px hsl(var(--color-glow-primary) / 0.2)',
  'glow-accent': '0 0 10px hsl(var(--color-glow-accent) / 0.5)',
  'glow-secondary': '0 0 15px hsl(var(--color-glow-secondary) / 0.3)',
  'inner-glow': 'inset 0 0 30px hsl(var(--color-glow-primary) / 0.08)',
},
```

- [ ] **Step 4: 更新 backgroundImage 漸層**

```ts
backgroundImage: {
  'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  'gradient-primary': 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.7))',
  'gradient-secondary': 'linear-gradient(135deg, hsl(var(--color-secondary)), hsl(var(--color-secondary) / 0.7))',
  'gradient-accent': 'linear-gradient(135deg, hsl(var(--color-accent)), hsl(var(--color-accent) / 0.7))',
  'scanlines': 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
},
```

- [ ] **Step 5: 修正 glow keyframe 硬編碼**

替換 keyframes.glow（第 148-150 行）：

```ts
glow: {
  '0%': { boxShadow: '0 0 5px hsl(var(--color-glow-primary))' },
  '100%': { boxShadow: '0 0 20px hsl(var(--color-glow-primary)), 0 0 40px hsl(var(--color-glow-primary))' },
},
```

- [ ] **Step 6: 型別檢查**

Run: `npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add tailwind.config.ts
git commit -m "feat(theme): update Tailwind palettes, fonts, shadows for Neon Brutalist"
```

---

### Task 3: Layout 字體替換

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: 替換字體 imports**

將第 2 行改為：
```ts
import { Archivo_Black, Noto_Sans_TC, JetBrains_Mono } from "next/font/google";
```

替換字體定義（第 11-30 行）：

```ts
const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "700", "900"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});
```

- [ ] **Step 2: 更新 body className**

將第 59 行的 `${orbitron.variable} ${exo2.variable}` 改為 `${archivoBlack.variable} ${notoSansTC.variable}`

- [ ] **Step 3: 更新 theme-color meta**

將第 55 行 `content="#06b6d4"` 改為 `content="#0a0a0a"`

- [ ] **Step 4: 型別檢查 + 測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 全部通過

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx
git commit -m "feat(theme): switch fonts to Archivo Black + Noto Sans TC"
```

---

## Chunk 2: 元件樣式更新

### Task 4: GlowButton variant 更新

**Files:**
- Modify: `components/ui/GlowButton.tsx`

- [ ] **Step 1: 更新 variantClasses**

```ts
const variantClasses = {
  primary:
    "bg-primary text-white font-heading uppercase tracking-wider " +
    "border-2 border-primary/50 " +
    "shadow-[0_0_20px_hsl(var(--color-glow-primary)/0.4)] " +
    "hover:shadow-[0_0_30px_hsl(var(--color-glow-primary)/0.6)] " +
    "hover:-translate-y-0.5 active:scale-[0.97]",
  secondary:
    "bg-transparent text-secondary font-heading uppercase tracking-wider " +
    "border-2 border-secondary/50 " +
    "shadow-[0_0_10px_hsl(var(--color-glow-secondary)/0.2)] " +
    "hover:shadow-[0_0_20px_hsl(var(--color-glow-secondary)/0.4)] " +
    "hover:-translate-y-0.5 active:scale-[0.97]",
  ghost:
    "bg-transparent text-text-primary border-2 border-white/10 " +
    "hover:border-primary/30 hover:shadow-[0_0_10px_hsl(var(--color-glow-primary)/0.15)] " +
    "active:scale-[0.97]",
} as const;
```

- [ ] **Step 2: 執行測試確認無回歸**

Run: `npx vitest run components/ui/GlowButton.test.tsx`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add components/ui/GlowButton.tsx
git commit -m "feat(theme): update GlowButton variants for Neon Brutalist style"
```

---

### Task 5: GlowInput + ConfirmDialog + Toast + ErrorBoundary 更新

**Files:**
- Modify: `components/ui/GlowInput.tsx`
- Modify: `components/ui/ConfirmDialog.tsx`
- Modify: `components/ui/Toast.tsx`
- Modify: `components/ui/ErrorBoundary.tsx`

- [ ] **Step 1: GlowInput — 邊框改 2px + 背景透明**

在 GlowInput 的 `<input>` className 中：
- 替換 `bg-surface border` 為 `bg-white/[0.03] border-2`

- [ ] **Step 2: ConfirmDialog — backdrop + glass-elevated**

- 將 backdrop `bg-void/80` 改為 `bg-black/85`
- 將 dialog `glass-card` 改為 `glass-elevated`

- [ ] **Step 3: Toast — success 改用 success 語意色**

在 `Toast.tsx` 的 `IconColors` 和 `BorderColors` 中：
- `success: "text-accent"` → `success: "text-success"`
- `success: "border-accent/50 shadow-glow-accent"` → `success: "border-success/50 shadow-glow-accent"`

- [ ] **Step 4: ErrorBoundary — accent 改 primary**

全域替換 `ErrorBoundary.tsx` 中：
- `accent` → `primary`（所有 `text-accent`, `border-accent`, `bg-accent`, `bg-gradient-accent`, `shadow-glow-accent` → 對應 primary）

- [ ] **Step 5: 型別檢查 + 測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 全部通過

- [ ] **Step 6: Commit**

```bash
git add components/ui/GlowInput.tsx components/ui/ConfirmDialog.tsx components/ui/Toast.tsx components/ui/ErrorBoundary.tsx
git commit -m "feat(theme): update shared UI components for Neon Brutalist style"
```

---

### Task 6: LyricsControl 硬編碼替換

**Files:**
- Modify: `components/lyrics/LyricsControl.tsx`

- [ ] **Step 1: 替換所有 `rgba(0, 217, 255, ...)` 為 CSS 變數**

全域替換模式：
- `rgba(0, 217, 255, 0.1)` → `hsl(var(--color-glow-primary) / 0.1)`
- `rgba(0, 217, 255, 0.2)` → `hsl(var(--color-glow-primary) / 0.2)`
- `rgba(0, 217, 255, 0.3)` → `hsl(var(--color-glow-primary) / 0.3)`
- `rgba(0, 217, 255, 0.4)` → `hsl(var(--color-glow-primary) / 0.4)`

共約 14 處。

- [ ] **Step 2: 替換 SVG data URL 中的 `%2300D9FF`**

找到 selectStyle 中的 `backgroundImage` SVG `stroke='%2300D9FF'`，改為 `stroke='%23FF6B00'`（橘色 URL encoded）。

> 注意：SVG data URL 無法使用 CSS 變數，此處硬編碼新主色是唯一可行方案。

- [ ] **Step 3: 驗證無遺漏**

Run: `grep -n "00D9FF\|0, 217, 255" components/lyrics/LyricsControl.tsx`
Expected: 無結果

- [ ] **Step 4: 型別檢查**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add components/lyrics/LyricsControl.tsx
git commit -m "fix(theme): replace all hardcoded cyan rgba in LyricsControl with CSS vars"
```

---

### Task 7: AuthLayout 更新

**Files:**
- Modify: `components/auth/AuthLayout.tsx`

- [ ] **Step 1: 加入光球背景 + 改三色漸層為雙色**

在 `<main>` 內背景效果區域：
- 保留 `bg-gradient-radial from-primary/5`
- 加入兩個光球 div（橘 + 藍）

標題漸層 `from-primary via-secondary to-accent` 改為 `from-primary to-secondary`

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/auth/AuthLayout.tsx
git commit -m "feat(theme): update AuthLayout with glow orbs and dual-color gradient"
```

---

## Chunk 3: 頁面更新

### Task 8: Home 頁面

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: 更新色彩引用**

- 三色漸層 `from-primary via-secondary to-accent` → `from-primary to-secondary`
- `bg-gradient-accent` → `bg-gradient-secondary`
- `shadow-glow-accent` → `shadow-glow-secondary`
- `text-accent` → `text-secondary`（裝飾用）
- `bg-accent` (status dot) → `bg-success`（語意正確）
- 加入兩個 `.glow-orb-primary` + `.glow-orb-secondary` 到背景

- [ ] **Step 2: 型別檢查**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(theme): update Home page for Neon Brutalist palette"
```

---

### Task 9: Display 頁面 + Controller 子元件

**Files:**
- Modify: `app/display/page.tsx`
- Modify: `components/controller/*.tsx` (if needed)

- [ ] **Step 1: Display — 加入光球背景**

在 Normal 模式（非 Clean Output）的背景區域加入光球：

```tsx
{/* 背景光暈 */}
<div className="glow-orb-primary" style={{ top: '-10%', left: '-5%' }} />
<div className="glow-orb-secondary" style={{ bottom: '-10%', right: '-5%' }} />
```

- [ ] **Step 2: 掃描 Controller 子元件硬編碼**

Run: `grep -rn "00D9FF\|A855F7\|0, 217, 255\|rgba(0," components/controller/ --include="*.tsx"`

替換所有找到的硬編碼色值為 CSS 變數或 Tailwind class。

- [ ] **Step 3: 型別檢查 + 全部測試**

Run: `npx tsc --noEmit && npx vitest run`
Expected: 全部通過

- [ ] **Step 4: Commit**

```bash
git add app/display/page.tsx components/controller/
git commit -m "feat(theme): update Display + Controller components for Neon Brutalist"
```

---

## Chunk 4: 收尾

### Task 10: 全站硬編碼掃描 + 文檔

- [ ] **Step 1: 掃描殘留**

Run: `grep -rE "#00D9FF|#A855F7|rgba\(0,\s*217,\s*255" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.css" | grep -v node_modules | grep -v ".test."`

Expected: 無結果（或僅有不可替換的特殊案例如 SVG data URL）

- [ ] **Step 2: 更新 changelog**

在 `docs/changelog.md` v0.8.0 新增一行或新增 v0.8.1 條目記錄主題更換。

- [ ] **Step 3: 全套測試**

Run: `npx vitest run` — ALL PASS
Run: `npx tsc --noEmit` — 無錯誤
Run: `npm run lint` — 無新錯誤

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "feat(theme): Neon Brutalist Glass theme complete — orange/cyan palette"
```

---

## 平行化指引

此計畫所有 Task 都是序列依賴的（後續 Task 依賴前面的 CSS 變數/config 設定），不適合平行執行。

```
Task 1 (CSS vars) → Task 2 (Tailwind) → Task 3 (Fonts)
→ Task 4-7 (Components) → Task 8-9 (Pages) → Task 10 (Cleanup)
```

預估檔案數：~15 files，改動量遠小於上一輪架構重設計。

---

**計畫版本**: 1.0
**對應設計規格**: `docs/specs/2026-03-17-neon-brutalist-theme-design.md` v1.1
