# 監控策略

**系統:** LY 歌詞即時顯示系統
**部署平台:** Railway
**後端日誌格式:** JSON 結構化日誌 (`log/slog`)

---

## 1. SLO 定義（Service Level Objectives）

### 1.1 核心 SLO

| SLO 名稱 | SLI 定義 | 目標 | 視窗 | 說明 |
|-----------|----------|------|------|------|
| API 可用性 | `count(status < 500) / count(total_requests)` | 99.9% | 30 天 | 每月允許 43 分鐘不可用 |
| API 延遲 (p99) | `count(duration < 500ms) / count(total_requests)` | 99% | 30 天 | 99% 的請求在 500ms 內完成 |
| WebSocket 同步延遲 | `count(sync_latency < 100ms) / count(total_syncs)` | 95% | 30 天 | 歌詞同步延遲目標 < 100ms |
| WebSocket 連線成功率 | `count(ws_connected) / count(ws_attempts)` | 99.5% | 30 天 | 連線建立成功率 |

### 1.2 Error Budget 計算

以 30 天視窗計算：

| SLO | 目標 | 允許失敗量 (假設 10 萬次請求/月) |
|-----|------|------|
| API 可用性 99.9% | 0.1% error budget | 100 次失敗 |
| API 延遲 99% | 1% error budget | 1,000 次超時 |

**Error Budget 使用原則:**
- Budget > 50%: 正常開發新功能
- Budget 50%-80%: 暫停新功能，優先處理穩定性
- Budget > 80%: 凍結部署，全力修復可靠性問題

---

## 2. Railway 內建監控

Railway 平台提供以下監控項目，無需額外設定：

### 2.1 資源指標

| 指標 | 路徑 | 說明 |
|------|------|------|
| CPU 使用率 | Dashboard -> Service -> Metrics | 百分比 / vCPU 用量 |
| 記憶體使用 | Dashboard -> Service -> Metrics | MB/GB，含 RSS + Cache |
| 網路流量 | Dashboard -> Service -> Metrics | Ingress / Egress bytes |
| 磁碟使用 | Dashboard -> Service -> Metrics | 僅限 persistent volume |

### 2.2 部署資訊

| 項目 | 說明 |
|------|------|
| 部署歷史 | 每次部署的 commit、建置時間、狀態 |
| 建置日誌 | Docker build 日誌 |
| 即時日誌 | 應用程式 stdout/stderr 串流 |
| 環境變數 | 可在 dashboard 即時修改並觸發重部署 |

### 2.3 資料庫監控 (PostgreSQL)

| 指標 | 說明 |
|------|------|
| 連線數 | 活躍連線數（Go 後端限制 MaxOpenConns=25） |
| 儲存空間 | 使用量 / 配額 |
| 查詢效能 | 需依賴 Go 後端日誌中的 query timing |

### 2.4 Redis 監控

| 指標 | 說明 |
|------|------|
| 記憶體使用 | used_memory / maxmemory |
| 連線數 | connected_clients |
| 命中率 | keyspace_hits / (hits + misses) |

---

## 3. 外部 Uptime Monitoring

Railway 不提供主動探測式的 uptime monitoring，需搭配外部服務：

### 3.1 推薦方案

| 服務 | 免費額度 | 推薦原因 |
|------|---------|---------|
| **UptimeRobot** | 50 monitors, 5 min interval | 免費、穩定、支援 webhook |
| **Better Uptime** | 10 monitors, 3 min interval | UI 佳、status page 內建 |
| **Uptime Kuma** (self-hosted) | 無限制 | 完全控制、可部署於 Railway |

### 3.2 監控端點配置

| 端點 | 方法 | 預期回應 | 檢查間隔 | 用途 |
|------|------|---------|---------|------|
| `https://<go-backend-domain>/api/go-health` | GET | 200 OK | 60s | Go 後端 + 資料庫存活 |
| `https://<frontend-domain>/` | GET | 200 OK | 60s | Next.js 前端存活 |
| `wss://<go-backend-domain>/ws` | WebSocket | 101 Upgrade | 300s | WebSocket 服務存活 |

### 3.3 告警通知管道

| 優先級 | 通知方式 | 延遲 | 場景 |
|--------|---------|------|------|
| Critical | SMS + Email | 即時 | 服務完全不可用 > 2 分鐘 |
| Warning | Email + Slack/Discord | 5 分鐘 | 回應時間 > 2 秒或間歇性失敗 |
| Info | Slack/Discord | 15 分鐘 | 部署完成、效能基準偏移 |

---

## 4. 應用層級監控（Golden Signals）

### 4.1 結構化日誌指標

Go 後端使用 `log/slog` JSON 格式輸出，以下為關鍵日誌欄位：

