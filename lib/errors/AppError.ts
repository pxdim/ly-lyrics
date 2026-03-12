/**
 * Application Error Classes
 *
 * Unified error handling system for LY Lyrics Display System.
 * Following specs from docs/spec/error-handling.md
 */

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Complete error code registry
 *
 * Format: {MODULE}_{CATEGORY}_{SPECIFIC}
 */
export const ERROR_CODES = {
  // ========== Song Related ==========
  SONG_NOT_FOUND: "SONG_NOT_FOUND",
  SONG_INVALID_FORMAT: "SONG_INVALID_FORMAT",
  SONG_EMPTY_LYRICS: "SONG_EMPTY_LYRICS",
  SONG_TOO_LONG: "SONG_TOO_LONG",

  // ========== Playlist Related ==========
  PLAYLIST_NOT_FOUND: "PLAYLIST_NOT_FOUND",
  PLAYLIST_EMPTY: "PLAYLIST_EMPTY",
  PLAYLIST_DUPLICATE: "PLAYLIST_DUPLICATE",
  PLAYLIST_INVALID_FORMAT: "PLAYLIST_INVALID_FORMAT",

  // ========== Settings Related ==========
  SETTINGS_INVALID_FORMAT: "SETTINGS_INVALID_FORMAT",

  // ========== LRC Related ==========
  LRC_INVALID_CONTENT: "LRC_INVALID_CONTENT",
  LRC_INVALID_FORMAT: "LRC_INVALID_FORMAT",
  LRC_INVALID_JSON: "LRC_INVALID_JSON",
  SONG_UPDATE_FAILED: "SONG_UPDATE_FAILED",

  // ========== Sync Related ==========
  SYNC_SESSION_NOT_FOUND: "SYNC_SESSION_NOT_FOUND",
  SYNC_SESSION_EXPIRED: "SYNC_SESSION_EXPIRED",
  SYNC_DISCONNECTED: "SYNC_DISCONNECTED",
  SYNC_RECONNECT_FAILED: "SYNC_RECONNECT_FAILED",
  SYNC_TOO_MANY_DISPLAYS: "SYNC_TOO_MANY_DISPLAYS",

  // ========== AI Related ==========
  AI_MICROPHONE_DENIED: "AI_MICROPHONE_DENIED",
  AI_TRANSCRIPTION_FAILED: "AI_TRANSCRIPTION_FAILED",
  AI_QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED",
  AI_SERVICE_UNAVAILABLE: "AI_SERVICE_UNAVAILABLE",
  AI_LOW_CONFIDENCE: "AI_LOW_CONFIDENCE",

  // ========== Auth Related ==========
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_MISSING_CREDENTIALS: "AUTH_MISSING_CREDENTIALS",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",

  // ========== Network Related ==========
  NET_NETWORK_ERROR: "NET_NETWORK_ERROR",
  NET_TIMEOUT: "NET_TIMEOUT",
  NET_RATE_LIMITED: "NET_RATE_LIMITED",

  // ========== System Related ==========
  SYS_INTERNAL_ERROR: "SYS_INTERNAL_ERROR",
  SYS_UNKNOWN_ERROR: "SYS_UNKNOWN_ERROR",
} as const;

/**
 * Error severity levels
 */
export type ErrorSeverity = "info" | "warning" | "error" | "critical";

/**
 * Error context information
 */
export interface ErrorContext {
  /** Where the error occurred */
  location: string;
  /** Related user ID */
  userId?: string;
  /** Related song ID */
  songId?: string;
  /** Related session ID */
  sessionId?: string;
  /** Additional debug information */
  metadata?: Record<string, unknown>;
}

/**
 * Type for error code keys
 */
export type ErrorCode = keyof typeof ERROR_CODES;

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Application error base class
 *
 * @example
 * ```ts
 * throw new AppError('SONG_NOT_FOUND', 'Song does not exist', undefined, 'error', {
 *   songId: '123',
 *   userId: '456'
 * });
 * ```
 */
export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public userMessage: string,
    public technicalMessage?: string,
    public severity: ErrorSeverity = "error",
    public context?: ErrorContext
  ) {
    super(userMessage);
    this.name = "AppError";
  }

  /**
   * Convert to serializable object
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.userMessage,
      technicalMessage: this.technicalMessage,
      severity: this.severity,
      context: this.context,
    };
  }

  /**
   * Create error response for API
   */
  toResponse(): ErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.userMessage,
        details: this.context,
      },
      timestamp: Date.now(),
    };
  }
}

