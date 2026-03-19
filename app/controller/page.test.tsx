/**
 * ControllerPage 整合測試
 *
 * 驗證 ControllerPage 組裝層的核心行為：
 * - session code 生成與持久化
 * - WebSocket 連線生命週期（mount/unmount）
 * - 三級 RWD 佈局切換（桌面 / 平板 / 手機）
 * - session code 重新生成流程
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import React from "react";

// ── Mock 設定（必須在 import 被測元件之前） ──

// 控制 RWD 佈局的 mock — 預設桌面版
let mockIsMobile = false;
let mockIsTablet = false;

vi.mock("@/lib/hooks/useIsMobile", () => ({
  useIsMobile: () => mockIsMobile,
}));
vi.mock("@/lib/hooks/useIsTablet", () => ({
  useIsTablet: () => mockIsTablet,
}));

// WebSocket 相關 mock — 使用可追蹤的 vi.fn()
const mockConnect = vi.fn();
const mockDisconnect = vi.fn();
const mockJoinSession = vi.fn();
const mockLeaveSession = vi.fn();

vi.mock("@/lib/store", () => ({
  useLyricsStore: vi.fn((selector) => {
    const state = {
      connect: mockConnect,
      disconnect: mockDisconnect,
      joinSession: mockJoinSession,
      leaveSession: mockLeaveSession,
      connectionState: "connected",
      controllerCount: 1,
      displayCount: 0,
      currentSong: null,
      lyrics: [],
      currentIndex: 0,
      jumpToLine: vi.fn(),
      displaySettings: {},
      nextLine: vi.fn(),
      prevLine: vi.fn(),
      togglePlaying: vi.fn(),
      isPlaying: false,
    };
    return selector(state);
  }),
}));

// sessionStorage — 使用 jsdom 原生實作，透過 spy 追蹤呼叫
const spyGetItem = vi.spyOn(Storage.prototype, "getItem");
const spySetItem = vi.spyOn(Storage.prototype, "setItem");

// Session code 生成 mock — 透過 vi.fn() 動態控制回傳值
const mockGenerateSessionCode = vi.fn(() => "ABC123");
vi.mock("@/lib/websocket/session-code", () => ({
  generateSessionCode: () => mockGenerateSessionCode(),
}));

// AI tracking hook mock
vi.mock("@/lib/hooks/use-ai-tracking", () => ({
  useAiTracking: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    onManualOverride: vi.fn(),
  }),
}));

// next/dynamic mock — 懶載入元件替換為簡單 placeholder
vi.mock("next/dynamic", () => ({
  default: (_loader: () => Promise<{ default: React.ComponentType }>) => {
    const DynamicComponent = (props: Record<string, unknown>) => (
      <div data-testid="dynamic-component" {...props} />
    );
    DynamicComponent.displayName = "DynamicMock";
    return DynamicComponent;
  },
}));

// 子元件 mock — 只驗證渲染與 props 傳遞
vi.mock("@/components/controller/LibraryPanel", () => ({
  LibraryPanel: () => <div data-testid="library-panel">LibraryPanel</div>,
}));

vi.mock("@/components/controller/CueGrid", () => ({
  CueGrid: ({ onManualOverride }: { onManualOverride?: () => void }) => (
    <div data-testid="cue-grid" data-has-manual-override={!!onManualOverride}>
      CueGrid
    </div>
  ),
}));

vi.mock("@/components/controller/QRCodePanel", () => ({
  QRCodePanel: ({ sessionCode }: { sessionCode: string }) => (
    <div data-testid="qr-code-panel">{sessionCode}</div>
  ),
}));

vi.mock("@/components/controller/EnhancedHeader", () => ({
  EnhancedHeader: ({
    sessionCode,
    onRegenerate,
  }: {
    sessionCode: string;
    onRegenerate: () => void;
  }) => (
    <header data-testid="enhanced-header" data-session-code={sessionCode}>
      <button data-testid="regenerate-btn" onClick={onRegenerate}>
        重新生成
      </button>
    </header>
  ),
}));

vi.mock("@/components/controller/DashboardCard", () => ({
  DashboardCard: ({
    title,
    children,
    isLocked,
  }: {
    title: string;
    children: React.ReactNode;
    isLocked?: boolean;
  }) => (
    <div
      data-testid={`dashboard-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
      data-locked={isLocked}
    >
      <span>{title}</span>
      {children}
    </div>
  ),
}));

vi.mock("@/components/controller/ControllerHeader", () => ({
  StatusBar: ({
    sessionCode,
    onRegenerate,
  }: {
    sessionCode: string;
    onRegenerate: () => void;
  }) => (
    <div data-testid="status-bar" data-session-code={sessionCode}>
      <button data-testid="tablet-regenerate-btn" onClick={onRegenerate}>
        重新生成
      </button>
    </div>
  ),
  MobileStatusBar: ({
    sessionCode,
    onRegenerate,
  }: {
    sessionCode: string;
    isConnected: boolean;
    onRegenerate: () => void;
  }) => (
    <div data-testid="mobile-status-bar" data-session-code={sessionCode}>
      <button data-testid="mobile-regenerate-btn" onClick={onRegenerate}>
        重新生成
      </button>
    </div>
  ),
}));

vi.mock("@/components/controller/MobileTabBar", () => ({
  MobileTabBar: ({
    activeTab,
    onTabChange,
  }: {
    activeTab: string;
    onTabChange: (tab: string) => void;
  }) => (
    <nav data-testid="mobile-tab-bar" data-active-tab={activeTab}>
      <button data-testid="tab-songs" onClick={() => onTabChange("songs")}>
        songs
      </button>
      <button data-testid="tab-lyrics" onClick={() => onTabChange("lyrics")}>
        lyrics
      </button>
      <button
        data-testid="tab-settings"
        onClick={() => onTabChange("settings")}
      >
        settings
      </button>
    </nav>
  ),
}));

// react-grid-layout mock
vi.mock("react-grid-layout/legacy", () => {
  const MockResponsive = ({
    children,
    isDraggable,
    isResizable,
  }: {
    children: React.ReactNode;
    isDraggable?: boolean;
    isResizable?: boolean;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="responsive-grid-layout"
      data-draggable={isDraggable}
      data-resizable={isResizable}
    >
      {children}
    </div>
  );

  return {
    Responsive: MockResponsive,
    WidthProvider: (Component: React.ComponentType<Record<string, unknown>>) => {
      const WrappedComponent = (props: Record<string, unknown>) => (
        <Component {...props} />
      );
      WrappedComponent.displayName = "WidthProvider";
      return WrappedComponent;
    },
  };
});

// Layout store mock
import { useLayoutStore } from "@/lib/store/layout-store";
vi.mock("@/lib/store/layout-store", () => ({
  useLayoutStore: vi.fn(),
  CARD_IDS: {
    SONGS: "songs",
    CUES: "cues",
    PREVIEW: "preview",
    CONFIG: "config",
    AI: "ai",
    PLAYLIST: "playlist",
    CONNECTION: "connection",
  },
}));

// next-intl mock
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// ── 被測元件匯入 ──
import ControllerPage from "./page";

// ── 標準佈局資料 ──
const standardLayout = {
  lg: [
    { i: "songs", x: 0, y: 0, w: 3, h: 6, minW: 2, minH: 3 },
    { i: "cues", x: 3, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "preview", x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "config", x: 9, y: 3, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "ai", x: 0, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "playlist", x: 4, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
    { i: "connection", x: 8, y: 6, w: 4, h: 2, minW: 2, minH: 2 },
  ],
};

// ── 測試工具 ──

/** 重設所有 mock 狀態 */
function resetMocks() {
  mockIsMobile = false;
  mockIsTablet = false;
  mockGenerateSessionCode.mockReset().mockReturnValue("ABC123");
  mockConnect.mockClear();
  mockDisconnect.mockClear();
  mockJoinSession.mockClear();
  mockLeaveSession.mockClear();
  spyGetItem.mockClear();
  spySetItem.mockClear();

  // 清除 jsdom sessionStorage
  sessionStorage.clear();

  // 清除 URL 參數（避免前一個測試殘留的 ?code= 影響後續測試）
  window.history.replaceState({}, "", window.location.pathname);

  // 重設 layout store
  (useLayoutStore as unknown as Mock).mockImplementation((selector: (state: Record<string, unknown>) => unknown) => {
    const state = {
      layouts: standardLayout,
      isLocked: false,
      currentPreset: "standard",
      setLayouts: vi.fn(),
      toggleLock: vi.fn(),
      applyPreset: vi.fn(),
    };
    return typeof selector === "function" ? selector(state) : state;
  });
}

