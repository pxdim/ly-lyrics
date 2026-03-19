# NDI/Spout 輸出可行性研究報告

**日期:** 2026-03-19
**對應需求:** FR8.1 ~ FR8.5, NFR1.3
**對應里程碑:** M5: Resolume 整合
**狀態:** 研究完成，待決策

---

## 1. NDI 技術本質

### 1.1 協議架構

NDI (Network Device Interface) 是由 NewTek 開發（現為 Vizrt 旗下獨立開放標準）的 AV over IP 協議，設計目標是在 Gigabit 區域網路上實現低延遲、高品質的即時影音傳輸。

**協議棧：**

```
┌─────────────────────────────────────┐
│         NDI Application API          │  ← NDI SDK 提供
├─────────────────────────────────────┤
│        NDI 編碼/解碼層               │  ← SpeedHQ (Full) / H.264/H.265 (HX3)
├─────────────────────────────────────┤
│        傳輸層                        │  ← TCP / Reliable UDP (RUDP/QUIC) / Multi-TCP
├─────────────────────────────────────┤
│        發現層                        │  ← mDNS (Bonjour) / NDI Discovery Server
├─────────────────────────────────────┤
│        網路層                        │  ← IPv4, UDP port 5353 (mDNS), TCP port 5960+
└─────────────────────────────────────┘
```

**關鍵技術細節：**

| 項目 | 說明 |
|------|------|
| 發現機制 | mDNS (multicast DNS)，UDP port 5353，廣播至 224.0.0.251 |
| 訊息伺服器 | TCP port 5960 |
| 影音串流 | TCP port 5961 起，每增一個串流 port +1 |
| 理論延遲 | 16 scan lines（約 1ms），實務上約 1 field（16-20ms） |
| 網路要求 | 單向延遲 < 150ms，jitter < 30ms |
| 支援格式 | BGRA, BGRX, UYVY, NV12, I420, P216, PA16 |
| Alpha 通道 | 支援（BGRA 格式） |

### 1.2 NDI Full Bandwidth vs NDI|HX3

| 特性 | NDI Full Bandwidth | NDI\|HX3 |
|------|-------------------|-----------|
| 編碼 | SpeedHQ (類 MPEG-2) | H.264 / H.265 |
| 頻寬 (1080p) | ~125 Mbps | ~50-80 Mbps |
| 頻寬 (4K) | ~250 Mbps | ~80-120 Mbps |
| 延遲 | 最低（< 1 frame） | 低（1-2 frames） |
| 品質 | 無失真級 | 視覺無損（visually lossless） |
| CPU 需求 | 高 | 中（GPU 加速） |
| 適用場景 | 專業製作、後製 | 直播、教會、活動 |
| Alpha 通道 | 支援 | 支援 |

**對 LY 的建議：** NDI|HX3 已足夠。歌詞文字內容不需要 Full NDI 的頻寬，HX3 的品質對文字渲染完全足夠，且頻寬友善。

### 1.3 NDI SDK 授權

| 項目 | 說明 |
|------|------|
| 費用 | **免費** — 可在免費或商業產品中使用，無授權費（royalty-free） |
| 限制 | 需遵守 SDK EULA，不可逆向工程 NDI 核心庫 |
| SDK 內容 | C/C++ header、預編譯動態庫（.dll/.dylib/.so）、範例程式碼 |
| 平台支援 | Windows x64、macOS x64/arm64、Linux x64、iOS、Android |
| GPU 需求 | 無硬性要求，但 GPU 加速可降低 CPU 負載 |

### 1.4 系統要求

- **作業系統:** Windows 10+、macOS 11+、Linux (Ubuntu 20.04+)
- **網路:** Gigabit Ethernet（建議有線，Wi-Fi 可用但不推薦用於 Full NDI）
- **CPU:** 現代多核心處理器（i5/Ryzen 5 以上）
- **GPU:** 非必要，但 HX3 可使用 NVENC/QuickSync 硬體編碼
- **記憶體:** 4GB+ 可用

