.PHONY: build run test generate lint clean dev

# Go 參數
BINARY_NAME=ly-backend
GO=go

build:
	$(GO) build -o bin/$(BINARY_NAME) ./cmd/server

run:
	$(GO) run ./cmd/server

test:
	$(GO) test ./... -v

generate:
	$(GO) generate ./...

lint:
	golangci-lint run ./...

clean:
	rm -rf bin/

dev:
	air -c .air.toml
