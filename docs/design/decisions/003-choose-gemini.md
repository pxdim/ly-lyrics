# ADR-003: 選擇 Google Gemini API 作為 AI 聽歌辨識服務

**狀態:** 🟢 採用

**日期:** 2026-03-11
**決策者:** Architect
**相關角色:** Backend Developer, Product Manager

---

## 背景

LY 專案的核心創新功能是 **AI 聽歌自動跳轉**，需要：
- 音訊轉文字 (ASR) 能力
- 多語言支援 (中文、英文)
- 快速回應時間
- 合理的價格

---

## 決策

我們決定使用 **Google Gemini API** 作為 AI 聽歌辨識服務。

**原因:**
1. **音訊辨識能力強**: Gemini 2.0 Flash 支援音訊輸入
2. **多語言支援**: 原生支援中英文混合
3. **價格實惠**: Flash 模型成本低，適合大量調用
4. **API 簡單**: 單一端點處理音訊與理解
5. **速度快**: Flash 模型回應時間 < 1s

---

## 替代方案

### 方案 A: OpenAI Whisper API
- **優點:** 語音辨識準確率極高
- **缺點:** 只做 ASR，需要額外的歌詞比對邏輯
- **為何不採用:** 需要兩個 API 呼叫 (ASR + 比對)，增加延遲與成本

### 方案 B: Azure Speech Service
- **優點:** 企業級穩定性
- **缺點:** 價格較高，設定複雜
- **為何不採用:** 專案預算有限

### 方案 C: 本地 Whisper 模型
- **優點:** 無 API 費用
- **缺點:** 需要部署模型，伺服器需求高
- **為何不採用:** Railway 免費層資源不足

---

## 影響範圍

### 受影響的組件
- AI 聽歌辨識模組
- 音訊處理服務
- 歌詞比對演算法

### 受影響的文檔
- [ai-integration.md](../../spec/ai-integration.md)
- [architecture.md](../../spec/architecture.md)

### 需要更新的程式碼
- `lib/ai/gemini.ts`
- `lib/ai/audio-processor.ts`
- `lib/ai/lyric-matcher.ts`
- `app/api/ai/listen/route.ts`

### 成本估算
- Gemini 2.0 Flash: $0.075 / 百萬 tokens (輸入)
- 預估: 每首歌 3-5 次調用 × 每次約 500 tokens
- 每日 100 首歌 ≈ $0.01
- 每月 ≈ $0.3 (可接受)

---

## 實作計劃

- [ ] Gemini API 金鑰申請
- [ ] 音訊處理模組開發
- [ ] Prompt 模板設計
- [ ] 歌詞比對演算法
- [ ] API 整合測試

**預計完成:** 2026-04-30 (Phase 3)
**負責人:** Backend Developer

---

## 相關決策

- ADR-001: 選擇 Next.js 作為全端框架
- ADR-002: 選擇 Supabase 作為資料庫

---

**建立日期:** 2026-03-11
**最後更新:** 2026-03-11