---

## 2. Web 應用 + NDI 的五條可行路徑

### 路徑 A: 瀏覽器端直接 NDI 輸出

**概念：** 在瀏覽器內直接產生 NDI 串流。

**技術分析：**

| 方案 | 可行性 | 原因 |
|------|--------|------|
| WebRTC → NDI | 不可行（瀏覽器端） | WebRTC 是接收/發送 RTP 串流的協議，無法在瀏覽器內轉為 NDI；需要伺服器端橋接 |
| Canvas/WebGL capture → NDI | 不可行 | 瀏覽器沙箱禁止存取本機 NDI SDK；Canvas.captureStream() 只能產生 MediaStream |
| WASM-based NDI sender | 不可行 | NDI SDK 非開源、依賴 OS 網路棧和 mDNS，WASM 沙箱無法存取 |

**評估：**

| 項目 | 評分/說明 |
|------|-----------|
| 可行性評分 | **1/10** |
| 延遲估算 | N/A |
| 開發工作量 | N/A |
| 需安裝額外軟體 | N/A |
| 結論 | **完全不可行。** 瀏覽器沙箱根本性地阻止了直接 NDI 輸出。不應投入任何資源。 |

---

### 路徑 B: Server-side NDI（Go 後端發送 NDI）

**概念：** 瀏覽器渲染歌詞 → capture frames → WebSocket/WebRTC 送到 Go 後端 → Go 用 NDI SDK 發送。

**架構：**

```
Browser (Display page)
    │
    │  Canvas.captureStream() → MediaRecorder → raw frames
    │  或 canvas.toBlob() → 逐幀 JPEG/PNG
    │
    ▼ WebSocket (binary frames)
Go Backend (:8080)
    │
    │  解碼 frame → NDI SDK send
    │  (gondi / cgo binding)
    │
    ▼ NDI Stream
Resolume / OBS / vMix
```

**Go NDI 綁定現狀：**

| 套件 | 維護狀態 | 平台 | 備註 |
|------|---------|------|------|
| `benitogf/gondi` | 活躍（2025-05 更新） | Linux, macOS | 使用 purego（非 cgo），MIT License |
| `bitfocus/gondi` | 較舊 | Linux, macOS | 使用 purego，不支援 Windows |
| `jims/ndi-go` | 較新 | 待確認 | 支援 video/audio/metadata frame |

**延遲估算：**

```
Canvas capture:      ~16ms (60fps)
JPEG 編碼:           ~5-10ms
WebSocket 傳輸:      ~1-5ms (同機) / ~10-50ms (區域網路)
JPEG 解碼:           ~5-10ms
NDI 編碼+發送:       ~5-16ms
──────────────────────────
總計:                ~32-107ms
```

**評估：**

| 項目 | 評分/說明 |
|------|-----------|
| 可行性評分 | **4/10** |
| 延遲估算 | 50-110ms（超過 NFR1.3 的 < 50ms 目標） |
| 開發工作量 | 高 — 3-5 週（frame capture pipeline + Go NDI binding + 效能調校） |
| 需安裝額外軟體 | 否（伺服器端 NDI runtime） |
| 優點 | 使用者端零安裝；集中管理 |
| 缺點 | 延遲高、頻寬消耗大（每幀都要傳輸）、CPU/GPU 密集、架構複雜、Go NDI binding 生態不成熟 |
| 結論 | **不推薦。** 投入產出比極差。歌詞只是文字，用影像管道傳輸是大砲打蚊子。 |

---

### 路徑 C: Companion App / 外部工具

**概念：** 使用現成工具擷取瀏覽器視窗，轉為 NDI 輸出。

#### C1: NDI Screen Capture（官方免費工具）

NDI 官方提供的免費工具，可將任何桌面視窗轉為 NDI source。

