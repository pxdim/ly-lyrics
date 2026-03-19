# 備份策略

**系統:** LY 歌詞即時顯示系統
**部署平台:** Railway
**資料庫:** PostgreSQL (Railway 內建)
**快取:** Redis (Railway 內建)

---

## 1. 備份範疇

### 1.1 需要備份的資料

| 資料類型 | 儲存位置 | 重要性 | RPO 目標 |
|---------|---------|--------|---------|
| 使用者資料 (users) | PostgreSQL | Critical | < 1 小時 |
| 歌曲資料 (songs + lyrics) | PostgreSQL | Critical | < 1 小時 |
| 播放清單 (playlists) | PostgreSQL | High | < 4 小時 |
| 使用者設定 (settings) | PostgreSQL | Medium | < 24 小時 |
| WebSocket session 狀態 | Redis | Low | 不需備份（短暫資料） |
| 程式碼 | GitHub | Critical | 即時（每次 push） |
| 環境變數 | Railway Dashboard | Critical | 手動記錄 |

**RPO (Recovery Point Objective):** 資料遺失的最大容許時間。

### 1.2 不需要備份的資料

| 資料類型 | 原因 |
|---------|------|
| Redis WebSocket session | 斷線後自動重建，屬暫態資料 |
| Docker image / build cache | Railway 自動從 GitHub 重建 |
| Next.js `.next` 建置產物 | 可從原始碼重建 |
| node_modules | 可從 `package-lock.json` 重建 |

---

## 2. PostgreSQL 備份

### 2.1 Railway 自動備份

Railway 對 PostgreSQL 提供的備份功能取決於方案等級：

| Railway Plan | 自動備份 | 備份頻率 | 保留天數 |
|-------------|---------|---------|---------|
| Hobby | 無自動備份 | -- | -- |
| Pro | 每日快照 | 每 24 小時 | 7 天 |
| Enterprise | 可自訂 | 自訂 | 自訂 |

**重要:** 若使用 Hobby plan，必須自行設定手動備份。

### 2.2 手動備份（pg_dump）

適用於所有 Railway plan，建議至少每週執行一次：

```bash
# 從 Railway dashboard 取得 DATABASE_URL
# 格式: postgresql://user:password@host:port/dbname

# 完整備份（含 schema + data）
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="ly_backup_$(date +%Y%m%d_%H%M%S).dump"

# 僅資料備份（schema 由 Ent ORM 管理）
pg_dump "$DATABASE_URL" \
  --format=custom \
  --data-only \
  --file="ly_data_$(date +%Y%m%d_%H%M%S).dump"

# 壓縮備份（節省空間）
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --file="ly_backup_$(date +%Y%m%d_%H%M%S).dump.gz"
```

### 2.3 還原流程

```bash
# 還原完整備份
pg_restore \
  --dbname="$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  ly_backup_20260601_120000.dump

# 還原前建議先在測試環境驗證
# 1. 建立臨時 PostgreSQL (Docker)
docker run -d --name ly-restore-test \
  -e POSTGRES_DB=ly_restore \
  -e POSTGRES_PASSWORD=restore_test \
  -p 5433:5432 postgres:15-alpine

# 2. 還原至測試資料庫
pg_restore \
  --dbname="postgresql://postgres:restore_test@localhost:5433/ly_restore" \
  --no-owner \
  --clean \
  --if-exists \
  ly_backup_20260601_120000.dump

# 3. 驗證資料完整性
psql "postgresql://postgres:restore_test@localhost:5433/ly_restore" \
  -c "SELECT count(*) FROM users; SELECT count(*) FROM songs; SELECT count(*) FROM playlists;"

# 4. 清理測試環境
docker rm -f ly-restore-test
```

### 2.4 自動化備份腳本

建議部署以下 cron 排程（在可靠的外部主機上執行）：

```bash
#!/bin/bash
# backup-ly-db.sh -- LY 資料庫自動備份
# 建議 cron 排程: 0 3 * * * /path/to/backup-ly-db.sh

set -euo pipefail

BACKUP_DIR="/backups/ly"
DATABASE_URL="${DATABASE_URL:?DATABASE_URL 未設定}"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/ly_backup_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

# 執行備份
pg_dump "$DATABASE_URL" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --file="$BACKUP_FILE"

# 驗證備份檔案大小 > 0
if [ ! -s "$BACKUP_FILE" ]; then
  echo "ERROR: 備份檔案為空" >&2
  exit 1
fi

echo "備份完成: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# 清理過期備份
find "$BACKUP_DIR" -name "ly_backup_*.dump" -mtime +${RETENTION_DAYS} -delete
echo "已清理 ${RETENTION_DAYS} 天前的舊備份"
```

---

## 3. Redis 資料策略

### 3.1 Redis 中的資料類型

| Key 模式 | 用途 | 生命週期 | 備份需求 |
|---------|------|---------|---------|
| `session:{code}` | WebSocket session 狀態 | 分鐘~小時 | 不需要 |
| `ws:room:{sessionId}` | 即時同步房間 | 連線存續期間 | 不需要 |

