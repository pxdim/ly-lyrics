#!/bin/bash
# ============================================================================
# LY 歌詞顯示系統 — 夜間自動化開發腳本（雙階段：規劃 → 執行）
#
# 每個任務分兩階段：
#   Phase 1 — 規劃：讀取 spec + 閱讀 codebase → 產出詳細 implementation plan
#   Phase 2 — 執行：讀取 plan → 嚴格 TDD 開發 → 測試 → commit
#
# 使用方式：
#   tmux new-session -d -s overnight 'caffeinate -dims bash ~/Desktop/LY/overnight-dev.sh'
#   # 隔天：tmux attach -t overnight
#
# ============================================================================

set -uo pipefail

# 清除巢狀 session 檢查，允許從外部環境呼叫 claude -p
unset CLAUDECODE 2>/dev/null || true
unset CLAUDE_CODE 2>/dev/null || true

PROJECT_DIR="$HOME/Desktop/LY"
TASK_DIR="$PROJECT_DIR/docs/overnight-tasks"
PLAN_DIR="$PROJECT_DIR/docs/superpowers/plans"
LOG="$PROJECT_DIR/docs/overnight-report.md"
START_TIME=$(date '+%Y-%m-%d %H:%M:%S')

cd "$PROJECT_DIR"
mkdir -p "$PLAN_DIR"

# ============================================================================
# 初始化報告
# ============================================================================
{
  echo "# LY 夜間自動開發報告"
  echo ""
  echo "> **開始時間**：$START_TIME"
  echo "> **執行方式**：雙階段（規劃 → 執行），claude -p --dangerously-skip-permissions"
  echo "> **品質標準**：superpowers 規劃 + TDD Red-Green-Refactor + TypeScript strict"
  echo ""
  echo "---"
  echo ""
} > "$LOG"

echo "======================================================"
echo "  LY 夜間自動化開發（雙階段）— 開始於 $START_TIME"
echo "======================================================"
echo ""

# ============================================================================
# Phase 1 規劃提示詞
# ============================================================================
PLAN_SYSTEM='你是 LY 歌詞顯示系統的資深架構師，負責產出詳細的實作計畫。

## 專案資訊
- 路徑：~/Desktop/LY
- 前端：Next.js 15 + React 19 + TypeScript 5.7 + Tailwind 3.4 + Zustand 5
- 後端：Go 1.26 + chi + Ent ORM（在 backend/ 目錄）
- 測試：Vitest（前端）+ Go test（後端）
- 設計系統：Dark Tech v2.0（深色背景 bg-gray-900, 霓虹光效, cyan/emerald 強調色, Orbitron/Exo 2 字型）

## 你的任務
你只負責「規劃」，不寫任何程式碼，不修改任何檔案（plan 文件除外）。

## 規劃流程
1. 仔細閱讀任務 spec
2. 閱讀 spec 中列出的所有「參考檔案」，理解現有程式碼結構、模式、風格
3. 分析需要建立和修改的檔案，理解它們之間的依賴關係
4. 產出一份詳細的 implementation plan

### Plan 格式要求
每個步驟必須包含：
- 具體的檔案路徑（建立或修改）
- 完整的程式碼（不是虛擬碼，是可以直接貼上執行的完整程式碼）
- TDD 步驟：先寫測試 -> 確認紅燈 -> 實作 -> 確認綠燈 -> 重構
- 測試指令和預期結果
- commit 指令

### Plan 結構範例
```markdown
# [功能名稱] Implementation Plan

## 目標
[一句話]

## 架構決策
[技術選擇和理由]

### Task 1: [名稱]
**Files:**
- Create: exact/path
- Modify: exact/path

- [ ] Step 1: 寫失敗測試
[完整測試程式碼]

- [ ] Step 2: 執行測試確認紅燈
Run: npx vitest run path/test.ts
Expected: FAIL

- [ ] Step 3: 寫最小實作
[完整實作程式碼]

- [ ] Step 4: 執行測試確認綠燈
Run: npx vitest run
Expected: ALL PASS

- [ ] Step 5: Commit
git add path/to/files
git commit -m "type(scope): description"
```

## 重要
- 程式碼必須完整，不能有 // TODO 或 // ... implement here
- 測試必須具體，不能有模糊的 assertion
- 必須參考現有程式碼的風格（import 路徑用 @/ alias、繁體中文註解等）
- 每個 Task 應該是一個獨立可測試的單元'

# ============================================================================
# Phase 2 執行提示詞
# ============================================================================
EXEC_SYSTEM='你是 LY 歌詞顯示系統的資深開發者，負責嚴格按照 implementation plan 執行開發。