```
Browser (Display ?mode=clean)
    │
    │  視窗擷取
    │
    ▼
NDI Screen Capture (官方免費工具)
    │
    │  NDI stream
    │
    ▼
Resolume / OBS / vMix
```

| 項目 | 評分/說明 |
|------|-----------|
| 可行性評分 | **7/10** |
| 延遲 | ~1-2 frames（16-33ms） |
| 開發工作量 | **零**（LY 端無需任何開發） |
| 需安裝額外軟體 | 是 — NDI Tools（免費） |
| 優點 | 零開發成本、官方維護、穩定 |
| 缺點 | 無 alpha 通道（視窗擷取含背景）、需使用者手動操作 NDI Screen Capture、解析度受視窗大小限制 |

#### C2: OBS + obs-ndi 插件（DistroAV）

```
Browser (Display ?mode=clean)
    │
    │  OBS Browser Source（內建 Chromium）
    │  或 OBS Window Capture
    │
    ▼
OBS Studio
    │
    │  obs-ndi 插件（DistroAV）
    │  支援 Dedicated NDI Output filter（保留 alpha）
    │
    ▼
NDI Stream (含 alpha 通道)
    │
    ▼
Resolume / vMix / 其他 NDI receiver
```

| 項目 | 評分/說明 |
|------|-----------|
| 可行性評分 | **8/10** |
| 延遲 | ~1 frame（16ms），Browser Source 模式更低 |
| 開發工作量 | 低 — 1-2 天（LY 端僅需確保 CSS 透明背景） |
| 需安裝額外軟體 | 是 — OBS Studio（免費）+ DistroAV 插件（免費） |
| 優點 | **支援 alpha 通道**（透過 Dedicated NDI Output filter）、OBS 是業界標準、使用者可能已有安裝、可同時串流/錄影、Browser Source 直接渲染不需開瀏覽器 |
| 缺點 | 設定步驟稍多（安裝 OBS → 安裝 DistroAV → 設定 Browser Source → 加 NDI filter）、alpha 功能偶有 bug |

#### C3: Vingester（Electron-based 專用工具）

Vingester 是開源 Electron 應用，專門將 Web URL 轉為 NDI 串流。

```
Vingester (Electron)
    │
    │  載入 LY Display URL (含 ?mode=clean)
    │  Chromium headless 渲染
    │
    ▼
NDI Stream (支援 alpha 通道，v2.6.5+ 修復)
    │
    ▼
Resolume / OBS / vMix
```

| 項目 | 評分/說明 |
|------|-----------|
| 可行性評分 | **7/10** |
| 延遲 | ~1-2 frames（16-33ms） |
| 開發工作量 | **零**（LY 端無需開發） |
| 需安裝額外軟體 | 是 — Vingester（免費開源） |
| 優點 | 專為 Web-to-NDI 設計、支援 alpha（v2.6.5+）、headless 模式不佔視窗、可同時多 URL |
| 缺點 | 社群專案維護力度不如 OBS、alpha 曾有已修復的 bug、使用者認知度低 |

**路徑 C 綜合評估：**

| 項目 | 評分/說明 |
|------|-----------|
| 可行性評分 | **8/10**（以 OBS 方案計） |
| 延遲估算 | 16-33ms（達標 < 50ms） |
| 開發工作量 | 極低 — 0-2 天 |
| 結論 | **強烈推薦作為主方案。** 特別是 OBS + DistroAV 路線已經是業界教會和活動製作的標準做法。 |

---

### 路徑 D: NDI.js（Node.js Native Addon）

**概念：** 在 Next.js server-side 或獨立 Node.js 程序中使用 `grandiose` 套件發送 NDI。

**npm 生態調查：**

| 套件 | 版本 | 最後更新 | 狀態 |
|------|------|---------|------|
| `grandiose` (Streampunk) | 0.0.4 | 2018（6 年前） | 廢棄 |
| `grandiose` (rse fork) | — | 較新 | 社群維護 |
| `grandiose` (vcync fork) | — | — | 社群維護 |

