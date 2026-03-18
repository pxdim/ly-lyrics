/**
 * AiTrackingPanel 元件測試
 *
 * 覆蓋範圍：
 * 1. 基本渲染：標題、開關、設定齒輪
 * 2. 手動校正提示：AI 啟動時顯示校正操作提示
 * 3. 進階設定面板展開
 * 4. 錯誤訊息顯示
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

const mockStoreState: Record<string, unknown> = {};

function setMockState(overrides: Record<string, unknown> = {}) {
  // 預設 AI 追蹤狀態
  Object.assign(mockStoreState, {
    aiTracking: {
      isActive: false,
      status: "idle",
      confidence: 0,
      lastMatchedLine: null,
      cooldownUntil: null,
      sttProvider: "google-cloud",
      errorMessage: null,
      lastTranscript: null,
      lastTranscriptFinal: false,
    },
    aiSettings: {
      sttProvider: "google-cloud",
      apiKey: null,
      confidenceThreshold: 0.45,
      windowBefore: 2,
      windowAfter: 5,
      manualOverrideCooldown: 5000,
      fullScanThreshold: 0.7,
    },
    audioInput: {
      deviceId: null,
      gain: 0,
      volume: 0,
      isCapturing: false,
    },
    updateAiSettings: vi.fn(),
    updateAudioInput: vi.fn(),
    ...overrides,
  });
}

vi.mock("@/lib/store", () => ({
  useLyricsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    return selector(mockStoreState);
  },
}));

// Mock AudioInputSelector — 不測試音訊選擇器
vi.mock("./AudioInputSelector", () => ({
  AudioInputSelector: () => <div data-testid="audio-input-selector" />,
}));

// Mock AiStatusIndicator — 不測試狀態指示器（有獨立測試）
vi.mock("./AiStatusIndicator", () => ({
  AiStatusIndicator: () => <div data-testid="ai-status-indicator" />,
}));

import { AiTrackingPanel } from "./AiTrackingPanel";

// ============================================================================
// 測試
// ============================================================================

describe("AiTrackingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMockState();
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders AI tracking toggle label", () => {
      render(<AiTrackingPanel onToggle={vi.fn()} />);

      expect(screen.getByText("AI 自動跟歌")).toBeInTheDocument();
    });

    it("renders toggle switch with correct aria attributes", () => {
      render(<AiTrackingPanel onToggle={vi.fn()} />);

      const toggle = screen.getByRole("switch", { name: "切換 AI 自動跟歌" });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("renders settings button with aria-label", () => {
      render(<AiTrackingPanel onToggle={vi.fn()} />);

      const settingsBtn = screen.getByRole("button", {
        name: "展開 AI 自動跟歌設定",
      });
      expect(settingsBtn).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 開關互動
  // --------------------------------------------------------------------------

  describe("toggle interaction", () => {
    it("calls onToggle(true) when toggle is clicked from off", () => {
      const onToggle = vi.fn();
      render(<AiTrackingPanel onToggle={onToggle} />);

      const toggle = screen.getByRole("switch", { name: "切換 AI 自動跟歌" });
      fireEvent.click(toggle);

      expect(onToggle).toHaveBeenCalledWith(true);
    });

    it("calls onToggle(false) when toggle is clicked from on", () => {
      setMockState({
        aiTracking: {
          isActive: true,
          status: "listening",
          confidence: 0,
          lastMatchedLine: null,
          cooldownUntil: null,
          sttProvider: "google-cloud",
          errorMessage: null,
          lastTranscript: null,
          lastTranscriptFinal: false,
        },
      });
      const onToggle = vi.fn();
      render(<AiTrackingPanel onToggle={onToggle} />);

      const toggle = screen.getByRole("switch", { name: "切換 AI 自動跟歌" });
      fireEvent.click(toggle);

      expect(onToggle).toHaveBeenCalledWith(false);
    });
  });

  // --------------------------------------------------------------------------
  // 手動校正提示
  // --------------------------------------------------------------------------

  describe("manual correction hint", () => {
    it("displays correction hint when AI tracking is active", () => {
      setMockState({
        aiTracking: {
          isActive: true,
          status: "listening",
          confidence: 0,
          lastMatchedLine: null,
          cooldownUntil: null,
          sttProvider: "google-cloud",
          errorMessage: null,
          lastTranscript: null,
          lastTranscriptFinal: false,
        },
      });

      render(<AiTrackingPanel onToggle={vi.fn()} />);

      // 應顯示手動校正提示文字
      expect(
        screen.getByText(/點擊歌詞行.*校正/),
      ).toBeInTheDocument();
    });

    it("does not display correction hint when AI tracking is inactive", () => {
      setMockState({
        aiTracking: {
          isActive: false,
          status: "idle",
          confidence: 0,
          lastMatchedLine: null,
          cooldownUntil: null,
          sttProvider: "google-cloud",
          errorMessage: null,
          lastTranscript: null,
          lastTranscriptFinal: false,
        },
      });

      render(<AiTrackingPanel onToggle={vi.fn()} />);

      expect(screen.queryByText(/點擊歌詞行.*校正/)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 進階設定
  // --------------------------------------------------------------------------

  describe("advanced settings", () => {
    it("shows advanced settings when settings button is clicked", () => {
      render(<AiTrackingPanel onToggle={vi.fn()} />);

      const settingsBtn = screen.getByRole("button", {
        name: "展開 AI 自動跟歌設定",
      });
      fireEvent.click(settingsBtn);

      expect(screen.getByText("進階設定")).toBeInTheDocument();
      expect(screen.getByText("辨識引擎")).toBeInTheDocument();
      expect(screen.getByText("比對門檻")).toBeInTheDocument();
      expect(screen.getByText("手動冷卻")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 錯誤訊息
  // --------------------------------------------------------------------------

  describe("error message", () => {
    it("shows error message when AI tracking has error and is inactive", () => {
      setMockState({
        aiTracking: {
          isActive: false,
          status: "error",
          confidence: 0,
          lastMatchedLine: null,
          cooldownUntil: null,
          sttProvider: "google-cloud",
          errorMessage: "麥克風權限被拒絕",
          lastTranscript: null,
          lastTranscriptFinal: false,
        },
      });

      render(<AiTrackingPanel onToggle={vi.fn()} />);

      expect(screen.getByText("麥克風權限被拒絕")).toBeInTheDocument();
    });
  });
});
