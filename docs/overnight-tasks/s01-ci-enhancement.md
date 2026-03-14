# S01: CI/CD 強化 — 加入前端測試與 Lint

## 目標
在現有 `.github/workflows/ci.yml` 中加入 Vitest 單元測試和 ESLint 步驟，確保每次 push/PR 都自動驗證前端品質。

## 參考檔案（請先讀取）
- `.github/workflows/ci.yml` — 現有 CI 設定（Go backend + frontend build）
- `package.json` — 確認 test/lint scripts
- `vitest.config.ts` — Vitest 設定

## 修改檔案
- `.github/workflows/ci.yml` — 在 frontend job 中加入 vitest 和 lint 步驟

## 實作要求

在現有 `frontend` job 的 steps 中，在 "Type check" 之後加入：

1. **Run Vitest** step：`npx vitest run`
2. **Run ESLint** step：`npx next lint`（或 `npx eslint . --ext .ts,.tsx`）

確保 `paths` trigger 包含 `lib/**`、`components/**`、`e2e/**`（不只是 `app/**`）。

也在 `on.push.paths` 和 `on.pull_request` 中加入：
```yaml
paths:
  - 'backend/**'
  - 'app/**'
  - 'lib/**'
  - 'components/**'
  - 'package.json'
  - '.github/workflows/ci.yml'
```

## 驗收標準
- [ ] `ci.yml` 語法正確（可用 `npx yaml-lint` 或手動檢查）
- [ ] vitest 步驟在 frontend job 中
- [ ] lint 步驟在 frontend job 中
- [ ] paths trigger 涵蓋所有前端相關路徑
- [ ] npm run build 仍然通過

## Commit
```
ci: add vitest and lint steps to frontend CI workflow
```
