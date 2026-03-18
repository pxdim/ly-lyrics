/**
 * AppError 錯誤處理系統單元測試
 *
 * 覆蓋範圍：
 * - AppError 基礎類別（建構子、toJSON、toResponse）
 * - 子類別（SongError, SyncError, AiError, NetworkError, AuthError）
 * - 工廠函式（createNotFoundError, createUnauthorizedError, etc.）
 * - 工具函式（isAppError, getErrorCode, getUserMessage, logError, createErrorResponse）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AppError,
  SongError,
  SyncError,
  AiError,
  NetworkError,
  AuthError,
  ERROR_CODES,
  createNotFoundError,
  createUnauthorizedError,
  createValidationError,
  createNetworkError,
  createAiError,
  isAppError,
  getErrorCode,
  getUserMessage,
  logError,
  createErrorResponse,
} from "./AppError";
import type { ErrorContext } from "./AppError";

// ============================================================================
// AppError 基礎類別
// ============================================================================

describe("AppError", () => {
  it("creates instance with all required parameters", () => {
    const error = new AppError("SONG_NOT_FOUND", "歌曲不存在");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe("SONG_NOT_FOUND");
    expect(error.userMessage).toBe("歌曲不存在");
    expect(error.message).toBe("歌曲不存在");
    expect(error.severity).toBe("error");
    expect(error.technicalMessage).toBeUndefined();
    expect(error.context).toBeUndefined();
  });

  it("creates instance with all optional parameters", () => {
    const context: ErrorContext = {
      location: "SongService.findById",
      songId: "song-123",
      userId: "user-456",
      metadata: { attempted: true },
    };

    const error = new AppError(
      "SONG_NOT_FOUND",
      "歌曲不存在",
      "Song not found in database",
      "warning",
      context
    );

    expect(error.technicalMessage).toBe("Song not found in database");
    expect(error.severity).toBe("warning");
    expect(error.context).toEqual(context);
  });

  it("defaults severity to 'error' when not specified", () => {
    const error = new AppError("SYS_INTERNAL_ERROR", "系統錯誤");
    expect(error.severity).toBe("error");
  });

  it("inherits from Error and has a stack trace", () => {
    const error = new AppError("SYS_INTERNAL_ERROR", "系統錯誤");
    expect(error.stack).toBeDefined();
    expect(error.stack).toContain("AppError");
  });

  describe("toJSON", () => {
    it("returns serializable object with all fields", () => {
      const context: ErrorContext = {
        location: "test",
        songId: "s1",
      };

      const error = new AppError(
        "SONG_NOT_FOUND",
        "找不到",
        "technical detail",
        "warning",
        context
      );

      const json = error.toJSON();

      expect(json).toEqual({
        name: "AppError",
        code: "SONG_NOT_FOUND",
        message: "找不到",
        technicalMessage: "technical detail",
        severity: "warning",
        context,
      });
    });

    it("returns undefined for optional fields when not set", () => {
      const error = new AppError("SYS_UNKNOWN_ERROR", "未知錯誤");
      const json = error.toJSON();

      expect(json.technicalMessage).toBeUndefined();
      expect(json.context).toBeUndefined();
    });
  });

  describe("toResponse", () => {
    it("returns ErrorResponse format with timestamp", () => {
      const now = Date.now();
      const error = new AppError("AUTH_UNAUTHORIZED", "未授權");

      const response = error.toResponse();

      expect(response.error.code).toBe("AUTH_UNAUTHORIZED");
      expect(response.error.message).toBe("未授權");
      expect(response.error.details).toBeUndefined();
      expect(response.timestamp).toBeGreaterThanOrEqual(now);
    });

    it("includes context as details when present", () => {
      const context: ErrorContext = {
        location: "api/songs",
        userId: "u1",
      };
      const error = new AppError(
        "AUTH_FORBIDDEN",
        "禁止存取",
        undefined,
        "error",
        context
      );

      const response = error.toResponse();

      expect(response.error.details).toEqual(context);
    });
  });
});

// ============================================================================
// 子類別
// ============================================================================

describe("SongError", () => {
  it("creates instance with name 'SongError' and severity 'error'", () => {
    const error = new SongError("SONG_NOT_FOUND", "歌曲不存在");

    expect(error).toBeInstanceOf(AppError);
    expect(error).toBeInstanceOf(SongError);
    expect(error.name).toBe("SongError");
    expect(error.code).toBe("SONG_NOT_FOUND");
    expect(error.severity).toBe("error");
    expect(error.technicalMessage).toBeUndefined();
  });

  it("accepts optional context", () => {
    const ctx: ErrorContext = { location: "SongService" };
    const error = new SongError("SONG_EMPTY_LYRICS", "歌詞為空", ctx);

    expect(error.context).toEqual(ctx);
  });
});

describe("SyncError", () => {
  it("creates instance with name 'SyncError' and severity 'warning'", () => {
    const error = new SyncError("SYNC_DISCONNECTED", "同步斷線");

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("SyncError");
    expect(error.severity).toBe("warning");
  });
});

describe("AiError", () => {
  it("creates instance with name 'AiError' and severity 'info'", () => {
    const error = new AiError("AI_LOW_CONFIDENCE", "信心不足");

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("AiError");
    expect(error.severity).toBe("info");
  });
});

describe("NetworkError", () => {
  it("creates instance with name 'NetworkError' and severity 'warning'", () => {
    const error = new NetworkError("NET_NETWORK_ERROR", "網路錯誤");

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("NetworkError");
    expect(error.severity).toBe("warning");
  });
});

describe("AuthError", () => {
  it("creates instance with name 'AuthError' and severity 'error'", () => {
    const error = new AuthError("AUTH_UNAUTHORIZED", "未授權");

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("AuthError");
    expect(error.severity).toBe("error");
  });
});

// ============================================================================
// ERROR_CODES 常量
// ============================================================================

describe("ERROR_CODES", () => {
  it("contains all expected error code categories", () => {
    // 抽樣檢查各分類
    expect(ERROR_CODES.SONG_NOT_FOUND).toBe("SONG_NOT_FOUND");
    expect(ERROR_CODES.PLAYLIST_NOT_FOUND).toBe("PLAYLIST_NOT_FOUND");
    expect(ERROR_CODES.SYNC_DISCONNECTED).toBe("SYNC_DISCONNECTED");
    expect(ERROR_CODES.AI_MICROPHONE_DENIED).toBe("AI_MICROPHONE_DENIED");
    expect(ERROR_CODES.AUTH_UNAUTHORIZED).toBe("AUTH_UNAUTHORIZED");
    expect(ERROR_CODES.NET_NETWORK_ERROR).toBe("NET_NETWORK_ERROR");
    expect(ERROR_CODES.SYS_INTERNAL_ERROR).toBe("SYS_INTERNAL_ERROR");
  });

  it("is readonly (values equal keys)", () => {
    for (const [key, value] of Object.entries(ERROR_CODES)) {
      expect(key).toBe(value);
    }
  });
});

// ============================================================================
// 工廠函式
// ============================================================================

describe("createNotFoundError", () => {
  it("creates AppError with SONG_NOT_FOUND code", () => {
    const error = createNotFoundError("Song");

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("SONG_NOT_FOUND");
    expect(error.userMessage).toBe("Song 不存在");
    expect(error.severity).toBe("error");
  });

  it("includes resource ID in message when provided", () => {
    const error = createNotFoundError("Song", "abc-123");

    expect(error.userMessage).toBe("Song (ID: abc-123) 不存在");
    expect(error.technicalMessage).toBe("Resource not found: Song = abc-123");
  });

  it("uses provided context and adds metadata", () => {
    const error = createNotFoundError("Playlist", "p1", {
      location: "PlaylistService",
      userId: "u1",
    });

    expect(error.context?.location).toBe("PlaylistService");
    expect(error.context?.userId).toBe("u1");
    expect(error.context?.metadata).toEqual({ resource: "Playlist", id: "p1" });
  });

  it("defaults location to 'createNotFoundError' when context has no location", () => {
    // 不傳 context
    const error = createNotFoundError("Song");
    expect(error.context?.location).toBe("createNotFoundError");
  });
});

describe("createUnauthorizedError", () => {
  it("creates AuthError with default message", () => {
    const error = createUnauthorizedError();

    expect(error).toBeInstanceOf(AuthError);
    expect(error.code).toBe("AUTH_UNAUTHORIZED");
    expect(error.userMessage).toBe("未授權的存取");
  });

  it("accepts custom message", () => {
    const error = createUnauthorizedError("Token 過期");
    expect(error.userMessage).toBe("Token 過期");
  });

  it("uses provided context location", () => {
    const error = createUnauthorizedError("未授權", {
      location: "apiMiddleware",
    });
    expect(error.context?.location).toBe("apiMiddleware");
  });

  it("defaults location when context omitted", () => {
    const error = createUnauthorizedError();
    expect(error.context?.location).toBe("createUnauthorizedError");
  });
});

describe("createValidationError", () => {
  it("creates AppError with field and reason in message", () => {
    const error = createValidationError("email", "格式不正確");

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe("SONG_INVALID_FORMAT");
    expect(error.userMessage).toBe("email 格式不正確");
    expect(error.technicalMessage).toBe("Validation failed for field: email");
  });

  it("includes field and reason in metadata", () => {
    const error = createValidationError("title", "不可為空", {
      location: "SongValidator",
    });

    expect(error.context?.metadata).toEqual({
      field: "title",
      reason: "不可為空",
    });
    expect(error.context?.location).toBe("SongValidator");
  });
});

describe("createNetworkError", () => {
  it("creates NetworkError with NET_NETWORK_ERROR code", () => {
    const error = createNetworkError("連線逾時");

    expect(error).toBeInstanceOf(NetworkError);
    expect(error.code).toBe("NET_NETWORK_ERROR");
    expect(error.userMessage).toBe("連線逾時");
  });

  it("uses provided context location", () => {
    const error = createNetworkError("timeout", {
      location: "fetchWrapper",
    });
    expect(error.context?.location).toBe("fetchWrapper");
  });
});

describe("createAiError", () => {
  it("creates AiError with specified code", () => {
    const error = createAiError("AI_QUOTA_EXCEEDED", "超過配額");

    expect(error).toBeInstanceOf(AiError);
    expect(error.code).toBe("AI_QUOTA_EXCEEDED");
    expect(error.userMessage).toBe("超過配額");
  });

  it("defaults location when context omitted", () => {
    const error = createAiError("AI_SERVICE_UNAVAILABLE", "服務不可用");
    expect(error.context?.location).toBe("createAiError");
  });
});

// ============================================================================
// 工具函式
// ============================================================================

describe("isAppError", () => {
  it("returns true for AppError instances", () => {
    expect(isAppError(new AppError("SYS_INTERNAL_ERROR", "err"))).toBe(true);
  });

  it("returns true for AppError subclass instances", () => {
    expect(isAppError(new SongError("SONG_NOT_FOUND", "err"))).toBe(true);
    expect(isAppError(new AuthError("AUTH_UNAUTHORIZED", "err"))).toBe(true);
    expect(isAppError(new NetworkError("NET_TIMEOUT", "err"))).toBe(true);
  });

  it("returns false for plain Error", () => {
    expect(isAppError(new Error("plain error"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isAppError(null)).toBe(false);
    expect(isAppError(undefined)).toBe(false);
    expect(isAppError("string")).toBe(false);
    expect(isAppError(42)).toBe(false);
    expect(isAppError({})).toBe(false);
  });
});

describe("getErrorCode", () => {
  it("returns error code from AppError", () => {
    const error = new AppError("AUTH_TOKEN_EXPIRED", "過期");
    expect(getErrorCode(error)).toBe("AUTH_TOKEN_EXPIRED");
  });

  it("returns SYS_UNKNOWN_ERROR for plain Error", () => {
    expect(getErrorCode(new Error("fail"))).toBe("SYS_UNKNOWN_ERROR");
  });

  it("returns SYS_UNKNOWN_ERROR for non-error values", () => {
    expect(getErrorCode(null)).toBe("SYS_UNKNOWN_ERROR");
    expect(getErrorCode("string")).toBe("SYS_UNKNOWN_ERROR");
    expect(getErrorCode(undefined)).toBe("SYS_UNKNOWN_ERROR");
  });
});

describe("getUserMessage", () => {
  it("returns userMessage from AppError", () => {
    const error = new AppError("SONG_NOT_FOUND", "歌曲不存在");
    expect(getUserMessage(error)).toBe("歌曲不存在");
  });

  it("returns message from plain Error", () => {
    expect(getUserMessage(new Error("something broke"))).toBe(
      "something broke"
    );
  });

  it("returns default message for non-error values", () => {
    expect(getUserMessage(null)).toBe("發生未知錯誤");
    expect(getUserMessage(42)).toBe("發生未知錯誤");
    expect(getUserMessage("string")).toBe("發生未知錯誤");
  });
});

describe("logError", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env["NODE_ENV"];

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    Object.defineProperty(process.env, "NODE_ENV", { value: originalEnv, writable: true });
  });

  it("logs AppError with code prefix", () => {
    const error = new AppError("SONG_NOT_FOUND", "找不到", undefined, "error");
    logError(error);

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(consoleErrorSpy.mock.calls[0]![0]).toBe(
      "[SONG_NOT_FOUND] AppError:"
    );
  });

  it("logs plain Error with [Error] prefix", () => {
    const error = new Error("plain fail");
    logError(error);

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(consoleErrorSpy.mock.calls[0]![0]).toBe("[Error]:");
  });

  it("logs unknown values with [Unknown Error] prefix", () => {
    logError("just a string");

    expect(consoleErrorSpy).toHaveBeenCalledOnce();
    expect(consoleErrorSpy.mock.calls[0]![0]).toBe("[Unknown Error]:");
  });

  it("includes technical details in development mode", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true });

    const error = new AppError(
      "SYS_INTERNAL_ERROR",
      "使用者訊息",
      "technical info",
      "error",
      { location: "test" }
    );
    logError(error);

    const loggedObj = consoleErrorSpy.mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(loggedObj).toHaveProperty("technical", "technical info");
    expect(loggedObj).toHaveProperty("context");
  });

  it("omits technical details in production mode", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", writable: true });

    const error = new AppError(
      "SYS_INTERNAL_ERROR",
      "使用者訊息",
      "technical info",
      "error",
      { location: "test" }
    );
    logError(error);

    const loggedObj = consoleErrorSpy.mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(loggedObj).not.toHaveProperty("technical");
    expect(loggedObj).not.toHaveProperty("context");
  });

  it("passes external context for plain Error in development", () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", writable: true });
    const ctx: ErrorContext = { location: "handler" };

    logError(new Error("fail"), ctx);

    const loggedObj = consoleErrorSpy.mock.calls[0]![1] as Record<
      string,
      unknown
    >;
    expect(loggedObj).toHaveProperty("context", ctx);
  });
});

describe("createErrorResponse", () => {
  it("returns Response with correct JSON body and default status 500", async () => {
    const response = createErrorResponse(
      "SYS_INTERNAL_ERROR",
      "Internal error"
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.error.code).toBe("SYS_INTERNAL_ERROR");
    expect(body.error.message).toBe("Internal error");
    expect(body.timestamp).toBeTypeOf("number");
  });

  it("uses provided status code", async () => {
    const response = createErrorResponse(
      "AUTH_UNAUTHORIZED",
      "Unauthorized",
      401
    );
    expect(response.status).toBe(401);
  });

  it("includes details when provided", async () => {
    const details = { field: "email", reason: "invalid" };
    const response = createErrorResponse(
      "SONG_INVALID_FORMAT",
      "Validation failed",
      400,
      details
    );

    const body = await response.json();
    expect(body.error.details).toEqual(details);
  });

  it("omits details when not provided", async () => {
    const response = createErrorResponse("NET_TIMEOUT", "Timeout", 408);
    const body = await response.json();
    expect(body.error.details).toBeUndefined();
  });
});
