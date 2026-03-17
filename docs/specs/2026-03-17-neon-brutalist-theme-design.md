# Neon Brutalist Glass 主題設計規格書

**版本:** 1.1
**日期:** 2026-03-17
**狀態:** Final

---

## 1. 設計方向

**風格名稱:** Neon Brutalist Glass

**核心特徵:**
- 純黑背景 + 螢光色 glow 光暈
- backdrop-filter 毛玻璃卡片 + 粗邊框（2px solid）
- 超大字體標題 + 強烈 text-shadow
- 高對比度：暗底 + 鮮豔螢光色

**設計原則:**
1. **衝擊優先** — 歌詞文字是主角，用螢光色 + 巨型字重讓它搶眼
2. **層次透明** — 毛玻璃創造深度，背景光暈提供氛圍
3. **最少裝飾** — Brutalist 精神：功能即形式，不加無意義的裝飾

---

## 2. 色盤

### 2.1 CSS 變數定義（更新 globals.css `:root` 中的色盤值）

> **注意**：僅更新色盤相關變數。動效 timing tokens（`--ease-*`, `--duration-*`）維持不變，不在此列出。

```css
:root {
  /* === 背景層次 === */
  --color-void: 0 0% 4%;              /* #0A0A0A 純黑底 */
  --color-surface: 0 0% 7%;            /* #121212 毛玻璃基底 */
  --color-elevated: 0 0% 10%;          /* #1A1A1A 提升層 */

  /* === 品牌色 === */
  --color-primary: 25 100% 50%;        /* ~#FF6B00 烈焰橘 */
  --color-secondary: 186 100% 50%;     /* ~#00D4FF 冰藍 */
  --color-accent: 145 80% 45%;         /* 保持綠色，用於 success 語意場景 */

  /* === 文字 === */
  --color-text-primary: 0 0% 100%;     /* #FFFFFF */
  --color-text-muted: 0 0% 50%;        /* #808080 */

  /* === 邊框 === */
  --color-border-dim: 0 0% 100% / 0.08;    /* 預設毛玻璃邊框 */

  /* === 語意色 === */
  --color-success: 145 80% 45%;        /* 綠（與 accent 同色，語意一致） */
  --color-warning: 35 95% 55%;         /* 黃橘 */
  --color-error: 0 85% 55%;            /* 紅 */

  /* === 發光專用 === */
  --color-glow-primary: 25 100% 50%;   /* 橘光 */
  --color-glow-secondary: 186 100% 50%; /* 藍光 */
  --color-glow-accent: 145 80% 45%;    /* 綠光（保持與 accent 一致） */

  /* === 動效 timing（不變，僅列出供參考）=== */
  /* --ease-out, --ease-in-out, --ease-spring: 維持現有值 */
  /* --duration-fast, --duration-normal, --duration-slow, --duration-dramatic: 維持現有值 */
}
```

### 2.2 色彩遷移對照表

| Token | 舊值 | 新值 | 備註 |
|-------|------|------|------|
| `primary` | Cyan #00D9FF | 烈焰橘 ~#FF6B00 | 全站主色 |
| `secondary` | Purple #A855F7 | 冰藍 ~#00D4FF | 輔色 |
| `accent` | Green #00FF88 | **保持綠色** #00FF88 → `145 80% 45%` | 用於 success/connected 語意，不改為橘色 |
| `success` | 綠 | 綠（不變） | 與 accent 同色 |
| `glow-primary` | Cyan | 橘光 | 所有主 glow 效果 |
| `glow-secondary` | Purple | 藍光 | 輔助 glow |
| `glow-accent` | Green | **保持綠光** | ConnectionIndicator 等 |

### 2.3 accent 色遷移詳細映射

> accent 保持綠色，語意不變。以下是現有 accent 使用處的處理方式：

| 使用處 | 現有用途 | 處理 |
|--------|---------|------|
| `app/page.tsx` FeatureCard | 裝飾色（三色漸層） | 改為 `primary → secondary` 雙色漸層 |
| `app/page.tsx` 三色 gradient | `from-primary via-secondary to-accent` | 改為 `from-primary to-secondary` |
| `components/ui/Toast.tsx` success type | `text-accent border-accent` | 改為 `text-success border-success`（語意更正確） |
| `components/ui/ErrorBoundary.tsx` | 裝飾色 | 改為 `primary`（主品牌色） |
| `components/display/ConnectionIndicator.tsx` | Connected 綠燈 | 保持 `accent`（綠色=連線正常） |
| `components/display/ConnectionStatusBar.tsx` | 恢復連線提示 | 保持 `accent`（綠色=連線恢復） |

### 2.2 Tailwind shade palette 更新

