# UI/UX 設計系統

## 設計原則

LY 系統遵循 **「清晰、高效、可讀」** 的設計原則，專注於歌詞顯示的核心功能。

---

## 色彩系統

### 主色調

| 用途 | 深色模式 | 淺色模式 |
|------|----------|----------|
| 背景 | `#0A0A0A` | `#FFFFFF` |
| 次要背景 | `#1A1A1A` | `#F5F5F5` |
| 文字 | `#FFFFFF` | `#1A1A1A` |
| 次要文字 | `#A0A0A0` | `#666666` |
| 焦點行背景 | `#FFD700` (漸層) | `#FFD700` (漸層) |
| 焦點行文字 | `#000000` | `#000000` |
| 非焦點行 | `#666666` | `#CCCCCC` |
| 邊框 | `#333333` | `#E0E0E0` |
| 主要按鈕 | `#3B82F6` | `#3B82F6` |
| 危險按鈕 | `#EF4444` | `#DC2626` |

### Tailwind CSS 設定

```css
/* tailwind.config.js */
module.exports = {
  theme: {
    extend: {
      colors: {
        // 深色模式
        dark: {
          bg: '#0A0A0A',
          surface: '#1A1A1A',
          text: '#FFFFFF',
          muted: '#A0A0A0',
        },
        // 淺色模式
        light: {
          bg: '#FFFFFF',
          surface: '#F5F5F5',
          text: '#1A1A1A',
          muted: '#666666',
        },
        // 焦點色
        highlight: {
          bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
          text: '#000000',
        },
      },
    },
  },
}
```

---

## 字體系統

### 字體家族

```css
/* 優先使用系統字體，確保載入速度 */
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  Roboto,
  "Helvetica Neue",
  Arial,
  "Noto Sans TC",
  sans-serif;
```

### 字體尺寸

| 用途 | 桌面 | 平板 | 手機 |
|------|------|------|------|
| 標題 | 24px | 20px | 18px |
| 歌詞 (大) | 72px | 56px | 40px |
| 歌詞 (中) | 48px | 36px | 28px |
| 歌詞 (小) | 32px | 24px | 20px |
| 內文 | 16px | 16px | 14px |
| 說明 | 14px | 14px | 12px |

### 行高

```css
line-height: 1.5; /* 預設 */
line-height: 1.2; /* 大標題/歌詞 */
```

---

## 間距系統

```css
/* Tailwind 預設間距 */
spacing: {
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  12: '48px',
  16: '64px',
  24: '96px',
}
```

---

## 組件設計

### 歌詞顯示組件

```typescript
// components/lyrics/LyricsDisplay.tsx
/*
 * 歌詞顯示區域設計規範
 *
 * 視覺效果:
 * - 當前行: 金色漸層背景 + 黑色粗體文字 + 輕微放大
 * - 前後行: 逐漸變暗/縮小
 * - 平滑滾動動畫
 */
```

**設計規格:**

| 屬性 | 深色模式 | 淺色模式 |
|------|----------|----------|
| 當前行背景 | 金色漸層 | 金色漸層 |
| 當前行文字 | #000000 | #000000 |
| 當前行放大 | 1.1x | 1.1x |
| 鄰近行透明度 | 0.6 | 0.6 |
| 遠端行透明度 | 0.3 | 0.3 |

### 控制按鈕

```typescript
// 控制面板按鈕設計
/*
 * 按鈕尺寸:
 * - 大按鈕 (桌面): 64x64px
 * - 中按鈕 (平板): 56x56px
 * - 小按鈕 (手機): 48x48px
 *
 * 按鈕樣式:
 * - 圓角: 12px
 * - 圓形按鈕 (主要控制)
 * - 半透明背景 (深色: rgba(255,255,255,0.1))
 */
```

---

## 響應式斷點

```css
/* Tailwind 斷點 */
screens: {
  'sm': '640px',   /* 手機橫向 */
  'md': '768px',   /* 平板直向 */
  'lg': '1024px',  /* 平板橫向 / 小筆電 */
  'xl': '1280px',  /* 桌面 */
  '2xl': '1536px', /* 大螢幕 */
}
```

### 響應式行為

| 元素 | 手機 | 平板 | 桌面 |
|------|------|------|------|
| 歌詞顯示行數 | 2-3 行 | 4-5 行 | 6-10 行 |
| 控制按鈕 | 底部固定 | 側邊 | 側邊 |
| 字體大小 | 20-40px | 24-56px | 32-72px |
| 按鈕位置 | 底部工具欄 | 右側浮動 | 右側浮動 |

---

## 動畫系統

### 過渡時間

```css
transitionDuration: {
  'fast': '150ms',
  'normal': '300ms',
  'slow': '500ms',
}
```

### 動畫緩動

```css
transitionTimingFunction: {
  'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
  'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
  'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
}
```

### 歌詞滾動動畫

```typescript
// 使用 Framer Motion 實現平滑滾動
const lyricsVariants = {
  enter: (direction: number) => ({
    y: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    y: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    y: direction < 0 ? 50 : -50,
    opacity: 0,
  }),
}
```

---

## 版面配置

### 控制端 (Controller)

```
┌─────────────────────────────────────────────────┐
│  LY  歌詞控制器                      [設定] [用戶] │
├─────────────────────────────────────────────────┤
│                                                 │
│  歌曲選擇: [▼ 測試歌曲                          │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │  第一句                                   │ │
│  │  第二句  ← 當前                           │ │
│  │  第三句                                   │ │
│  │  第四句                                   │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  顯示設定:                                      │
│  顯示行數: [4▼]  字體: [中▼]                   │
│                                                 │
│  [◀◀] [◀] [||] [▶] [▶▶]                        │
│                                                 │
│  顯示端狀態: ● 已連線 (2 個裝置)                │
└─────────────────────────────────────────────────┘
```

### 顯示端 (Display)

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│              第三句                              │
│                                                 │
│         ━━━━━━━━━━━━━━                        │
│                                                 │
│              第四句  ← 當前歌詞 (高亮)          │
│                                                 │
│         ━━━━━━━━━━━━━━                        │
│                                                 │
│              第五句                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 無障礙設計

### ARIA 標籤

```typescript
<button
  aria-label="下一句歌詞"
  aria-describedby="next-line-help"
>
  <ChevronRight />
</button>
<span id="next-line-help" className="sr-only">
  跳轉到下一句歌詞
</span>
```

### 鍵盤快捷鍵

| 快捷鍵 | 功能 |
|--------|------|
| `←` / `→` | 上一句 / 下一句 |
| `↑` / `↓` | 上一句 / 下一句 |
| `Space` | 暫停 / 繼續 |
| `Esc` | 退出全螢幕 |
| `F` | 切換全螢幕 |
| `T` | 切換主題 |

---

## 設計資產

### 圖示

使用 [Lucide React](https://lucide.dev/) 圖示庫：

```typescript
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Play,
  Pause,
  List,
  Music,
} from 'lucide-react'
```

### Logo

```svg
<!-- LY Logo -->
<svg width="120" height="40" viewBox="0 0 120 40">
  <text x="10" y="32" font-size="32" font-weight="bold" fill="#3B82F6">
    LY
  </text>
  <circle cx="50" cy="24" r="4" fill="#FFD700" />
</svg>
```

---

## Figma 設計檔

(待建立)

---

## 相關文檔

- [用戶手冊](user-manual.md)
- [需求文檔](requirements.md)

---

**文件版本:** 1.0
**最後更新:** 2026-03-11
