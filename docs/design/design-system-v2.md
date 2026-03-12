# LY Design System v2.0
**Dark Tech Edition**

> 更新日期: 2026-03-12
> 設計風格: Dark Tech / Cyberpunk UI
> 產品類型: Music Lyrics Display System

---

## 設計原則

1. **暗色科技感** - 深色背景 + 霓虹強調色
2. **無 Emoji** - 僅使用 SVG 圖標
3. **高對比度** - WCAG AAA 級別可讀性
4. **流暢動畫** - 150-300ms 平滑過渡
5. **觸控友善** - 最小 44×44px 點擊區域

---

## 配色系統

### 暗色科技調色板

| 用途 | Hex | RGB | CSS Variable |
|------|-----|-----|--------------|
| **背景 - 深黑** | `#030304` | rgb(3,3,4) | `--bg-void` |
| **背景 - 表面** | `#0A0A0C` | rgb(10,10,12) | `--bg-surface` |
| **背景 - 提升面** | `#0F1115` | rgb(15,17,21) | `--bg-elevated` |
| **主要色 - 電光藍** | `#00D9FF` | rgb(0,217,255) | `--color-primary` |
| **次要色 - 霓虹紫** | `#A855F7` | rgb(168,85,247) | `--color-secondary` |
| **強調色 - 霓虹綠** | `#00FF88` | rgb(0,255,136) | `--color-accent` |
| **文字 - 主要** | `#FFFFFF` | rgb(255,255,255) | `--text-primary` |
| **文字 - 次要** | `#8A8F98` | rgb(138,143,152) | `--text-muted` |
| **邊框 - 微光** | `rgba(255,255,255,0.08)` | - | `--border-dim` |
| **發光 - 藍色** | `rgba(0,217,255,0.3)` | - | `--glow-primary` |
| **發光 - 紫色** | `rgba(168,85,247,0.3)` | - | `--glow-secondary` |

### 狀態顏色

| 狀態 | Hex | 用途 |
|------|-----|------|
| Success | `#00FF88` | 連線成功、播放狀態 |
| Warning | `#FFB800` | 低電量、網路不穩 |
| Error | `#FF3366` | 錯誤、斷線 |
| Info | `#00D9FF` | 資訊提示 |

---

## 字體系統

### 字體選擇

