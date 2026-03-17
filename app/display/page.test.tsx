/**
 * Display Page 測試
 *
 * 測試 Clean Output 模式（?mode=clean）的行為：
 * - Clean Output 未連線時顯示純黑畫面（無同步碼輸入 UI）
 * - Clean Output 已連線時只渲染 LyricsDisplay，無 UI chrome
 * - Clean Output 斷線時歌詞凍結、無重連 UI
 * - 一般模式 Song Info Overlay 使用 animate-fade-out-slow
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

// 模擬 useSearchParams 回傳值
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
}));

// 模擬 store 狀態 — 使用 Map-like 物件，以 bracket notation 存取避免 TS4111
const mockStoreState = new Map<string, unknown>([
  ["connect", vi.fn()],
  ["disconnect", vi.fn()],
  ["joinSession", vi.fn()],
  ["leaveSession", vi.fn()],
  ["currentSong", null],
  ["connectionState", "disconnected"],
]);

vi.mock("@/lib/store", () => ({
  useLyricsStore: (selector: (state: Record<string, unknown>) => unknown) => {
    // 將 Map 轉為普通物件供 selector 使用
    const stateObj: Record<string, unknown> = {};
    mockStoreState.forEach((value, key) => {
      stateObj[key] = value;
    });
    return selector(stateObj);
  },
}));

// 模擬子元件 — 以 data-testid 識別是否被渲染
vi.mock("@/components/lyrics/LyricsDisplay", () => ({
  LyricsDisplay: () => <div data-testid="lyrics-display">LyricsDisplay</div>,
}));

vi.mock("@/components/lyrics/LyricsControl", () => ({
  LyricsControl: () => <div data-testid="lyrics-control">LyricsControl</div>,
}));

vi.mock("@/components/display/ConnectionStatusBar", () => ({
  ConnectionStatusBar: () => (
    <div data-testid="connection-status-bar">ConnectionStatusBar</div>
  ),
}));

vi.mock("@/components/display/ConnectionIndicator", () => ({
  ConnectionIndicator: () => (
    <div data-testid="connection-indicator">ConnectionIndicator</div>
  ),
}));

// 模擬 lucide-react 圖示
vi.mock("lucide-react", () => ({
  Link2: () => <span data-testid="icon-link2" />,
  Check: () => <span data-testid="icon-check" />,
}));

import DisplayPageWrapper from "./page";

// ============================================================================
// 測試輔助
// ============================================================================

/** 設定 searchParams */
function setup(params: Record<string, string> = {}) {
  mockSearchParams = new URLSearchParams(params);
}

/** 模擬「已連線」狀態（code 已填滿 6 碼） */
function simulateConnected(params: Record<string, string> = {}) {
  setup({ code: "ABC123", ...params });
  mockStoreState.set("connectionState", "connected");
}

/** 重設所有 store 狀態到初始值 */
function resetStoreState() {
  mockStoreState.set("connect", vi.fn());
  mockStoreState.set("disconnect", vi.fn());
  mockStoreState.set("joinSession", vi.fn());
  mockStoreState.set("leaveSession", vi.fn());
  mockStoreState.set("currentSong", null);
  mockStoreState.set("connectionState", "disconnected");
}

// ============================================================================
// 測試
// ============================================================================

