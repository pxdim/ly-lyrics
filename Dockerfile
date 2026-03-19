# ============================================
# LY 歌詞顯示系統 - Production Dockerfile
# Next.js standalone 模式（API 由 Go 後端處理）
# ============================================

# Stage 1: 安裝依賴
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: 建置應用程式
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# Next.js rewrites 在 build time 固化，需要在此時設定 Go backend URL
ARG GO_BACKEND_URL=http://ly-go-backend.railway.internal:8080
ENV GO_BACKEND_URL=${GO_BACKEND_URL}

RUN npm run build

# Stage 3: 生產執行環境（standalone 模式）
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 複製 standalone 建置產物（包含最小化的 node_modules）
COPY --from=builder /app/.next/standalone ./
# 複製靜態資源（standalone 不自動包含）
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 設定檔案權限
RUN chown -R nextjs:nodejs /app

USER nextjs

# Railway 動態分配 PORT
EXPOSE ${PORT:-8080}
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# standalone 模式使用 node server.js 而非 npx next start
CMD ["node", "server.js"]