Primary (烈焰橘):
```
50: '#FFF3E6', 100: '#FFE0BF', 200: '#FFC285',
300: '#FFA34A', 400: '#FF8A1F', 500: '#FF6A00',
600: '#CC5500', 700: '#993F00', 800: '#662A00',
900: '#331500'
```

Secondary (冰藍):
```
50: '#E6FDFF', 100: '#B3F8FF', 200: '#80F3FF',
300: '#4DEEFF', 400: '#1AE9FF', 500: '#00E5FF',
600: '#00B8CC', 700: '#008A99', 800: '#005C66',
900: '#002E33'
```

---

## 3. 字體

### 3.1 字體堆疊

| 用途 | 字體 | 字重 | CSS 變數 |
|------|------|------|---------|
| 英文標題 | Archivo Black | 400 (Black 是唯一字重) | `--font-heading` |
| 中文全站 | Noto Sans TC | 400, 500, 700, 900 | `--font-body` |
| 等寬/代碼 | JetBrains Mono | 400, 700 | `--font-mono` |

### 3.2 字體載入（next/font/google）

使用 Next.js `next/font/google` 自動最佳化（subsetting、self-hosting、無 layout shift）。替換現有 `layout.tsx` 中的 `Orbitron` 和 `Exo_2`：

```ts
// app/layout.tsx
import { Archivo_Black, Noto_Sans_TC, JetBrains_Mono } from "next/font/google";

const archivoBlack = Archivo_Black({ weight: "400", subsets: ["latin"], variable: "--font-heading" });
const notoSansTC = Noto_Sans_TC({ weight: ["400", "500", "700", "900"], subsets: ["latin"], variable: "--font-body" });
const jetbrainsMono = JetBrains_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-mono" });
```

> **注意**：`Noto_Sans_TC` 是 CJK 字體，Next.js 會自動 subset。若 `next/font/google` 不支援 weight 900，退回至 `<link>` 標籤載入並在實作時驗證。

### 3.3 Tailwind fontFamily 設定

```ts
fontFamily: {
  heading: ['"Archivo Black"', '"Noto Sans TC"', 'sans-serif'],
  body: ['"Noto Sans TC"', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'monospace'],
},
```

### 3.4 字體使用規則

- **LY 品牌標題**: Archivo Black, 48-56px, letter-spacing 14-16px
- **頁面標題**: Archivo Black, 24-32px
- **歌詞高亮行**: Noto Sans TC Black (900), 22-28px
- **歌詞非高亮**: Noto Sans TC Regular (400), 12-14px
- **UI 標籤/按鈕**: Noto Sans TC Medium-Bold (500-700), 12-14px
- **小型資訊**: Noto Sans TC Regular (400), 10-11px

---

## 4. 毛玻璃（Glassmorphism）規範

### 4.1 Glass Card 基本樣式（覆蓋現有 `.glass-card`）

現有 `.glass-card` 使用 `@apply bg-elevated/80 backdrop-blur-xl border border-border-dim rounded-2xl`。
更新為 Neon Brutalist 風格（粗邊框 + 低透明度背景）：

```css
.glass-card {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid hsl(var(--color-primary) / 0.3);
  border-radius: 16px;
}
```

> 所有現有 `.glass-card` 使用處（ConfirmDialog、AuthLayout、Song Info Overlay）自動繼承新樣式。

### 4.2 Glass 變體（新增 CSS classes）

| 變體 | border 色 | 背景透明度 | 用途 | 使用處 |
|------|-----------|-----------|------|--------|
| `.glass-card`（base） | `--color-primary / 0.3` | 0.04 | 預設（= glass-primary） | AuthLayout card、Song Info、FeatureCard |
| `.glass-secondary` | `--color-secondary / 0.2` | 0.03 | 次要面板 | LivePreview |
| `.glass-subtle` | `white / 0.08` | 0.03 | 低調容器 | Header、Toast、ConnectionStatusBar |
| `.glass-elevated` | `--color-primary / 0.4` | 0.06 | Modal/浮動面板 | ConfirmDialog（覆蓋 base） |

### 4.3 背景光暈（Ambient Glow）

每個頁面底層放置 2-3 個模糊光球提供氛圍：

```css
.glow-orb-primary {
  position: fixed;
  width: 300px;
  height: 300px;
  background: hsl(var(--color-glow-primary));
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.15;
  pointer-events: none;
}

.glow-orb-secondary {
  /* 同上，使用 --color-glow-secondary，opacity: 0.10 */
}
```

光球位置：
- 主光球（橘）：左上或中上偏移
- 輔光球（藍）：右下偏移
- 光球不動（靜態），避免分散歌詞注意力

---

## 5. 元件樣式更新

### 5.1 GlowButton