## 專案資訊
- 路徑：~/Desktop/LY
- 前端：Next.js 15 + React 19 + TypeScript 5.7 + Tailwind 3.4 + Zustand 5
- 後端：Go 1.26 + chi + Ent ORM（在 backend/ 目錄）
- 測試：Vitest（前端）+ Go test（後端）

## 執行規範（嚴格遵守）
1. 逐步執行 plan 中的每個 Task 和 Step，不跳過任何步驟
2. TDD 紀律：
   - 先寫測試，執行確認失敗（紅燈）
   - 再寫最小實作，執行確認通過（綠燈）
   - 最後重構（如需要），確認仍通過
3. 如果測試失敗：分析原因，修正程式碼（不是修改測試來通過）
4. 如果 plan 中的程式碼有 bug：修正它，但保持相同的設計意圖
5. 每個 Task 完成後立即 commit（不要等到全部完成）
6. TypeScript strict：如果型別檢查失敗，必須修正
7. 繁體中文註解，技術術語保留英文
8. 不要修改 plan 中沒有提到的檔案

## 驗證流程（每次 commit 前必做）
1. npx vitest run — 所有前端測試通過
2. npm run build — Next.js 建置成功
3. 確認沒有遺留的 console.log 或 debug 程式碼

## 輸出報告
全部完成後輸出：
- 建立/修改了哪些檔案
- 測試結果（新增多少 test cases，總通過數量）
- 每個 commit 的 hash 和訊息
- 發現的問題或偏離 plan 的地方'

# ============================================================================
# Phase 1 函式：規劃
# ============================================================================
run_plan() {
  local num="$1"
  local file="$2"
  local name="$3"
  local plan_file="$4"

  echo "  [plan] [$num] Phase 1 - 規劃: $name"
  echo "     $(date '+%H:%M:%S')"

  echo "### Phase 1: 規劃" >> "$LOG"
  echo "" >> "$LOG"

  local TASK_SPEC
  TASK_SPEC=$(cat "$TASK_DIR/$file")

  local PLAN_PROMPT
  PLAN_PROMPT=$(printf '%s\n\n---\n\n## 任務 Spec\n\n%s\n\n---\n\n請仔細閱讀上述 spec 和所有「參考檔案」，然後產出完整的 implementation plan。\n\n將 plan 寫入檔案：%s/%s\n\n寫完 plan 後，輸出一行摘要：建立了幾個 Task、預計幾個 test cases。' "$PLAN_SYSTEM" "$TASK_SPEC" "$PLAN_DIR" "$plan_file")

  local RESULT
  RESULT=$(env -u CLAUDECODE claude -p "$PLAN_PROMPT" --dangerously-skip-permissions 2>&1) || true

  {
    echo '```'
    echo "$RESULT" | tail -30
    echo '```'
    echo ""
  } >> "$LOG"

  if [ -f "$PLAN_DIR/$plan_file" ]; then
    echo "  [ok] Plan 已產出: $plan_file"
    return 0
  else
    echo "  [fail] Plan 產出失敗!"
    echo "**Plan 產出失敗，跳過執行階段**" >> "$LOG"
    echo "" >> "$LOG"
    return 1
  fi
}

# ============================================================================
# Phase 2 函式：執行
# ============================================================================
run_exec() {
  local num="$1"
  local name="$2"
  local plan_file="$3"

  echo "  [exec] [$num] Phase 2 - 執行: $name"
  echo "     $(date '+%H:%M:%S')"

  echo "### Phase 2: 執行" >> "$LOG"
  echo "" >> "$LOG"

  local PLAN_CONTENT
  PLAN_CONTENT=$(cat "$PLAN_DIR/$plan_file")

  local EXEC_PROMPT
  EXEC_PROMPT=$(printf '%s\n\n---\n\n## Implementation Plan\n\n以下是已經規劃好的詳細實作計畫，請嚴格按照每個 Task 和 Step 逐步執行：\n\n%s\n\n---\n\n開始執行。逐步完成每個 Task，每完成一個 Task 就 commit。\n全部完成後輸出完整報告。' "$EXEC_SYSTEM" "$PLAN_CONTENT")

  local RESULT
  RESULT=$(env -u CLAUDECODE claude -p "$EXEC_PROMPT" --dangerously-skip-permissions 2>&1) || true

  {
    echo '```'
    echo "$RESULT" | tail -80
    echo '```'
    echo ""
  } >> "$LOG"

  echo "  [ok] 執行完成"
}

