# ============================================
# LY 歌詞顯示系統 - Production Dockerfile
# 純前端 Next.js 建置（API 由 Go 後端處理）
# ============================================

# Stage 1: 安裝生產依賴
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Stage 2: 建置應用程式
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: 生產執行環境
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 複製生產依賴
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# 複製建置產物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

# 設定檔案權限
RUN chown -R nextjs:nodejs /app

USER nextjs

# Railway 動態分配 PORT
EXPOSE ${PORT:-3000}
ENV PORT=3000

CMD ["npx", "next", "start"]