### 3.2 策略：不備份 Redis

LY 系統中 Redis 僅用於 WebSocket session 管理，資料為短暫性質：

- **WebSocket session**: 使用者斷線後自動重連，session 會重新建立
- **同步狀態**: Controller 重新連線後，會推送最新狀態

**結論:** Redis 資料遺失不影響系統永久性資料，無需備份。

### 3.3 Redis 容錯配置

| 設定 | 建議值 | 說明 |
|------|-------|------|
| `maxmemory-policy` | `allkeys-lru` | 記憶體滿時自動淘汰最少使用的 key |
| 連線失敗處理 | 已實作 | Go 後端 Redis 連線失敗時，WebSocket 功能停用但 API 不受影響 |

---

## 4. 程式碼版本管理

### 4.1 GitHub 作為程式碼備份

| 項目 | 策略 |
|------|------|
| 主要分支 | `main` -- 所有合併的功能 |
| 版本標籤 | `v1.0.0` 格式，每次重大上線建立 tag |
| Branch protection | 建議啟用 PR review 規則 |

### 4.2 程式碼完整性

```bash
# 驗證 Git repository 完整性
git fsck --full

# 確認 remote 與 local 同步
git fetch origin
git log --oneline main..origin/main  # 應該無輸出
```

---

## 5. 環境變數備份

### 5.1 環境變數為系統關鍵依賴

環境變數遺失等同於系統無法啟動。Railway dashboard 中的環境變數無自動備份機制。

### 5.2 備份方式

**方法 A: 加密檔案儲存**

```bash
# 匯出環境變數（Railway CLI）
railway variables --json > ly-env-backup-$(date +%Y%m%d).json

# 使用 GPG 加密
gpg --symmetric --cipher-algo AES256 ly-env-backup-$(date +%Y%m%d).json

# 刪除明文檔案
rm ly-env-backup-$(date +%Y%m%d).json

# 將加密檔案存放於安全位置（非 Git）
```

**方法 B: 密碼管理器**

將所有環境變數記錄在團隊密碼管理器中（例如 1Password, Bitwarden），包含：

| 項目 | 值 |
|------|---|
| DATABASE_URL | `postgresql://...` |
| REDIS_URL | `redis://...` |
| JWT_SECRET | `(加密儲存)` |
| GENIUS_API_TOKEN | `(加密儲存)` |
| GEMINI_API_KEY | `(加密儲存)` |
| ... | ... |

### 5.3 注意事項

- 永遠不要將環境變數備份存入 Git repository
- 變更環境變數後，同步更新備份
- 定期驗證備份的環境變數值仍有效

---

## 6. 災難復原計畫（DRP）

### 6.1 復原時間目標

| 指標 | 目標 | 說明 |
|------|------|------|
| **RTO** (Recovery Time Objective) | < 1 小時 | 從災難發生到服務恢復 |
| **RPO** (Recovery Point Objective) | < 24 小時 | 最大可接受的資料遺失 |

### 6.2 故障場景與復原程序

#### 場景 A: Railway 服務異常（暫時性）

| 步驟 | 動作 | 預估時間 |
|------|------|---------|
| 1 | 檢查 Railway status page | 1 分鐘 |
| 2 | 等待 Railway 自動恢復 | 5-30 分鐘 |
| 3 | 若超過 30 分鐘，手動 redeploy | 5 分鐘 |

#### 場景 B: 資料庫損壞

| 步驟 | 動作 | 預估時間 |
|------|------|---------|
| 1 | 確認資料庫無法連線 | 2 分鐘 |
| 2 | 建立新的 Railway PostgreSQL 實例 | 5 分鐘 |
| 3 | 還原最近的 pg_dump 備份 | 10-30 分鐘 |
| 4 | 更新 DATABASE_URL 環境變數 | 2 分鐘 |
| 5 | 重新部署服務 | 5 分鐘 |

#### 場景 C: 需要完全重建

| 步驟 | 動作 | 預估時間 |
|------|------|---------|
| 1 | 建立新的 Railway 專案 | 5 分鐘 |
| 2 | 新增 PostgreSQL + Redis | 5 分鐘 |
| 3 | 從密碼管理器取得環境變數 | 5 分鐘 |
| 4 | 連結 GitHub repo，觸發部署 | 10 分鐘 |
| 5 | 還原資料庫備份 | 10-30 分鐘 |
| 6 | 驗證功能正常 | 15 分鐘 |
| **總計** | | **~60 分鐘** |

---

## 7. 備份驗證排程

| 檢查項目 | 頻率 | 負責人 |
|---------|------|-------|
| 手動 pg_dump 執行 | 每週 | 運維 |
| 備份還原測試（測試環境） | 每月 | 運維 |
| 環境變數備份更新 | 每次變更後 | 開發 |
| 災難復原演練 | 每季 | 團隊 |

---

**文件版本:** 1.0
**建立日期:** 2026-03-19
**最後更新:** 2026-03-19