**技術限制：**

1. **套件成熟度極低** — 原作 6 年未更新，作者自述「不建議用於生產環境」
2. **Native addon 部署困難** — 需要 node-gyp、C++ 編譯工具鏈、NDI SDK 動態庫
3. **Next.js 不適合** — Next.js server-side 不適合跑影像處理密集任務；且 Vercel/Railway 部署環境可能無法安裝 NDI runtime
4. **同路徑 B 的問題** — 仍需 frame capture → 傳輸 → NDI 發送的管道

**評估：**

| 項目 | 評分/說明 |
|------|-----------|
| 可行性評分 | **3/10** |
| 延遲估算 | 40-100ms |
| 開發工作量 | 高 — 3-4 週（含 native addon 除錯、CI/CD 部署調整） |
| 需安裝額外軟體 | 是（伺服器端 NDI SDK + native build tools） |
| 優點 | 理論上可在 Node.js 生態內完成 |
| 缺點 | 套件不成熟、部署極困難、效能瓶頸、與 Next.js 架構衝突 |
| 結論 | **不推薦。** grandiose 套件品質不足以用於生產環境。 |

---

### 路徑 E: 增強現有 Clean Output Mode

**概念：** 不實作原生 NDI 發送，而是把 Clean Output mode 做到極致，讓它成為最佳的「被擷取源」。

**現有 Clean Output 分析：**

目前 `app/display/page.tsx` 已實作 `?mode=clean`：
- 純黑背景 `#000000`
- 只顯示 `<LyricsDisplay />`，無任何 UI chrome（無狀態列、連線指示器、控制按鈕）
- 斷線時不顯示重連 UI，歌詞靜止在最後同步位置

**增強方案：**

```
現有 Clean Output
    │
    ├── 增強 1: Alpha 透明背景
    │   CSS: background: transparent
    │   OBS Browser Source 原生支援 alpha
    │
    ├── 增強 2: Chroma Key 模式
    │   ?mode=clean&bg=green  → 亮綠背景 (#00FF00)
    │   後期 chroma key 去背（不推薦，alpha 更優）
    │
    ├── 增強 3: 解析度控制
    │   ?mode=clean&w=1920&h=1080
    │   CSS viewport 鎖定，確保輸出解析度一致
    │
    ├── 增強 4: 字體渲染優化
    │   -webkit-font-smoothing: antialiased
    │   text-rendering: optimizeLegibility
    │   確保文字在擷取後清晰
    │
    └── 增強 5: 效能模式
        關閉不必要的動畫/特效
        requestAnimationFrame 同步
        降低 GPU compositing 負擔
```

**OBS Browser Source 整合（業界標準做法）：**

```
OBS Studio
    │
    │  Browser Source
    │  URL: https://your-domain.com/display?mode=clean&code=XXXXXX
    │  Width: 1920, Height: 1080
    │  CSS: body { background: transparent !important; }
    │
    │  ✅ 原生支援 alpha 通道
    │  ✅ 內建 Chromium 渲染（不需開瀏覽器）
    │  ✅ 自動渲染、無需視窗擷取
    │
    ├──→ obs-ndi (DistroAV) → NDI Output
    ├──→ OBS Spout Plugin → Spout Output
    ├──→ OBS Virtual Camera → Resolume
    └──→ 直接串流/錄影
```

**評估：**

| 項目 | 評分/說明 |
|------|-----------|
| 可行性評分 | **9/10** |
| 延遲估算 | ~16ms（OBS Browser Source 直接渲染，無額外傳輸） |
| 開發工作量 | 低 — 3-5 天（alpha 背景 + 解析度控制 + 文檔撰寫） |
| 需安裝額外軟體 | 是 — OBS Studio + 視需求安裝 DistroAV 或 Spout 插件 |
| 優點 | **最低延遲**、最少開發量、OBS 是教會/活動的標準工具、alpha 通道天然支援、使用者學習曲線最低 |
| 缺點 | 依賴 OBS（但大多數目標使用者已有）、不是「原生 NDI 輸出」（需說明是設計選擇而非缺陷） |
| 結論 | **最佳方案。** 投入產出比最高，且符合業界實際做法。 |