/**
 * Error response format
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorContext | undefined;
  };
  timestamp: number;
}

// ============================================================================
// Specialized Error Classes
// ============================================================================

/**
 * Song-related errors
 */
export class SongError extends AppError {
  constructor(code: ErrorCode, userMessage: string, context?: ErrorContext) {
    super(code, userMessage, undefined, "error", context);
    this.name = "SongError";
  }
}

/**
 * Sync-related errors
 */
export class SyncError extends AppError {
  constructor(code: ErrorCode, userMessage: string, context?: ErrorContext) {
    super(code, userMessage, undefined, "warning", context);
    this.name = "SyncError";
  }
}

/**
 * AI-related errors
 */
export class AiError extends AppError {
  constructor(code: ErrorCode, userMessage: string, context?: ErrorContext) {
    super(code, userMessage, undefined, "info", context);
    this.name = "AiError";
  }
}

/**
 * Network-related errors
 */
export class NetworkError extends AppError {
  constructor(code: ErrorCode, userMessage: string, context?: ErrorContext) {
    super(code, userMessage, undefined, "warning", context);
    this.name = "NetworkError";
  }
}

/**
 * Authentication errors
 */
export class AuthError extends AppError {
  constructor(code: ErrorCode, userMessage: string, context?: ErrorContext) {
    super(code, userMessage, undefined, "error", context);
    this.name = "AuthError";
  }
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create a "not found" error
 */
export function createNotFoundError(
  resource: string,
  id?: string,
  context?: Omit<ErrorContext, "metadata">
): AppError {
  return new AppError(
    "SONG_NOT_FOUND",
    `${resource}${id ? ` (ID: ${id})` : ""} 不存在`,
    `Resource not found: ${resource}${id ? ` = ${id}` : ""}`,
    "error",
    {
      ...context,
      location: context?.location || "createNotFoundError",
      metadata: { resource, id },
    }
  );
}

/**
 * Create an unauthorized error
 */
export function createUnauthorizedError(
  message = "未授權的存取",
  context?: Omit<ErrorContext, "metadata">
): AuthError {
  return new AuthError("AUTH_UNAUTHORIZED", message, {
    ...context,
    location: context?.location || "createUnauthorizedError",
  });
}

/**
 * Create a validation error
 */
export function createValidationError(
  field: string,
  reason: string,
  context?: Omit<ErrorContext, "metadata">
): AppError {
  return new AppError(
    "SONG_INVALID_FORMAT",
    `${field} ${reason}`,
    `Validation failed for field: ${field}`,
    "error",
    {
      ...context,
      location: context?.location || "createValidationError",
      metadata: { field, reason },
    }
  );
}

/**
 * Create a network error
 */
export function createNetworkError(
  message: string,
  context?: Omit<ErrorContext, "metadata">
): NetworkError {
  return new NetworkError("NET_NETWORK_ERROR", message, {
    ...context,
    location: context?.location || "createNetworkError",
  });
}

/**
 * Create an AI service error
 */
export function createAiError(
  code: ErrorCode,
  message: string,
  context?: Omit<ErrorContext, "metadata">
): AiError {
  return new AiError(code, message, {
    ...context,
    location: context?.location || "createAiError",
  });
}

// ============================================================================
// Error Utilities
// ============================================================================

/**
 * Check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Get error code from unknown error
 */
export function getErrorCode(error: unknown): ErrorCode {
  if (isAppError(error)) {
    return error.code;
  }
  return "SYS_UNKNOWN_ERROR";
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "發生未知錯誤";
}

/**
 * Log error to console in development
 */
export function logError(error: unknown, context?: ErrorContext): void {
  if (process.env.NODE_ENV === "development") {
    if (isAppError(error)) {
      console.error(`[${error.code}] ${error.name}:`, {
        message: error.userMessage,
        technical: error.technicalMessage,
        severity: error.severity,
        context: error.context || context,
      });
    } else if (error instanceof Error) {
      console.error(`[Error]:`, {
        name: error.name,
        message: error.message,
        stack: error.stack,
        context,
      });
    } else {
      console.error(`[Unknown Error]:`, { error, context });
    }
  }
}

/**
 * Create error response for API routes
 * Compatible with NextResponse.json()
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number = 500,
  details?: Record<string, unknown>
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
        details,
      },
      timestamp: Date.now(),
    },
    { status }
  );
}