```ts
const variantClasses = {
  primary:
    "bg-primary text-white font-heading uppercase tracking-wider " +
    "shadow-[0_0_20px_hsl(var(--color-glow-primary)/0.4)] " +
    "hover:shadow-[0_0_30px_hsl(var(--color-glow-primary)/0.6)] " +
    "hover:-translate-y-0.5 active:scale-[0.97] " +
    "border-2 border-primary/50",
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
};
```

### 5.2 GlowInput

```css
/* 基本 */
background: rgba(255, 255, 255, 0.03);
border: 2px solid hsl(var(--color-border-dim));
border-radius: 12px;

/* Focus */
border-color: hsl(var(--color-primary));
box-shadow: 0 0 0 3px hsl(var(--color-glow-primary) / 0.15),
            0 0 20px hsl(var(--color-glow-primary) / 0.1);
```

### 5.3 ConfirmDialog

- Backdrop: `bg-black/85 backdrop-blur-sm`（現有 `bg-void/80` 改為更深）
- Dialog card: `glass-elevated` 變體（`border-2 border-primary/40 bg-white/[0.06]`）
- 一般確認鈕: GlowButton primary
- Destructive 確認鈕: `border-2 border-error/50 text-error shadow-[0_0_10px_hsl(var(--color-error)/0.2)]`

### 5.4 Toast

- 底色: `glass-subtle` 毛玻璃
- 左邊框: `border-l-2 border-primary`（或語意色：success=`border-success`, error=`border-error`）
- glow: `box-shadow: 0 4px 20px hsl(var(--color-glow-primary) / 0.12)`
- **Success type**: 改用 `text-success border-success`（不再用 `text-accent`，語意更明確）

### 5.5 Spinner

- 使用 `currentColor` 繼承父層文字色，無需修改。CSS 變數更新後自動跟隨。

### 5.6 ErrorBoundary

- 現有 `accent` 裝飾色全部改為 `primary`（橘色品牌色）
- `scanlines` 背景保留（已用 Tailwind `bg-scanlines` utility）
- 漸層 `bg-gradient-accent` 改為 `bg-gradient-primary`（見 Section 5.8）

### 5.7 LyricsControl 硬編碼修復

`components/lyrics/LyricsControl.tsx` 有 ~20 處硬編碼 `rgba(0, 217, 255, ...)` inline styles（舊 cyan 色）。必須全部替換：
- `rgba(0, 217, 255, 0.2)` → `hsl(var(--color-glow-primary) / 0.2)` 或對應 Tailwind class
- `stroke='%2300D9FF'` SVG → 改用 `currentColor` 或 `stroke='%23FF6B00'`
- 所有 hover handler inline styles → 改用 CSS 變數

### 5.8 Tailwind backgroundImage 漸層更新

```ts
backgroundImage: {
  'gradient-primary': 'linear-gradient(135deg, hsl(var(--color-primary)), hsl(var(--color-primary) / 0.7))',
  'gradient-secondary': 'linear-gradient(135deg, hsl(var(--color-secondary)), hsl(var(--color-secondary) / 0.7))',
  // scanlines 保留不變
  scanlines: 'repeating-linear-gradient(...)', // 現有值不變
},
```

### 5.9 Tailwind boxShadow 更新

```ts
boxShadow: {
  'glow-sm': '0 0 10px hsl(var(--color-glow-primary) / 0.3)',
  'glow-md': '0 0 20px hsl(var(--color-glow-primary) / 0.4)',
  'glow-lg': '0 0 30px hsl(var(--color-glow-primary) / 0.5), 0 0 60px hsl(var(--color-glow-primary) / 0.2)',
  'glow-secondary': '0 0 15px hsl(var(--color-glow-secondary) / 0.3)',
  'inner-glow': 'inset 0 0 30px hsl(var(--color-glow-primary) / 0.08)',
},
```

---

## 6. 頁面設計

### 6.1 Home 頁面

- **背景**: 純黑 + 2 個靜態光球（橘左上、藍右下）
- **標題 "LY"**: Archivo Black 56px, 白色, `text-shadow: 0 0 40px` 橘光
- **副標題**: Noto Sans TC 500, 冰藍色
- **CTA 按鈕**: GlowButton primary + secondary 雙按鈕
- **FeatureCard**: `glass-primary` 卡片，hover 時 border 亮度提升
- **動效**: 維持現有 staggered entrance，標題加 subtle glow pulse

### 6.2 Login / Register 頁面

- **AuthLayout 更新**: 背景改純黑 + 光球，glass card 改用 `glass-elevated`
- **Logo "LY"**: Archivo Black + 橘色 glow
- **GlowInput**: 2px 粗邊框，focus 時橘光
- **GlowButton**: primary variant，全寬
- **錯誤提示**: `border-2 border-error/50` + red glow + shake 動效
- **連結文字**: 冰藍色 hover 橘色

### 6.3 Controller 頁面

