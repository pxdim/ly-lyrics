/**
 * DesktopLayout 整合測試 — react-grid-layout 佈局
 *
 * 驗證 DesktopLayout 使用 react-grid-layout 的 ResponsiveGridLayout 進行佈局，
 * 確保各卡片正確渲染、props 正確傳遞、佈局鎖定/解鎖行為。
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";

// Mock useIsMobile / useIsTablet — 強制走桌面佈局
vi.mock("@/lib/hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));
vi.mock("@/lib/hooks/useIsTablet", () => ({
  useIsTablet: () => false,
}));

// Mock WebSocket 相關
vi.mock("@/lib/store", () => ({
  useLyricsStore: vi.fn((selector) => {
    const state = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      joinSession: vi.fn(),
      leaveSession: vi.fn(),
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

// Mock sessionStorage
const mockSessionStorage: Record<string, string> = {};
vi.stubGlobal("sessionStorage", {
  getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
  setItem: vi.fn((key: string, val: string) => { mockSessionStorage[key] = val; }),
  removeItem: vi.fn((key: string) => { delete mockSessionStorage[key]; }),
});

// Mock session code 生成
vi.mock("@/lib/websocket/session-code", () => ({
  generateSessionCode: () => "ABC123",
}));

// Mock AI tracking hook
vi.mock("@/lib/hooks/use-ai-tracking", () => ({
  useAiTracking: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    onManualOverride: vi.fn(),
  }),
}));

// Mock 非首屏懶載入元件
vi.mock("next/dynamic", () => ({
  default: (_loader: () => Promise<{ default: React.ComponentType }>) => {
    // 回傳一個簡單的 placeholder 元件
    const DynamicComponent = (props: Record<string, unknown>) => {
      return <div data-testid="dynamic-component" {...props} />;
    };
    DynamicComponent.displayName = "DynamicMock";
    return DynamicComponent;
  },
}));

// Mock 子元件 — 只驗證渲染與 props 傳遞
vi.mock("@/components/controller/LibraryPanel", () => ({
  LibraryPanel: () => <div data-testid="library-panel">LibraryPanel</div>,
}));

vi.mock("@/components/controller/CueGrid", () => ({
  CueGrid: ({ onManualOverride }: { onManualOverride?: () => void }) => (
    <div data-testid="cue-grid" data-has-manual-override={!!onManualOverride}>CueGrid</div>
  ),
}));

vi.mock("@/components/controller/QRCodePanel", () => ({
  QRCodePanel: ({ sessionCode }: { sessionCode: string }) => (
    <div data-testid="qr-code-panel">{sessionCode}</div>
  ),
}));

// Mock EnhancedHeader
vi.mock("@/components/controller/EnhancedHeader", () => ({
  EnhancedHeader: ({ sessionCode }: { sessionCode: string; onRegenerate: () => void }) => (
    <header data-testid="enhanced-header" data-session-code={sessionCode}>
      EnhancedHeader
    </header>
  ),
}));

// Mock DashboardCard
vi.mock("@/components/controller/DashboardCard", () => ({
  DashboardCard: ({ title, children, isLocked }: { title: string; children: React.ReactNode; isLocked?: boolean }) => (
    <div data-testid={`dashboard-card-${title.toLowerCase().replace(/\s+/g, "-")}`} data-locked={isLocked}>
      <span>{title}</span>
      {children}
    </div>
  ),
}));

// Mock ControllerHeader — DesktopLayout 改用 EnhancedHeader 後不再使用
vi.mock("@/components/controller/ControllerHeader", () => ({
  StatusBar: () => <div data-testid="status-bar">StatusBar</div>,
  MobileStatusBar: () => <div data-testid="mobile-status-bar">MobileStatusBar</div>,
}));

vi.mock("@/components/controller/MobileTabBar", () => ({
  MobileTabBar: () => null,
}));

// Mock react-grid-layout/legacy
vi.mock("react-grid-layout/legacy", () => {
  const MockResponsive = ({
    children,
    isDraggable,
    isResizable,
    className,
  }: {
    children: React.ReactNode;
    isDraggable?: boolean;
    isResizable?: boolean;
    className?: string;
    layouts?: Record<string, unknown[]>;
    onLayoutChange?: (current: unknown[], all: unknown) => void;
    [key: string]: unknown;
  }) => (
    <div
      data-testid="responsive-grid-layout"
      data-draggable={isDraggable}
      data-resizable={isResizable}
      className={className}
    >
      {children}
    </div>
  );

  return {
    Responsive: MockResponsive,
    WidthProvider: (Component: React.ComponentType<Record<string, unknown>>) => {
      const WrappedComponent = (props: Record<string, unknown>) => <Component {...props} />;
      WrappedComponent.displayName = "WidthProvider";
      return WrappedComponent;
    },
  };
});

// Mock layout store
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
    TRANSPORT: "transport",
    CONNECTION: "connection",
  },
}));

import ControllerPage from "./page";

// i18n 訊息
const messages = {
  controller: {
    header: {
      room: "ROOM",
      copyCode: "Copy code",
      copyDisplayLink: "Copy link",
      copiedLink: "Copied!",
      copyLink: "Copy link",
      regenerateTooltip: "Regenerate",
      newRoom: "New Room",
      showQRCode: "Show QR",
      systemReady: "SYSTEM READY",
      offline: "OFFLINE",
      ctl: "CTL",
      dsp: "DSP",
    },
  },
  common: {
    close: "Close",
  },
};

/** 包裝 i18n provider */
function renderWithProviders() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ControllerPage />
    </NextIntlClientProvider>,
  );
}