```json
{
  "time": "2026-03-19T10:00:00Z",
  "level": "INFO",
  "msg": "HTTP request",
  "method": "POST",
  "path": "/api/songs",
  "status": 200,
  "duration_ms": 45,
  "ip": "203.0.113.1"
}
```

### 4.2 四大黃金信號

#### Latency（延遲）

| 指標 | 正常範圍 | Warning 閾值 | Critical 閾值 |
|------|---------|-------------|--------------|
| API p50 | < 50ms | > 200ms | > 500ms |
| API p95 | < 150ms | > 400ms | > 1s |
| API p99 | < 300ms | > 800ms | > 2s |
| WebSocket 同步 | < 50ms | > 100ms | > 500ms |

#### Traffic（流量）

| 指標 | 說明 | 監控方式 |
|------|------|---------|
| HTTP RPS | 每秒 HTTP 請求數 | 日誌聚合 |
| WebSocket 連線數 | 同時在線 WebSocket 連線 | Hub.Clients() 計數 |
| 活躍 session 數 | 同時使用中的控制台 | Redis session 計數 |

#### Errors（錯誤）

| 指標 | 正常範圍 | Warning 閾值 | Critical 閾值 |
|------|---------|-------------|--------------|
| 5xx 率 | < 0.01% | > 0.1% | > 1% |
| 4xx 率 | < 5% | > 10% | > 20% |
| WebSocket 斷線率 | < 0.5% | > 2% | > 5% |
| 認證失敗率 | < 1% | > 5% | > 10% |

#### Saturation（飽和度）

| 指標 | 正常範圍 | Warning 閾值 | Critical 閾值 |
|------|---------|-------------|--------------|
| CPU 使用率 | < 50% | > 70% | > 90% |
| 記憶體使用率 | < 60% | > 75% | > 90% |
| DB 連線池使用率 | < 60% (15/25) | > 80% (20/25) | > 95% (24/25) |
| Redis 記憶體 | < 50% | > 70% | > 85% |

---

## 5. Rate Limiting 監控

Go 後端已實作的 per-IP 滑動視窗 rate limiter：

| 端點類別 | 限制 | 監控重點 |
|---------|------|---------|
| Auth (`/api/auth/*`) | 10 次/分鐘 | 429 回應數 -- 偵測暴力破解 |
| CRUD (`/api/songs/*`, `/api/playlists/*`) | 60 次/分鐘 | 是否有正常使用者觸及限制 |
| STT (`/api/stt/*`) | 5 次/分鐘 | 最昂貴 API，需監控成本 |
| Settings (`/api/settings/*`) | 30 次/分鐘 | 一般監控即可 |

---

## 6. 日誌管理

### 6.1 日誌級別

| 環境 | 日誌級別 | 說明 |
|------|---------|------|
| production | INFO | 僅記錄業務事件、錯誤 |
| development | DEBUG | 包含 debug 資訊 |

### 6.2 日誌保留

| 來源 | Railway 預設保留 | 建議 |
|------|-----------------|------|
| 應用日誌 | 最近 500 行（即時串流） | 若需長期保留，匯出至外部服務 |
| 建置日誌 | 與 deployment 綁定 | 隨 deployment 保留 |

### 6.3 日誌匯出（進階）

若需要長期日誌分析，可考慮：

| 方案 | 成本 | 適合場景 |
|------|------|---------|
| Railway Log Drain -> Datadog | 付費 | 團隊規模 > 5 人 |
| Railway Log Drain -> Better Stack | 免費/付費 | 中小團隊推薦 |
| 自建 Loki + Grafana (Railway) | 基礎設施成本 | 需要完全控制 |

---

## 7. Status Page（對外狀態頁）

建議建立公開狀態頁面，讓使用者自行查看服務狀態：

| 方案 | 成本 | 說明 |
|------|------|------|
| **Better Uptime Status Page** | 免費 | 與 uptime monitoring 整合 |
| **Instatus** | 免費 tier | 獨立 status page 服務 |
| **Cachet** (self-hosted) | 免費 | 需自行維護 |

---

## 8. 未來改善項目

| 優先級 | 項目 | 說明 |
|--------|------|------|
| P1 | 結構化日誌中加入 request_id | 追蹤跨服務的請求鏈路 |
| P1 | WebSocket 連線計數 metric endpoint | 提供 `/metrics` 供外部抓取 |
| P2 | Prometheus metrics endpoint | 暴露標準化指標 |
| P2 | Distributed tracing (OpenTelemetry) | 跨 Next.js -> Go 的請求追蹤 |
| P3 | Grafana dashboard | 視覺化所有指標 |
| P3 | PagerDuty 整合 | 自動 on-call 排班告警 |

---

**文件版本:** 1.0
**建立日期:** 2026-03-19
**最後更新:** 2026-03-19