---

## 3. Spout 可行性分析

### 3.1 Spout 是什麼

Spout 是 **Windows 專用** 的即時影像共享框架，透過 DirectX shared textures 在 GPU 記憶體層級直接分享影像資料——零拷貝、零壓縮、零延遲。

| 項目 | 說明 |
|------|------|
| 平台 | Windows only |
| 技術基礎 | DirectX 9/11/12 shared textures + OpenGL interop |
| 延遲 | ~0ms（GPU 記憶體直接共享，無編碼/傳輸） |
| 品質 | 完全無損（原始像素資料） |
| 網路 | 不支援（僅同機器內共享） |
| Alpha 通道 | 支援 |
| macOS 等價物 | Syphon（類似原理，使用 IOSurface） |

### 3.2 Web 應用直接 Spout 的可行性

**不可行。** Spout 需要 DirectX/OpenGL context 才能建立 shared texture。瀏覽器的 WebGL context 被沙箱隔離，無法建立 Spout sender。

### 3.3 Spout 在 LY 場景的實際路徑

```
OBS Studio (Windows)
    │
    │  Browser Source → LY Clean Output URL
    │
    ├──→ OBS Spout Plugin → Spout Output → Resolume Arena
    │     (obs-spout-plugin 免費)
    │
    └──→ 或 obs-ndi → NDI → Resolume
```

Resolume Arena **原生支援** Spout 輸入，任何 Spout sender 都會自動出現在 Sources tab。

**評估：**

| 項目 | 評分/說明 |
|------|-----------|
| 可行性（原生） | **1/10** — Web 應用無法直接 Spout |
| 可行性（透過 OBS） | **8/10** — OBS Spout Plugin 成熟穩定 |
| 延遲（OBS→Spout） | ~0-1 frame（GPU 層級共享） |
| 開發工作量 | **零**（LY 端無需開發，使用者安裝 OBS + Spout Plugin） |

---

## 4. 業界實際做法

### 4.1 ProPresenter（教會歌詞軟體領導品牌）

ProPresenter 是教會場景最常用的商業歌詞投影軟體。

**NDI 實作方式：**
- ProPresenter 是**原生桌面應用**（macOS/Windows），直接嵌入 NDI SDK
- 每個 Screen output 都可同時輸出為 NDI source
- 使用 NDI 6，支援 alpha 通道
- 支援 Mirror output（一次渲染，多路輸出）
- **關鍵差異：** ProPresenter 是原生應用，可直接呼叫 NDI SDK；LY 是 Web 應用，天然受瀏覽器沙箱限制

**啟示：** 原生 NDI 輸出只有原生桌面應用才能做到。Web 應用需要透過中間層（OBS/Vingester）橋接。

### 4.2 EasyWorship

- EasyWorship 7 內建 NDI 輸出
- 同為原生 Windows 桌面應用
- 限制：無法同時輸出到投影機和 NDI（需借助 vMix NDI Screen Capture 工具）
- 支援 alpha channel video 透過 NDI 輸出

### 4.3 Web-based 歌詞系統的業界共識

所有 Web-based 歌詞/字幕系統（如 OpenLP web remote、Quelea web interface）都使用相同策略：

> **Web 端提供乾淨的擷取源（transparent/black background）→ OBS/vMix/NDI Tools 擷取 → NDI/Spout/SDI 輸出**

這不是技術限制的妥協，而是 **架構上正確的關注點分離**：
- Web 應用負責：渲染、同步、控制
- 影像管道工具（OBS/vMix）負責：擷取、編碼、輸出

---

## 5. Resolume Arena 整合

### 5.1 Resolume 支援的輸入源