/** 標準佈局（所有卡片可見） */
const standardLayout = {
  lg: [
    { i: "songs", x: 0, y: 0, w: 3, h: 6, minW: 2, minH: 3 },
    { i: "cues", x: 3, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "preview", x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "config", x: 9, y: 3, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "ai", x: 0, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: "playlist", x: 3, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: "transport", x: 6, y: 6, w: 3, h: 2, minW: 3, minH: 2 },
    { i: "connection", x: 9, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
  ],
};

describe("DesktopLayout — react-grid-layout 整合", () => {
  beforeEach(() => {
    vi.mocked(useLayoutStore).mockImplementation((selector) => {
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
  });

  it("renders EnhancedHeader instead of StatusBar", () => {
    renderWithProviders();
    expect(screen.getByTestId("enhanced-header")).toBeInTheDocument();
    // 舊 StatusBar 不應出現在 DesktopLayout
    expect(screen.queryByTestId("status-bar")).not.toBeInTheDocument();
  });

  it("renders ResponsiveGridLayout container", () => {
    renderWithProviders();
    expect(screen.getByTestId("responsive-grid-layout")).toBeInTheDocument();
  });

  it("renders Song Library card with DashboardCard wrapper", () => {
    renderWithProviders();
    expect(screen.getByTestId("dashboard-card-song-library")).toBeInTheDocument();
    expect(screen.getByTestId("library-panel")).toBeInTheDocument();
  });

  it("renders Cue Grid card with onManualOverride prop", () => {
    renderWithProviders();
    expect(screen.getByTestId("dashboard-card-cue-grid")).toBeInTheDocument();
    const cueGrid = screen.getByTestId("cue-grid");
    expect(cueGrid).toBeInTheDocument();
    expect(cueGrid.dataset["hasManualOverride"]).toBe("true");
  });

  it("passes isDraggable=true when layout is unlocked", () => {
    renderWithProviders();
    const grid = screen.getByTestId("responsive-grid-layout");
    expect(grid.dataset["draggable"]).toBe("true");
  });

  it("passes isDraggable=false when layout is locked", () => {
    vi.mocked(useLayoutStore).mockImplementation((selector) => {
      const state = {
        layouts: standardLayout,
        isLocked: true,
        currentPreset: "standard",
        setLayouts: vi.fn(),
        toggleLock: vi.fn(),
        applyPreset: vi.fn(),
      };
      return typeof selector === "function" ? selector(state) : state;
    });

    renderWithProviders();
    const grid = screen.getByTestId("responsive-grid-layout");
    expect(grid.dataset["draggable"]).toBe("false");
  });

  it("hides cards with w=0 or h=0", () => {
    // focus 佈局：ai, playlist, transport, connection 隱藏
    const focusLayout = {
      lg: [
        { i: "songs", x: 0, y: 0, w: 2, h: 8, minW: 2, minH: 3 },
        { i: "cues", x: 2, y: 0, w: 7, h: 8, minW: 4, minH: 4 },
        { i: "preview", x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 2 },
        { i: "config", x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 2 },
        { i: "ai", x: 0, y: 0, w: 0, h: 0 },
        { i: "playlist", x: 0, y: 0, w: 0, h: 0 },
        { i: "transport", x: 0, y: 0, w: 0, h: 0 },
        { i: "connection", x: 0, y: 0, w: 0, h: 0 },
      ],
    };

    vi.mocked(useLayoutStore).mockImplementation((selector) => {
      const state = {
        layouts: focusLayout,
        isLocked: false,
        currentPreset: "focus",
        setLayouts: vi.fn(),
        toggleLock: vi.fn(),
        applyPreset: vi.fn(),
      };
      return typeof selector === "function" ? selector(state) : state;
    });

    renderWithProviders();
    // 可見卡片
    expect(screen.getByTestId("dashboard-card-song-library")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-card-cue-grid")).toBeInTheDocument();
    // 隱藏卡片不應渲染
    expect(screen.queryByTestId("dashboard-card-ai-tracking")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-card-playlist")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-card-connection")).not.toBeInTheDocument();
  });

  it("passes isLocked to DashboardCard", () => {
    vi.mocked(useLayoutStore).mockImplementation((selector) => {
      const state = {
        layouts: standardLayout,
        isLocked: true,
        currentPreset: "standard",
        setLayouts: vi.fn(),
        toggleLock: vi.fn(),
        applyPreset: vi.fn(),
      };
      return typeof selector === "function" ? selector(state) : state;
    });

    renderWithProviders();
    const songCard = screen.getByTestId("dashboard-card-song-library");
    expect(songCard.dataset["locked"]).toBe("true");
  });
});
