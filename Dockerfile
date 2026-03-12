# ============================================
# LY 歌詞顯示系統 - Production Dockerfile
# Multi-stage build for optimized image size
# ============================================

# Stage 1: Install dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# 安裝 bcrypt 編譯所需的原生依賴
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Stage 2: Build application
FROM node:22-alpine AS builder
WORKDIR /app

# 安裝 bcrypt 編譯所需的原生依賴
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# 建置 Next.js
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Production runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 安裝 bcrypt 運行所需的原生庫
RUN apk add --no-cache libc6-compat

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製生產依賴
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

# 複製建置產物
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# 設定檔案權限
RUN chown -R nextjs:nodejs /app

USER nextjs

# Railway 動態分配 PORT
EXPOSE ${PORT:-3000}

# 使用自訂 server（含 Socket.IO）
CMD ["node", "--import", "tsx", "server.ts"]