- **整體**: 純黑底 + 1 個微弱橘光球（左上）
- **Header**: `glass-subtle`，session code 用 `font-mono` + 橘色
- **Panel 邊框**: 所有 resizable panel 分隔線改為 `border-primary/20`
- **SongLibrary**: 歌曲卡片 `glass-subtle`，選中時 `border-primary/50` + glow
- **CueGrid**: 當前行高亮用橘色背景 `bg-primary/15` + 左邊框 `border-l-2 border-primary`
- **QuickSettings**: toggle switch 開啟時橘色
- **LivePreview**: `glass-secondary` 邊框，歌詞預覽沿用 Display 風格
- **MobileTabBar**: 純黑底，active tab 橘色圖示 + 底部橘色指示線

### 6.4 Display 頁面

- **Normal 模式**:
  - 背景: 純黑 + 2 個大光球（橘 + 藍），比其他頁面更亮（opacity 0.2）
  - 歌詞高亮行: Noto Sans TC 900, 白色, `text-shadow` 橘光
  - 歌詞非高亮: Noto Sans TC 400, `text-muted`
  - Song Info Overlay: `glass-primary` 卡片，`animate-fade-out-slow`
  - ConnectionStatusBar: `glass-subtle` 毛玻璃
  - LyricsControl: `glass-subtle`，按鈕用橘色

- **Clean Output 模式**: 不變（純黑 `#000000`，無 UI chrome）

---

## 7. 動效

維持現有 motion token 系統，不新增動效。僅調整：

| 動效 | 變更 |
|------|------|
| `neon-pulse` | keyframes 改為橘色 glow（原 cyan） |
| `focus-glow` | 改為橘色 shadow 脈搏 |
| `glow` | keyframe 硬編碼 `#00D9FF` 改為 `hsl(var(--color-glow-primary))` |
| 其他 | 不變（fade-out, scale-in, shake, slide-in 均保留） |

---

## 8. 實作範圍

由於設計系統已統一到 CSS 變數，此次換膚的核心改動：

### 必改檔案

| 檔案 | 改動 |
|------|------|
| `app/globals.css` | CSS 變數值（色盤）、`.glass-card` + 變體 class、`.glow-orb-*` class、neon-pulse/glow keyframe |
| `tailwind.config.ts` | shade palette、boxShadow、fontFamily、backgroundImage 漸層 |
| `app/layout.tsx` | `next/font/google` 改為 Archivo_Black + Noto_Sans_TC + JetBrains_Mono，更新 `theme-color` meta |
| `components/ui/GlowButton.tsx` | variant classes 調整邊框 2px + glow 色 |
| `components/ui/GlowInput.tsx` | 邊框 2px + focus glow 色 |
| `components/ui/ConfirmDialog.tsx` | backdrop `bg-black/85`、card `glass-elevated` |
| `components/ui/Toast.tsx` | success type 改用 `text-success border-success` |
| `components/ui/ErrorBoundary.tsx` | `accent` → `primary`，`bg-gradient-accent` → `bg-gradient-primary` |
| `components/auth/AuthLayout.tsx` | 背景改純黑 + 光球 + glass card 自動繼承新樣式 |
| `components/lyrics/LyricsControl.tsx` | ~20 處硬編碼 rgba 替換為 CSS 變數 |

### 各頁面微調

| 檔案 | 改動 |
|------|------|
| `app/page.tsx` | 光球背景、三色漸層改雙色、FeatureCard accent→primary |
| `app/login/page.tsx` | 已使用 AuthLayout + GlowInput，應自動繼承 |
| `app/register/page.tsx` | 同上 |
| `app/controller/page.tsx` | 微調面板邊框色 |
| `components/controller/*.tsx` | 各子元件配色微調（大部分透過 CSS 變數自動生效） |
| `app/display/page.tsx` | Normal 模式光球 + 歌詞 glow 色 |
| `components/display/ConnectionIndicator.tsx` | 保持 accent 綠色（語意正確） |
| `components/display/ConnectionStatusBar.tsx` | 保持 accent 綠色 + 改用 `glass-subtle` |

### 不改的

- 元件結構（已拆分完成）
- Store 邏輯
- WebSocket 通訊
- Go 後端
- Display Clean Output 模式
- Spinner（使用 currentColor 自動跟隨）

---

## 9. 與前次重設計的差異

| 項目 | v0.8.0（架構重設計） | 本次（視覺主題） |
|------|---------------------|----------------|
| 重點 | Token 安全、設計系統統一、Controller 拆分 | 純視覺風格更換 |
| 改動範圍 | 61 files, 3835+/2846- | 預估 ~15 files |
| 後端 | Go auth handler 重寫 | 不動 |
| 元件結構 | 新增 9 個 Controller 子元件 + 5 個共用元件 | 不動，只改 class |
| 測試 | 新增 46 個測試 | 僅視覺，無新邏輯測試 |