| 輸入類型 | Windows | macOS |
|----------|---------|-------|
| NDI | 支援（自動發現） | 支援 |
| Spout | 支援（自動發現） | N/A |
| Syphon | N/A | 支援 |
| 擷取卡 (SDI/HDMI) | 支援 | 支援 |
| 影片檔 | 支援（DXV codec 最佳） | 支援 |
| 圖片 | 支援 | 支援 |

### 5.2 Resolume 能直接載入 Web URL 嗎？

**不行。** Resolume Arena 沒有內建 Browser Source。官方論壇和文件確認的替代方案：

1. **NDI Scan Converter** 擷取瀏覽器視窗 → NDI → Resolume
2. **OBS** 擷取網頁 → Spout/NDI/Virtual Camera → Resolume
3. **Vingester** 載入 URL → NDI → Resolume

### 5.3 DXV Codec

DXV 是 Resolume 專有的 GPU 加速影片編碼格式：
- DXV3 支援 alpha 通道
- 專為即時 VJ 播放最佳化（GPU 解壓縮）
- 免費，包含在 Resolume 安裝程式中
- **與 LY 無關** — DXV 是預錄影片用的，LY 是即時渲染

### 5.4 推薦的 Resolume 整合流程

```
                    ┌─────────────────────────────┐
                    │  LY Controller (Browser)     │
                    │  操作歌詞切換                  │
                    └──────────┬──────────────────┘
                               │ WebSocket
                               ▼
                    ┌─────────────────────────────┐
                    │  Go Backend (:8080)           │
                    │  Hub broadcast               │
                    └──────────┬──────────────────┘
                               │ WebSocket
                               ▼
┌──────────────────────────────────────────────────────────┐
│  OBS Studio                                               │
│  ┌────────────────────────────────────────────┐           │
│  │  Browser Source                              │           │
│  │  URL: .../display?mode=clean&code=XXXXXX     │           │
│  │  1920x1080, background: transparent          │           │
│  └──────────────────────┬─────────────────────┘           │
│                         │                                   │
│  ┌──────────┐  ┌────────┴───────┐  ┌──────────────┐       │
│  │ NDI Out  │  │ Spout Out      │  │ Virtual Cam  │       │
│  │(DistroAV)│  │(obs-spout)     │  │ (built-in)   │       │
│  └────┬─────┘  └────────┬───────┘  └──────┬───────┘       │
└───────┼─────────────────┼─────────────────┼────────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
   Resolume          Resolume          Resolume
   (NDI input)       (Spout input)     (Camera input)
```

---

## 6. 方案比較總表

| 評估維度 | 路徑 A: 瀏覽器直接 | 路徑 B: Server NDI | 路徑 C: 外部工具 | 路徑 D: NDI.js | 路徑 E: Clean Output+ |
|---------|:-:|:-:|:-:|:-:|:-:|
| **可行性** | 1/10 | 4/10 | 8/10 | 3/10 | **9/10** |
| **延遲** | N/A | 50-110ms | 16-33ms | 40-100ms | **~16ms** |
| **開發工作量** | N/A | 3-5 週 | 0-2 天 | 3-4 週 | **3-5 天** |
| **需安裝軟體** | N/A | 否 | 是 | 是(伺服器) | **是(OBS)** |
| **Alpha 通道** | N/A | 可能 | 是 | 可能 | **是** |
| **維護成本** | N/A | 高 | 低 | 高 | **極低** |
| **使用者體驗** | N/A | 差 | 中 | 差 | **好** |
| **業界慣例** | 無 | 無 | 常見 | 無 | **標準做法** |

---

## 7. 架構決策建議

### ADR-008: NDI/Spout 輸出策略

#### Status
Proposed

#### Context

LY 歌詞顯示系統需要 FR8.1-FR8.5（NDI/Spout 輸出、透明背景、解析度調整、Chroma Key），目標是整合到 Resolume Arena 等 VJ 軟體。作為 Web-based 應用，瀏覽器沙箱根本性地阻止了直接呼叫 NDI SDK 或建立 Spout shared texture。

