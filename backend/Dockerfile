# 階段一：建置 Go 二進位檔
# Build context: backend/ 目錄
# 部署方式：cd backend && railway up 或設定 Railway root directory 為 backend/
FROM golang:1.26-alpine AS builder

# 安裝 git（供 Go modules 使用）
RUN apk add --no-cache git

WORKDIR /build

# 先複製依賴清單，利用 Docker cache 層加速重複建置
COPY go.mod go.sum ./
RUN go mod download

# 複製原始碼
COPY . .

# 編譯為靜態二進位檔，移除 debug 符號以縮小體積
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server

# 階段二：最小化執行映像
FROM alpine:3.21 AS runner

# 安裝 TLS 憑證與時區資料
RUN apk add --no-cache ca-certificates tzdata

# 建立非 root 使用者以提升安全性
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 從建置階段複製二進位檔
COPY --from=builder /app/server /app/server

# 健康檢查：每 30 秒確認服務是否正常回應
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget -qO- http://localhost:8080/api/go-health || exit 1

EXPOSE 8080

USER appuser

CMD ["/app/server"]
