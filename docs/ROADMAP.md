# LY 功能開發 Roadmap

## 已完成

- [x] Go 後端遷移（Phase 0-4）
- [x] Railway 雙服務部署（ly-lyrics + ly-go-backend）
- [x] CI/CD Pipeline（GitHub Actions）
- [x] bcrypt 72-byte bug 修復
- [x] 結構化請求驗證（go-playground/validator）
- [x] Handler / WebSocket 單元測試（80+ 測試）
- [x] IP-based Rate Limiting（auth endpoints）
- [x] 結構化 JSON 日誌（request ID 追蹤）
- [x] WebSocket origin 安全強化
- [x] 遺留程式碼清理（Supabase、Socket.IO、NextAuth）

## 近期（Next）

- [ ] 歌曲搜尋強化（全文搜尋、按語言/藝人過濾）
- [ ] 播放清單排序與管理（拖拉排序、刪除單曲）
- [ ] 多裝置同步改善（重連時自動恢復狀態）
- [ ] 使用者設定同步（跨裝置共享）

## 中期（Later）

- [ ] AI 歌詞辨識（語音轉文字、自動時間對齊）
- [ ] 協作模式（多人控制同一 session）
- [ ] PWA 支援（離線瀏覽、推播通知）
- [ ] 歌詞翻譯（多語言對照）

## 長期（Future）

- [ ] 移動端原生應用（React Native / Flutter）
- [ ] 歌詞社區（分享、評分、收藏）
- [ ] 串流平台整合（Spotify、Apple Music 時間同步）