describe("Display Page — Clean Output 模式", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 清除 sessionStorage 避免 auto-connect 殘留
    sessionStorage.clear();
    resetStoreState();
  });

  // --------------------------------------------------------------------------
  // Clean Output 未連線：純黑等待畫面
  // --------------------------------------------------------------------------

  it("Clean Output 未連線時顯示純黑等待畫面，不顯示同步碼輸入 UI", () => {
    setup({ mode: "clean" });

    const { container } = render(<DisplayPageWrapper />);

    // 應該有純黑背景的 div
    const blackScreen = container.querySelector('[style*="background"]');
    expect(blackScreen).toBeTruthy();
    expect((blackScreen as HTMLElement).style.background).toBe(
      "rgb(0, 0, 0)"
    );

    // 不應顯示同步碼輸入框
    expect(screen.queryByPlaceholderText("______")).toBeNull();

    // 不應顯示任何 UI chrome
    expect(screen.queryByTestId("lyrics-display")).toBeNull();
    expect(screen.queryByTestId("lyrics-control")).toBeNull();
    expect(screen.queryByTestId("connection-status-bar")).toBeNull();
    expect(screen.queryByTestId("connection-indicator")).toBeNull();
  });

  // --------------------------------------------------------------------------
  // Clean Output 已連線：只有 LyricsDisplay
  // --------------------------------------------------------------------------

  it("Clean Output 已連線時只渲染 LyricsDisplay，無 UI chrome", () => {
    simulateConnected({ mode: "clean" });

    render(<DisplayPageWrapper />);

    // 應渲染 LyricsDisplay
    expect(screen.getByTestId("lyrics-display")).toBeInTheDocument();

    // 不應渲染 UI chrome
    expect(screen.queryByTestId("connection-status-bar")).toBeNull();
    expect(screen.queryByTestId("connection-indicator")).toBeNull();
    expect(screen.queryByTestId("lyrics-control")).toBeNull();
  });

  it("Clean Output 已連線時背景為純黑 #000000", () => {
    simulateConnected({ mode: "clean" });

    const { container } = render(<DisplayPageWrapper />);

    // 最外層 div 應有純黑背景
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.background).toBe("rgb(0, 0, 0)");
  });

  // --------------------------------------------------------------------------
  // Clean Output 斷線行為：歌詞凍結、無重連 UI
  // --------------------------------------------------------------------------

  it("Clean Output 已連線後斷線時歌詞不改變透明度", () => {
    simulateConnected({ mode: "clean" });
    mockStoreState.set("connectionState", "disconnected");

    const { container } = render(<DisplayPageWrapper />);

    // Clean Output 斷線時不應有 opacity 降低的樣式
    const lyricsWrapper = container.querySelector(
      '[data-testid="lyrics-display"]'
    )?.parentElement;
    // 如果有包裹層，不應該有 opacity: 0.5
    if (lyricsWrapper) {
      expect(lyricsWrapper.style.opacity).not.toBe("0.5");
    }
  });

  it("Clean Output 已連線後斷線時不顯示 ConnectionStatusBar", () => {
    simulateConnected({ mode: "clean" });
    mockStoreState.set("connectionState", "disconnected");

    render(<DisplayPageWrapper />);

    expect(screen.queryByTestId("connection-status-bar")).toBeNull();
  });

  // --------------------------------------------------------------------------
  // 一般模式不受影響
  // --------------------------------------------------------------------------

  it("一般模式（無 mode=clean）未連線時顯示同步碼輸入 UI", () => {
    setup({});

    render(<DisplayPageWrapper />);

    expect(screen.getByPlaceholderText("______")).toBeInTheDocument();
  });

  it("一般模式已連線時顯示所有 UI chrome", () => {
    simulateConnected();

    render(<DisplayPageWrapper />);

    expect(screen.getByTestId("lyrics-display")).toBeInTheDocument();
    expect(screen.getByTestId("connection-status-bar")).toBeInTheDocument();
    expect(screen.getByTestId("connection-indicator")).toBeInTheDocument();
    expect(screen.getByTestId("lyrics-control")).toBeInTheDocument();
  });
});

describe("Display Page — Song Info Overlay fade-out 動畫", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    resetStoreState();
    mockStoreState.set("connectionState", "connected");
    mockStoreState.set("currentSong", {
      id: "s1",
      title: "測試歌曲",
      artist: "測試歌手",
      lyrics: [],
      userId: "u",
      createdAt: "",
      updatedAt: "",
    });
  });

  it("Song Info Overlay 使用 animate-fade-out-slow 而非 inline animation", () => {
    setup({ code: "ABC123" });

    render(<DisplayPageWrapper />);

    // 找到包含歌名的 overlay
    const songTitle = screen.getByText("測試歌曲");
    const overlay = songTitle.closest("[class*='animate-']") as HTMLElement;
    expect(overlay).toBeTruthy();

    // 應使用 Tailwind config 定義的 animate-fade-out-slow
    expect(overlay.className).toContain("animate-fade-out-slow");

    // 不應包含 inline animation 定義
    expect(overlay.className).not.toContain("animate-[fade-out");
  });

  it("Clean Output 模式已連線時不渲染 Song Info Overlay", () => {
    setup({ code: "ABC123", mode: "clean" });

    render(<DisplayPageWrapper />);

    expect(screen.queryByText("測試歌曲")).toBeNull();
  });
});