# ============================================================================
# 完整任務函式：規劃 → 執行
# ============================================================================
run_full_task() {
  local num="$1"
  local file="$2"
  local name="$3"
  local plan_file="$4"

  echo "======================================================"
  echo "  [$num] $name"
  echo "======================================================"

  {
    echo "## $num: $name"
    echo "**開始**: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
  } >> "$LOG"

  # Phase 1: 規劃
  if run_plan "$num" "$file" "$name" "$plan_file"; then
    sleep 5

    # Phase 2: 執行
    run_exec "$num" "$name" "$plan_file"
  fi

  {
    echo ""
    echo "**結束**: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    echo "---"
    echo ""
  } >> "$LOG"

  # 安全檢查：如有未提交的變更，stash 保存
  if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
    echo "  [warn] 偵測到未提交變更，stash 保存..."
    git stash push -m "overnight-$num-$name-incomplete" 2>/dev/null || true
    echo "  [warn] 已 stash: overnight-$num-$name-incomplete" >> "$LOG"
  fi

  echo ""
  sleep 10
}

# ============================================================================
# 執行所有任務
# ============================================================================

run_full_task "S01" "s01-ci-enhancement.md" "CI/CD 強化" \
  "overnight-s01-ci-enhancement.md"

run_full_task "S02" "s02-edge-cases.md" "邊緣情況處理" \
  "overnight-s02-edge-cases.md"

run_full_task "S03" "s03-auth-pages.md" "登入/註冊頁面" \
  "overnight-s03-auth-pages.md"

run_full_task "S04" "s04-keyboard-shortcuts.md" "鍵盤快捷鍵" \
  "overnight-s04-keyboard-shortcuts.md"

run_full_task "S05" "s05-lrc-export-ui.md" "LRC 匯出 UI" \
  "overnight-s05-lrc-export-ui.md"

run_full_task "S06" "s06-lrc-import-ui.md" "LRC 匯入 UI" \
  "overnight-s06-lrc-import-ui.md"

run_full_task "S07" "s07-playlist-drag-sort.md" "播放列表拖曳排序" \
  "overnight-s07-playlist-drag-sort.md"

run_full_task "S08" "s08-pwa.md" "PWA 離線支援" \
  "overnight-s08-pwa.md"

# ============================================================================
# 最終驗證
# ============================================================================
echo "======================================================"
echo "  最終驗證"
echo "======================================================"

{
  echo "## 最終驗證"
  echo ""
} >> "$LOG"

VITEST_RESULT=$(npx vitest run 2>&1) || true
{
  echo "### Vitest 單元測試"
  echo '```'
  echo "$VITEST_RESULT" | tail -20
  echo '```'
  echo ""
} >> "$LOG"

BUILD_RESULT=$(npm run build 2>&1) || true
{
  echo "### Next.js Build"
  echo '```'
  echo "$BUILD_RESULT" | tail -20
  echo '```'
  echo ""
} >> "$LOG"

GO_RESULT=$(cd backend && go build ./cmd/server/ && go test ./... 2>&1) || true
{
  echo "### Go Backend"
  echo '```'
  echo "$GO_RESULT" | tail -20
  echo '```'
  echo ""
} >> "$LOG"

{
  echo "### Git 提交記錄（本次新增）"
  echo '```'
  git log --oneline --since="$START_TIME" 2>/dev/null || true
  echo '```'
  echo ""
} >> "$LOG"

{
  echo "### 產出的 Plan 文件"
  echo '```'
  ls -1 "$PLAN_DIR"/overnight-*.md 2>/dev/null || echo "(none)"
  echo '```'
  echo ""
} >> "$LOG"

STASH_LIST=$(git stash list 2>/dev/null | grep "overnight" || true)
if [ -n "$STASH_LIST" ]; then
  {
    echo "### 未完成的任務（已 stash）"
    echo '```'
    echo "$STASH_LIST"
    echo '```'
    echo ""
  } >> "$LOG"
fi

END_TIME=$(date '+%Y-%m-%d %H:%M:%S')
{
  echo "---"
  echo "**全部完成**: $END_TIME"
  echo "**總耗時**: $START_TIME -> $END_TIME"
} >> "$LOG"

# ============================================================================
# 提交報告 + 所有 plan 文件並推送
# ============================================================================
git add "$LOG" 2>/dev/null || true
git add "$PLAN_DIR"/overnight-*.md 2>/dev/null || true
git commit -m "docs: overnight development report and plans $(date '+%Y-%m-%d')" 2>/dev/null || true
git push 2>/dev/null || true

echo ""
echo "======================================================"
echo "  全部任務執行完畢!"
echo "  結束時間: $END_TIME"
echo "  報告: $LOG"
echo "  Plans: $PLAN_DIR/overnight-*.md"
echo "======================================================"