| 用途 | 字體 | 權重 | Google Fonts |
|------|------|------|--------------|
| 標題 | **Orbitron** | 500, 600, 700 | [Link](https://fonts.google.com/specimen/Orbitron) |
| 正文 | **Exo 2** | 300, 400, 500, 600 | [Link](https://fonts.google.com/specimen/Exo+2) |
| 程式碼/數據 | **JetBrains Mono** | 400, 500 | [Link](https://fonts.google.com/specimen/JetBrains+Mono) |

### 字體尺寸

```css
--text-xs:   0.75rem;   /* 12px */
--text-sm:   0.875rem;  /* 14px */
--text-base: 1rem;      /* 16px */
--text-lg:   1.125rem;  /* 18px */
--text-xl:   1.25rem;   /* 20px */
--text-2xl:  1.5rem;    /* 24px */
--text-3xl:  1.875rem;  /* 30px */
--text-4xl:  2.25rem;   /* 36px */
--text-5xl:  3rem;      /* 48px */
```

### Google Fonts 引入

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Orbitron:wght@500;600;700&display=swap" rel="stylesheet">
```

```css
/* CSS 變數 */
--font-heading: 'Orbitron', sans-serif;
--font-body: 'Exo 2', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

---

## 圖標系統

### 推薦圖標庫

| 庫名稱 | 用途 | 安裝 |
|--------|------|------|
| **Lucide Icons** | 主要圖標庫 | `npm install lucide-react` |
| **Heroicons** | 輔助圖標 | `npm install @heroicons/react` |
| **Simple Icons** | 品牌標誌 | `npm install simple-icons` |

### Lucide Icons (主要使用)

```tsx
import {
  Settings,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Search,
  Plus,
  Minus,
  Wifi,
  WifiOff,
  Monitor,
  Smartphone,
  Music,
  List,
  Grid,
  Moon,
  Sun,
  Volume2,
  VolumeX,
} from 'lucide-react';
```

### 圖標使用規範

1. **尺寸標準**
   - XS: 16px (緊湊)
   - SM: 20px (內聯)
   - MD: 24px (標準)
   - LG: 32px (按鈕內)
   - XL: 48px (Hero)

2. **顏色**
   - 主要圖標: `var(--color-primary)`
   - 次要圖標: `var(--text-muted)`
   - 反轉圖標: `var(--text-primary)`

3. **禁止使用 Emoji**
   - ❌ `settings` → 使用 `<Settings />`
   - ❌ `▶️` → 使用 `<Play />`
   - ❌ `⚡` → 使用 `<Zap />` (Lucide)

---

## 間距系統

```css
--space-0:   0;
--space-1:   0.25rem;  /* 4px */
--space-2:   0.5rem;   /* 8px */
--space-3:   0.75rem;  /* 12px */
--space-4:   1rem;     /* 16px */
--space-5:   1.25rem;  /* 20px */
--space-6:   1.5rem;   /* 24px */
--space-8:   2rem;     /* 32px */
--space-10:  2.5rem;   /* 40px */
--space-12:  3rem;     /* 48px */
--space-16:  4rem;     /* 64px */
--space-20:  5rem;     /* 80px */
```

---

## 圓角系統

```css
--radius-none:   0;
--radius-sm:     0.25rem;  /* 4px */
--radius-md:     0.5rem;   /* 8px */
--radius-lg:     0.75rem;  /* 12px */
--radius-xl:     1rem;     /* 16px */
--radius-2xl:    1.5rem;   /* 24px */
--radius-full:   9999px;
```

---

## 陰影與發光效果

```css
/* 傳統陰影 (深色背景用) */
--shadow-sm:   0 1px 2px rgba(0,0,0,0.5);
--shadow-md:   0 4px 6px rgba(0,0,0,0.5);
--shadow-lg:   0 10px 15px rgba(0,0,0,0.5);
--shadow-xl:   0 20px 25px rgba(0,0,0,0.6);

/* 霓虹發光效果 */
--glow-sm:   0 0 5px var(--color-primary);
--glow-md:   0 0 10px var(--color-primary);
--glow-lg:   0 0 20px var(--color-primary), 0 0 40px var(--color-primary);

/* 內發光 */
--inner-glow: inset 0 0 20px rgba(0, 217, 255, 0.1);
```

---

## 動畫系統

```css
/* 緩動函數 */
--ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--spring:     cubic-bezier(0.175, 0.885, 0.32, 1.275);

/* 動畫持續時間 */
--duration-fast:   150ms;
--duration-base:   200ms;
--duration-normal: 300ms;
--duration-slow:   500ms;
```

### 關鍵動畫

```css
/* 淡入 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 滑入 */
@keyframes slideIn {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* 脈衝 (連線狀態) */
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 發光脈衝 */
@keyframes glowPulse {
  0%, 100% { box-shadow: var(--glow-sm); }
  50% { box-shadow: var(--glow-md); }
}

/* 霓虹閃爍 (等待狀態) */
@keyframes neonFlicker {
  0%, 18%, 22%, 25%, 53%, 57%, 100% {
    text-shadow: var(--glow-sm);
  }
  20%, 24%, 55% {
    text-shadow: none;
  }
}
```

---

## 元件規範

### 按鈕 (Buttons)

```css
/* 主要按鈕 */
.btn-primary {
  background: linear-gradient(135deg, var(--color-primary), #00B8FF);
  color: var(--bg-void);
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  font-weight: 600;
  font-family: var(--font-heading);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  cursor: pointer;
  transition: all var(--duration-base) var(--ease-out);
  box-shadow: var(--glow-sm);
}

.btn-primary:hover {
  box-shadow: var(--glow-md);
  transform: translateY(-2px);
}

.btn-primary:active {
  transform: translateY(0);
}

/* 次要按鈕 */
.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  padding: 12px 24px;
  border-radius: var(--radius-lg);
  font-weight: 500;
  border: 1px solid var(--border-dim);
  cursor: pointer;
  transition: all var(--duration-base) var(--ease-out);
}

.btn-secondary:hover {
  background: var(--bg-elevated);
  border-color: var(--color-primary);
  box-shadow: var(--glow-sm);
}

/* 圓形按鈕 (控制用) */
.btn-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--bg-elevated);
  border: 1px solid var(--border-dim);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--duration-base) var(--ease-out);
}

.btn-icon:hover {
  background: var(--bg-surface);
  border-color: var(--color-primary);
  box-shadow: var(--glow-sm);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
```

### 卡片 (Cards)

```css
.card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-dim);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  backdrop-filter: blur(10px);
  transition: all var(--duration-base) var(--ease-out);
}

.card:hover {
  border-color: rgba(0, 217, 255, 0.2);
  box-shadow: var(--inner-glow);
}

.card-glass {
  background: rgba(15, 17, 21, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### 輸入框 (Inputs)

```css
.input {
  background: var(--bg-surface);
  border: 1px solid var(--border-dim);
  border-radius: var(--radius-lg);
  padding: 12px 16px;
  color: var(--text-primary);
  font-family: var(--font-body);
  font-size: var(--text-base);
  transition: all var(--duration-base) var(--ease-out);
}

.input::placeholder {
  color: var(--text-muted);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 217, 255, 0.1);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

### 滑動條 (Range Slider)

```css
input[type="range"] {
  -webkit-appearance: none;
  width: 100%;
  height: 6px;
  background: var(--bg-surface);
  border-radius: var(--radius-full);
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  background: var(--color-primary);
  border-radius: var(--radius-full);
  cursor: pointer;
  box-shadow: var(--glow-sm);
  transition: all var(--duration-base) var(--ease-out);
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
  box-shadow: var(--glow-md);
}
```

---

## 特殊效果

### 掃描線效果 (Scanlines)

```css
.scanlines::before {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.1) 2px,
    rgba(0, 0, 0, 0.1) 4px
  );
  pointer-events: none;
  z-index: 9999;
}
```

### 漸變邊框

```css
.gradient-border {
  position: relative;
  background: var(--bg-elevated);
  border-radius: var(--radius-xl);
}

.gradient-border::before {
  content: '';
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, var(--color-primary), var(--color-secondary), var(--color-accent));
  border-radius: inherit;
  z-index: -1;
  opacity: 0.5;
}
```

---

## 響應式斷點

```css
/* 斷點 */
--breakpoint-sm:  640px;
--breakpoint-md:  768px;
--breakpoint-lg:  1024px;
--breakpoint-xl:  1280px;
--breakpoint-2xl: 1536px;
```

---

## 可訪問性 (Accessibility)

### 對比度要求
- 正文文字: 最小 4.5:1
- 大文字 (18px+): 最小 3:1
- 互動元素: 最小 3:1

### 鍵盤導航
- 所有互動元素必須可通過 Tab 鍵訪問
- Focus 狀態必須清晰可見
```css
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

### 觸控目標
- 最小尺寸: 44×44px
- 最小間距: 8px

---

## Tailwind CSS 配置

```javascript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        void: '#030304',
        surface: '#0A0A0C',
        elevated: '#0F1115',
        primary: '#00D9FF',
        secondary: '#A855F7',
        accent: '#00FF88',
      },
      fontFamily: {
        heading: ['Orbitron', 'sans-serif'],
        body: ['Exo 2', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00D9FF' },
          '100%': { boxShadow: '0 0 20px #00D9FF, 0 0 40px #00D9FF' },
        },
      },
    },
  },
  plugins: [],
}
export default config
```

---

## 禁用模式 (Anti-Patterns)

- ❌ 使用 Emoji 作為圖標
- ❌ 使用純白 (#FFFFFF) 背景
- ❌ 低對比度文字 (低於 4.5:1)
- ❌ 瞬間狀態變化 (無過渡動畫)
- ❌ 不可見的 focus 狀態
- ❌ 小於 44px 的觸控目標
- ❌ 裝飾性動畫 (無意義動畫)
- ❌ 混合多種圖標庫
