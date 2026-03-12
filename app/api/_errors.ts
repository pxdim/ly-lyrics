/**
 * API Error Response Factory
 *
 * Unified error response format for all API routes.
 * Following specs from docs/spec/error-handling.md
 */

import { NextResponse } from "next/server";
import type { ErrorResponse, ErrorCode } from "@/lib/errors/AppError";

/**
 * Create a standardized error response
 *
 * @param code - Error code from ERROR_CODES
 * @param message - User-friendly error message
 * @param status - HTTP status code
 * @param details - Additional error context
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  details?: Record<string, unknown> | undefined
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details: details as undefined,
      },
      timestamp: Date.now(),
    },
    { status }
  );
}

/**
 * Common error response factory
 */
export const ErrorResponses = {
  /**
   * 404 Not Found
   */
  notFound: (resource: string, id?: string) =>
    createErrorResponse(
      "SONG_NOT_FOUND",
      `${resource}${id ? ` (ID: ${id})` : ""} 不存在`,
      404,
      { resource, id }
    ),

  /**
   * 401 Unauthorized
   */
  unauthorized: (message = "未授權的存取") =>
    createErrorResponse("AUTH_UNAUTHORIZED", message, 401),

  /**
   * 403 Forbidden
   */
  forbidden: (message = "無權限執行此操作") =>
    createErrorResponse("AUTH_UNAUTHORIZED", message, 403),

  /**
   * 429 Rate Limited
   */
  rateLimited: (retryAfter?: number) =>
    createErrorResponse(
      "NET_RATE_LIMITED",
      "請求過於頻繁，請稍後再試",
      429,
      { retryAfter }
    ),

  /**
   * 500 Internal Server Error
   */
  internalError: (message = "伺服器錯誤，請稍後再試") =>
    createErrorResponse("SYS_INTERNAL_ERROR", message, 500),

  /**
   * 400 Bad Request
   */
  badRequest: (message = "請求格式錯誤", field?: string) =>
    createErrorResponse("SONG_INVALID_FORMAT", message, 400, { field }),

  /**
   * 503 Service Unavailable
   */
  serviceUnavailable: (message = "服務暫時無法使用") =>
    createErrorResponse("AI_SERVICE_UNAVAILABLE", message, 503),

  /**
   * 408 Request Timeout
   */
  timeout: (message = "請求超時") =>
    createErrorResponse("NET_TIMEOUT", message, 408),

  /**
   * 413 Payload Too Large
   */
  payloadTooLarge: (maxSize?: string) =>
    createErrorResponse(
      "SONG_TOO_LONG",
      `請求內容過大${maxSize ? ` (最大: ${maxSize})` : ""}`,
      413,
      { maxSize }
    ),
};

/**
 * Wrap an API route handler with error handling
 *
 * @example
 * ```ts
 * export const GET = withErrorHandler(async (request) => {
 *   // Your route logic here
 *   return NextResponse.json({ data: result });
 * });
 * ```
 */
export function withErrorHandler<T = NextResponse>(
  handler: () => Promise<T> | T
): () => Promise<T> {
  return async () => {
    try {
      return await handler();
    } catch (error) {
      console.error("API Error:", error);

      // Handle AppError instances
      if (error && typeof error === "object" && "code" in error) {
        const err = error as { code: ErrorCode; message: string };
        return createErrorResponse(
          err.code,
          err.message,
          500,
          error instanceof Error ? { stack: error.stack } : undefined
        ) as T;
      }

      // Handle Error instances
      if (error instanceof Error) {
        return ErrorResponses.internalError(error.message) as T;
      }

      // Handle unknown errors
      return ErrorResponses.internalError() as T;
    }
  };
}

/**
 * Parse and validate JSON request body
 *
 * @throws {Error} If JSON parsing fails
 */
export async function parseJsonBody<T = unknown>(
  request: Request,
  schema?: {
    parse: (data: unknown) => T;
  }
): Promise<T> {
  try {
    const body = await request.json();

    if (schema) {
      return schema.parse(body);
    }

    return body as T;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("無效的 JSON 格式");
    }
    throw error;
  }
}

/**
 * Get query parameter with default value
 */
export function getQueryParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue?: string
): string | undefined {
  const value = searchParams.get(key);
  return value ?? defaultValue;
}

/**
 * Get numeric query parameter
 */
export function getNumericParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue?: number
): number | undefined {
  const value = searchParams.get(key);
  if (value === null) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get boolean query parameter
 */
export function getBooleanParam(
  searchParams: URLSearchParams,
  key: string,
  defaultValue = false
): boolean {
  const value = searchParams.get(key);
  if (value === null) return defaultValue;
  return value === "true" || value === "1";
}
