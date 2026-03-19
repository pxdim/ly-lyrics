/**
 * Logger 工具測試
 *
 * 驗證 logger 在不同環境下的行為：
 * - development 環境：debug/info 輸出到 console
 * - production 環境：debug/info 靜默
 * - warn/error 在所有環境都輸出
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("logger", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.spyOn(console, "debug").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
    // 清除模組快取，確保每次重新載入 logger 以讀取新的 NODE_ENV
    vi.resetModules();
  });

  // --------------------------------------------------------------------------
  // development 環境
  // --------------------------------------------------------------------------

  describe("in development environment", () => {
    it("debug outputs to console.debug", async () => {
      process.env.NODE_ENV = "development";
      const { logger } = await import("./logger");
      logger.debug("test debug");
      expect(console.debug).toHaveBeenCalledWith("test debug");
    });

    it("info outputs to console.info", async () => {
      process.env.NODE_ENV = "development";
      const { logger } = await import("./logger");
      logger.info("test info");
      expect(console.info).toHaveBeenCalledWith("test info");
    });

    it("warn outputs to console.warn", async () => {
      process.env.NODE_ENV = "development";
      const { logger } = await import("./logger");
      logger.warn("test warn");
      expect(console.warn).toHaveBeenCalledWith("test warn");
    });

    it("error outputs to console.error", async () => {
      process.env.NODE_ENV = "development";
      const { logger } = await import("./logger");
      logger.error("test error");
      expect(console.error).toHaveBeenCalledWith("test error");
    });

    it("passes multiple arguments", async () => {
      process.env.NODE_ENV = "development";
      const { logger } = await import("./logger");
      const err = new Error("something");
      logger.error("failed:", err);
      expect(console.error).toHaveBeenCalledWith("failed:", err);
    });
  });

  // --------------------------------------------------------------------------
  // production 環境
  // --------------------------------------------------------------------------

  describe("in production environment", () => {
    it("debug does not output", async () => {
      process.env.NODE_ENV = "production";
      const { logger } = await import("./logger");
      logger.debug("test debug");
      expect(console.debug).not.toHaveBeenCalled();
    });

    it("info does not output", async () => {
      process.env.NODE_ENV = "production";
      const { logger } = await import("./logger");
      logger.info("test info");
      expect(console.info).not.toHaveBeenCalled();
    });

    it("warn still outputs in production", async () => {
      process.env.NODE_ENV = "production";
      const { logger } = await import("./logger");
      logger.warn("test warn");
      expect(console.warn).toHaveBeenCalledWith("test warn");
    });

    it("error still outputs in production", async () => {
      process.env.NODE_ENV = "production";
      const { logger } = await import("./logger");
      logger.error("test error");
      expect(console.error).toHaveBeenCalledWith("test error");
    });
  });
});