// ── 測試 ──

describe("ControllerPage — 組裝層整合測試", () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ── 基本渲染 ──

  describe("基本渲染", () => {
    it("頁面渲染不 crash", () => {
      expect(() => render(<ControllerPage />)).not.toThrow();
    });

    it("產生 6 碼 session code 並顯示", () => {
      render(<ControllerPage />);
      // 桌面版使用 EnhancedHeader，session code 透過 data attribute 傳遞
      const header = screen.getByTestId("enhanced-header");
      expect(header.dataset["sessionCode"]).toBe("ABC123");
      expect(header.dataset["sessionCode"]).toHaveLength(6);
    });

    it("將 session code 寫入 sessionStorage", () => {
      render(<ControllerPage />);
      expect(spySetItem).toHaveBeenCalledWith("ly_controller_code", "ABC123");
    });
  });

  // ── WebSocket 連線生命週期 ──

  describe("WebSocket 連線生命週期", () => {
    it("mount 時呼叫 connect() 和 joinSession()", () => {
      render(<ControllerPage />);
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockJoinSession).toHaveBeenCalledWith("ABC123", "controller");
    });

    it("unmount 時呼叫 leaveSession() 和 disconnect()", () => {
      const { unmount } = render(<ControllerPage />);
      // 清除 mount 階段的呼叫記錄
      mockLeaveSession.mockClear();
      mockDisconnect.mockClear();

      unmount();

      expect(mockLeaveSession).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  // ── RWD 佈局切換 ──

  describe("RWD 佈局切換", () => {
    it("桌面版渲染 EnhancedHeader，不渲染 MobileStatusBar", () => {
      mockIsMobile = false;
      mockIsTablet = false;
      render(<ControllerPage />);

      expect(screen.getByTestId("enhanced-header")).toBeInTheDocument();
      expect(screen.queryByTestId("mobile-status-bar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("mobile-tab-bar")).not.toBeInTheDocument();
    });

    it("手機版渲染 MobileStatusBar + MobileTabBar，不渲染 EnhancedHeader", () => {
      mockIsMobile = true;
      mockIsTablet = false;
      render(<ControllerPage />);

      expect(screen.getByTestId("mobile-status-bar")).toBeInTheDocument();
      expect(screen.getByTestId("mobile-tab-bar")).toBeInTheDocument();
      expect(screen.queryByTestId("enhanced-header")).not.toBeInTheDocument();
    });

    it("平板版渲染 StatusBar，不渲染 EnhancedHeader 和 MobileStatusBar", () => {
      mockIsMobile = false;
      mockIsTablet = true;
      render(<ControllerPage />);

      expect(screen.getByTestId("status-bar")).toBeInTheDocument();
      expect(screen.queryByTestId("enhanced-header")).not.toBeInTheDocument();
      expect(screen.queryByTestId("mobile-status-bar")).not.toBeInTheDocument();
      expect(screen.queryByTestId("mobile-tab-bar")).not.toBeInTheDocument();
    });
  });

  // ── Session Code 重新生成 ──

  describe("Session Code 重新生成", () => {
    it("重新產生 session code 時依序呼叫 leaveSession → disconnect → connect → joinSession", () => {
      render(<ControllerPage />);

      // 清除 mount 階段的呼叫記錄
      mockLeaveSession.mockClear();
      mockDisconnect.mockClear();
      mockConnect.mockClear();
      mockJoinSession.mockClear();

      // 設定下次呼叫 generateSessionCode 回傳新 code
      mockGenerateSessionCode.mockReturnValueOnce("XYZ789");

      // 點擊重新生成按鈕（桌面版在 EnhancedHeader 內）
      const regenerateBtn = screen.getByTestId("regenerate-btn");
      fireEvent.click(regenerateBtn);

      // 驗證呼叫順序
      expect(mockLeaveSession).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      expect(mockConnect).toHaveBeenCalledTimes(1);
      expect(mockJoinSession).toHaveBeenCalledWith("XYZ789", "controller");
    });

    it("重新生成後更新 sessionStorage", () => {
      render(<ControllerPage />);
      spySetItem.mockClear();

      // 設定下次呼叫 generateSessionCode 回傳新 code
      mockGenerateSessionCode.mockReturnValueOnce("XYZ789");

      const regenerateBtn = screen.getByTestId("regenerate-btn");
      fireEvent.click(regenerateBtn);

      expect(spySetItem).toHaveBeenCalledWith("ly_controller_code", "XYZ789");
    });

    it("重新生成後 header 顯示新的 session code", () => {
      render(<ControllerPage />);

      // 設定下次呼叫 generateSessionCode 回傳新 code
      mockGenerateSessionCode.mockReturnValueOnce("XYZ789");

      const regenerateBtn = screen.getByTestId("regenerate-btn");
      fireEvent.click(regenerateBtn);

      const header = screen.getByTestId("enhanced-header");
      expect(header.dataset["sessionCode"]).toBe("XYZ789");
    });
  });

  // ── Session Code 持久化優先順序 ──

  describe("Session Code 持久化", () => {
    it("優先從 sessionStorage 讀取既有 6 碼 code", () => {
      // 使用 jsdom 原生 sessionStorage 設定既有 code
      sessionStorage.setItem("ly_controller_code", "ABCDEF");
      // 驗證 sessionStorage 確實設定成功
      expect(sessionStorage.getItem("ly_controller_code")).toBe("ABCDEF");
      // 清除設定階段的 spy 記錄
      spySetItem.mockClear();
      spyGetItem.mockClear();
      mockJoinSession.mockClear();
      mockGenerateSessionCode.mockClear();

      render(<ControllerPage />);

      // 應使用 sessionStorage 中的 code，而非呼叫 generateSessionCode
      expect(mockJoinSession).toHaveBeenCalledWith("ABCDEF", "controller");
      expect(mockGenerateSessionCode).not.toHaveBeenCalled();
    });
  });
});