業界所有 Web-based 歌詞/字幕系統都採用「提供乾淨擷取源 + 外部工具輸出」的策略。ProPresenter、EasyWorship 等能做到原生 NDI 輸出，是因為它們是原生桌面應用。

#### Decision

**採用路徑 E（增強 Clean Output Mode）作為主方案，路徑 C（OBS + DistroAV）作為推薦的輸出管道：**

1. **增強 Clean Output mode（LY 端開發）：**
   - 新增 `?mode=clean&bg=transparent` 支援 alpha 透明背景
   - 新增 `?mode=clean&bg=green` 支援 Chroma Key 綠幕
   - 新增 `?mode=clean&w=1920&h=1080` 鎖定輸出解析度
   - 最佳化文字渲染品質（anti-aliasing、subpixel rendering）
   - 撰寫 OBS Browser Source + DistroAV NDI 整合指南

2. **不自行實作 NDI sender/Spout sender：**
   - 延遲表現不會更好（OBS Browser Source 是 in-process 渲染）
   - 開發+維護成本巨大（3-5 週 vs 3-5 天）
   - 使用者仍需安裝 NDI runtime
   - 穩定性風險高（依賴不成熟的第三方 binding）

3. **提供官方整合文檔：**
   - OBS + Browser Source + DistroAV 步驟教學
   - Vingester 快速設定指南
   - Resolume Arena 接收 NDI/Spout 的設定步驟

#### Consequences

**變得更容易：**
- 開發週期從 3-5 週縮短到 3-5 天
- 維護成本極低（只需維護 CSS/HTML，不需維護 native binding）
- 使用者可選擇熟悉的工具（OBS/vMix/Vingester）
- Alpha 通道透過 OBS Browser Source 天然支援
- 延遲 ~16ms 優於自建方案

**變得更困難/需要犧牲：**
- 需求文檔中的「支援 NDI 協議輸出」嚴格來說是由 OBS 完成，不是 LY 自身
- 使用者需安裝 OBS + 插件（但目標使用者——教會影像團隊——通常已有 OBS）
- 無法宣稱「原生 NDI 輸出」作為行銷賣點
- 若未來確實需要原生 NDI（如無頭部署場景），需要重新評估路徑 C3 (Vingester) 或路徑 B

---

## 8. 開發計畫

如果採納 ADR-008，M5 里程碑的開發內容調整為：

| 任務 | 工作量 | 優先級 |
|------|--------|--------|
| Clean Output alpha 透明背景支援 | 1 天 | P0 |
| Clean Output 解析度鎖定參數 | 1 天 | P1 |
| Clean Output Chroma Key 模式 | 0.5 天 | P2 |
| 文字渲染品質最佳化 | 0.5 天 | P1 |
| OBS Browser Source 整合指南 | 1 天 | P0 |
| Resolume 整合指南 | 0.5 天 | P1 |
| Vingester 快速設定指南 | 0.5 天 | P2 |
| 整合測試（OBS→NDI→Resolume） | 1 天 | P0 |
| **總計** | **~6 天** | |

對比原始估計（M5: 2 週），開發時間大幅縮短，且成果更穩定可靠。

---

## 9. 未來演進路徑

如果未來需要「零安裝即用 NDI」，有兩個演進方向：

### 9.1 Vingester 整合（短期）

將 Vingester 作為 LY 的「NDI Bridge」推薦工具，撰寫一鍵腳本：

```bash
# 使用者執行
vingester --url "https://lys.pxdim.com/display?mode=clean&code=XXXXXX" \
          --ndi "LY Lyrics" \
          --width 1920 --height 1080 \
          --transparent
```

### 9.2 Tauri/Electron Companion App（中長期）

如果需要品牌化的 NDI 輸出體驗：

```
LY NDI Bridge (Tauri app, ~5MB)
    │
    │  內嵌 WebView → 載入 LY Display URL
    │  + 綁定 NDI SDK → 直接輸出 NDI
    │
    ▼
NDI Stream "LY Lyrics"
```

- Tauri 比 Electron 輕量（5MB vs 100MB+）
- 可使用 Rust FFI 綁定 NDI SDK（比 Node.js native addon 穩定得多）
- 預估開發：3-4 週

但在目前階段，這是過度工程化——OBS 方案已經解決了 99% 的使用場景。

---

## Sources

- [NDI SDK Licensing](https://docs.ndi.video/all/developing-with-ndi/sdk/licensing)
- [NDI Protocols - White Paper](https://docs.ndi.video/all/getting-started/white-paper/ndi-protocols)
- [NDI mDNS Discovery](https://docs.ndi.video/all/getting-started/white-paper/discovery-and-registration/mdns)
- [NDI - Wikipedia](https://en.wikipedia.org/wiki/Network_Device_Interface)
- [Full NDI vs NDI HX3 - BirdDog](https://birddog.tv/fullndi-vs-ndihx3/)
- [Understanding NDI Versions - Videoguys](https://videoguys.com/blogs/news-and-sales/understanding-ndi-versions-full-ndi-vs-ndi-hx-hx2-and-hx3)
- [grandiose - npm](https://www.npmjs.com/package/grandiose)
- [grandiose - GitHub (Streampunk)](https://github.com/Streampunk/grandiose)
- [grandiose - GitHub (rse fork)](https://github.com/rse/grandiose)
- [gondi - Go NDI wrapper](https://pkg.go.dev/github.com/benitogf/gondi)
- [gondi - Bitfocus (Go NDI wrapper)](https://github.com/bitfocus/gondi)
- [Vingester - Web to NDI](https://vingester.app/)
- [Vingester - GitHub (rse)](https://github.com/rse/vingester)
- [Vingester alpha transparency fix](https://github.com/rse/vingester/issues/52)
- [NDI Screen Capture Tool](https://ndi.video/tools/screen-capture/)
- [DistroAV (obs-ndi) - Alpha Channel Issue](https://github.com/Palakis/obs-ndi/issues/68)
- [DistroAV - Alpha Layer Discussion](https://github.com/obs-ndi/obs-ndi/issues/124)
- [OBS Browser Source Transparency](https://obsproject.com/forum/threads/translucent-transparent-browser-source.59549/)
- [Spout2 - GitHub](https://github.com/leadedge/Spout2)
- [Spout Official Site](https://leadedge.github.io/)
- [Resolume - NDI Input/Output](https://resolume.com/support/NDI_inputs_and_outputs)
- [Resolume - Syphon/Spout](https://resolume.com/support/en/syphonspout)
- [Resolume DXV Codec](https://www.resolume.com/software/codec)
- [Resolume Forum - Web Content](https://resolume.com/forum/viewtopic.php?t=14317)
- [ProPresenter NDI Setup](https://support.renewedvision.com/hc/en-us/articles/360011610893-Using-NDI-output-with-ProPresenter-6)
- [ProPresenter NDI Troubleshooting](https://support.renewedvision.com/hc/en-us/articles/4403014667283-NDI-Troubleshooting)
- [EasyWorship NDI Integration](https://churchleaders.com/ministry-tech-leaders/355367-easyworship.html)
- [EasyWorship NDI Setup](https://support.easyworship.com/support/solutions/articles/24000020413-ndi-setup)
- [NDI to WebRTC - Softvelum](https://softvelum.com/2025/07/ndi-whep-webrtc-workflow/)
- [Central Control - NDI WebRTC](https://centralcontrol.io/connect-webrtc/)
- [Electron Capture - GitHub](https://github.com/steveseguin/electroncapture)
- [NDI Open Standard Turns Ten - IBC](https://www.ibc.org/ibc-show/news/ndi-open-standard-turns-ten-with-renewed-ambition/22439)
