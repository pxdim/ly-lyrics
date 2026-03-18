/**
 * QuickSettings 元件測試
 *
 * 覆蓋範圍：
 * 1. 基本渲染：標題、顯示行數/字體大小/行距 slider、高亮色按鈕、主題切換
 * 2. 設定變更回呼：slider 拖動觸發 updateDisplaySettings
 * 3. 高亮色選擇：點擊色塊觸發設定更新
 * 4. 主題切換：dark/light 按鈕
 * 5. Toggle 開關：BACKGROUND / AUTO SCROLL / ANIMATION
 * 6. Quick Actions：RESTART WS / BLACKOUT 按鈕
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ============================================================================
// Mock 設定
// ============================================================================

const mockStoreState = new Map<string, unknown>();

const defaultDisplaySettings = {
  displayLines: 4,
  fontSize: 32,
  fontFamily: "Inter",
  lineSpacing: 0.5,
  theme: "dark" as const,
  showBackground: true,
  backgroundColor: "#000000",
  backgroundImage: "",
  textColor: "#ffffff",
  highlightColor: "#0ea5e9",
  autoScroll: true,
  scrollDuration: 300,
  enableAnimation: true,
};

const mockUpdateDisplaySettings = vi.fn();
const mockDisconnect = vi.fn();
const mockConnect = vi.fn();
const mockSetCurrentSong = vi.fn();

vi.mock("@/lib/store", () => ({
  useLyricsStore: Object.assign(
    (selector: (state: Record<string, unknown>) => unknown) => {
      const stateObj: Record<string, unknown> = {};
      mockStoreState.forEach((value, key) => {
        stateObj[key] = value;
      });
      return selector(stateObj);
    },
    {
      getState: () => ({
        disconnect: mockDisconnect,
        connect: mockConnect,
        setCurrentSong: mockSetCurrentSong,
      }),
    },
  ),
}));

// Mock ToggleRow — 渲染可互動的簡化版
vi.mock("./ToggleRow", () => ({
  ToggleRow: ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={`toggle-${label.toLowerCase().replace(/\s/g, "-")}`}
      onClick={() => onChange(!checked)}
    >
      {label}
    </div>
  ),
}));

import { QuickSettings } from "./QuickSettings";

// ============================================================================
// 測試輔助
// ============================================================================

function resetStore(overrides: Record<string, unknown> = {}) {
  mockStoreState.clear();
  mockStoreState.set("displaySettings", { ...defaultDisplaySettings });
  mockStoreState.set("updateDisplaySettings", mockUpdateDisplaySettings);
  for (const [key, value] of Object.entries(overrides)) {
    mockStoreState.set(key, value);
  }
}

// ============================================================================
// 測試
// ============================================================================

describe("QuickSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStore();
  });

  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  describe("basic rendering", () => {
    it("renders the Display Config header", () => {
      render(<QuickSettings />);

      expect(screen.getByText("Display Config")).toBeInTheDocument();
    });

    it("renders Lines label and current value", () => {
      render(<QuickSettings />);

      expect(screen.getByText("Lines")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
    });

    it("renders Font Size label and current value", () => {
      render(<QuickSettings />);

      expect(screen.getByText("Font Size")).toBeInTheDocument();
      expect(screen.getByText("32px")).toBeInTheDocument();
    });

    it("renders Line Spacing label and current value", () => {
      render(<QuickSettings />);

      expect(screen.getByText("Line Spacing")).toBeInTheDocument();
      expect(screen.getByText("0.5x")).toBeInTheDocument();
    });

    it("renders Highlight label with 6 color buttons", () => {
      render(<QuickSettings />);

      expect(screen.getByText("Highlight")).toBeInTheDocument();

      // 6 個高亮色按鈕
      const colorButtons = screen.getAllByTitle(
        /Primary|Secondary|Green|Pink|Gold|Orange/,
      );
      expect(colorButtons).toHaveLength(6);
    });

    it("renders Theme section with DARK and LIGHT buttons", () => {
      render(<QuickSettings />);

      expect(screen.getByText("Theme")).toBeInTheDocument();
      expect(screen.getByText("DARK")).toBeInTheDocument();
      expect(screen.getByText("LIGHT")).toBeInTheDocument();
    });

    it("renders toggle switches for background, auto scroll, and animation", () => {
      render(<QuickSettings />);

      expect(screen.getByText("BACKGROUND")).toBeInTheDocument();
      expect(screen.getByText("AUTO SCROLL")).toBeInTheDocument();
      expect(screen.getByText("ANIMATION")).toBeInTheDocument();
    });

    it("renders Quick Actions buttons", () => {
      render(<QuickSettings />);

      expect(screen.getByText("RESTART WS")).toBeInTheDocument();
      expect(screen.getByText("BLACKOUT")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // Slider 設定變更
  // --------------------------------------------------------------------------

  describe("slider settings changes", () => {
    it("calls updateDisplaySettings with new displayLines when Lines slider changes", () => {
      render(<QuickSettings />);

      const sliders = screen.getAllByRole("slider");
      // 第一個 slider 是 Lines
      fireEvent.change(sliders[0]!, { target: { value: "6" } });

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        displayLines: 6,
      });
    });

    it("calls updateDisplaySettings with new fontSize when Font Size slider changes", () => {
      render(<QuickSettings />);

      const sliders = screen.getAllByRole("slider");
      // 第二個 slider 是 Font Size
      fireEvent.change(sliders[1]!, { target: { value: "48" } });

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        fontSize: 48,
      });
    });

    it("calls updateDisplaySettings with new lineSpacing when Line Spacing slider changes", () => {
      render(<QuickSettings />);

      const sliders = screen.getAllByRole("slider");
      // 第三個 slider 是 Line Spacing
      fireEvent.change(sliders[2]!, { target: { value: "1.5" } });

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        lineSpacing: 1.5,
      });
    });
  });

  // --------------------------------------------------------------------------
  // 高亮色選擇
  // --------------------------------------------------------------------------

  describe("highlight color selection", () => {
    it("calls updateDisplaySettings with selected highlight color", () => {
      render(<QuickSettings />);

      // 點擊 Green 色塊
      fireEvent.click(screen.getByTitle("Green"));

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        highlightColor: "#00FF88",
      });
    });

    it("calls updateDisplaySettings with Primary color", () => {
      render(<QuickSettings />);

      fireEvent.click(screen.getByTitle("Primary"));

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        highlightColor: "#FF6A00",
      });
    });

    it("calls updateDisplaySettings with Secondary color", () => {
      render(<QuickSettings />);

      fireEvent.click(screen.getByTitle("Secondary"));

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        highlightColor: "#00E5FF",
      });
    });
  });

  // --------------------------------------------------------------------------
  // 主題切換
  // --------------------------------------------------------------------------

  describe("theme toggle", () => {
    it("calls updateDisplaySettings with dark theme when DARK button is clicked", () => {
      render(<QuickSettings />);

      fireEvent.click(screen.getByText("DARK"));

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        theme: "dark",
      });
    });

    it("calls updateDisplaySettings with light theme when LIGHT button is clicked", () => {
      render(<QuickSettings />);

      fireEvent.click(screen.getByText("LIGHT"));

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        theme: "light",
      });
    });
  });

  // --------------------------------------------------------------------------
  // Toggle 開關
  // --------------------------------------------------------------------------

  describe("toggle switches", () => {
    it("calls updateDisplaySettings to toggle showBackground off", () => {
      render(<QuickSettings />);

      fireEvent.click(screen.getByTestId("toggle-background"));

      // showBackground 原本 true → onChange(!true) → false
      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        showBackground: false,
      });
    });

    it("calls updateDisplaySettings to toggle autoScroll off", () => {
      render(<QuickSettings />);

      fireEvent.click(screen.getByTestId("toggle-auto-scroll"));

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        autoScroll: false,
      });
    });

    it("calls updateDisplaySettings to toggle enableAnimation off", () => {
      render(<QuickSettings />);

      fireEvent.click(screen.getByTestId("toggle-animation"));

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        enableAnimation: false,
      });
    });

    it("calls updateDisplaySettings to toggle showBackground on when it is off", () => {
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          showBackground: false,
        },
      });

      render(<QuickSettings />);

      fireEvent.click(screen.getByTestId("toggle-background"));

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        showBackground: true,
      });
    });
  });

  // --------------------------------------------------------------------------
  // Quick Actions
  // --------------------------------------------------------------------------

  describe("quick actions", () => {
    it("calls disconnect then connect when RESTART WS is clicked", () => {
      render(<QuickSettings />);

      fireEvent.click(screen.getByText("RESTART WS"));

      expect(mockDisconnect).toHaveBeenCalledOnce();
      expect(mockConnect).toHaveBeenCalledOnce();
    });

    it("calls setCurrentSong(null) when BLACKOUT is clicked", () => {
      render(<QuickSettings />);

      fireEvent.click(screen.getByText("BLACKOUT"));

      expect(mockSetCurrentSong).toHaveBeenCalledWith(null);
    });
  });

  // --------------------------------------------------------------------------
  // 設定值反映
  // --------------------------------------------------------------------------

  describe("settings value reflection", () => {
    it("reflects updated displayLines value", () => {
      resetStore({
        displaySettings: { ...defaultDisplaySettings, displayLines: 8 },
      });

      render(<QuickSettings />);

      expect(screen.getByText("8")).toBeInTheDocument();
    });

    it("reflects updated fontSize value", () => {
      resetStore({
        displaySettings: { ...defaultDisplaySettings, fontSize: 48 },
      });

      render(<QuickSettings />);

      expect(screen.getByText("48px")).toBeInTheDocument();
    });

    it("reflects updated lineSpacing value", () => {
      resetStore({
        displaySettings: { ...defaultDisplaySettings, lineSpacing: 1.2 },
      });

      render(<QuickSettings />);

      expect(screen.getByText("1.2x")).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 背景圖片上傳 (FR4.3)
  // --------------------------------------------------------------------------

  describe("background image upload (FR4.3)", () => {
    it("renders BG Image label and upload button", () => {
      render(<QuickSettings />);

      expect(screen.getByText("BG Image")).toBeInTheDocument();
      expect(screen.getByText("上傳")).toBeInTheDocument();
    });

    it("does not render clear button when backgroundImage is empty", () => {
      render(<QuickSettings />);

      expect(screen.queryByText("清除")).not.toBeInTheDocument();
    });

    it("renders clear button when backgroundImage has value", () => {
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          backgroundImage: "data:image/png;base64,abc123",
        },
      });

      render(<QuickSettings />);

      expect(screen.getByText("清除")).toBeInTheDocument();
    });

    it("calls updateDisplaySettings to clear backgroundImage when clear button is clicked", () => {
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          backgroundImage: "data:image/png;base64,abc123",
        },
      });

      render(<QuickSettings />);
      fireEvent.click(screen.getByText("清除"));

      expect(mockUpdateDisplaySettings).toHaveBeenCalledWith({
        backgroundImage: "",
      });
    });

    it("renders hidden file input with correct accept attribute", () => {
      render(<QuickSettings />);

      const fileInput = document.getElementById("bg-image-upload") as HTMLInputElement;
      expect(fileInput).toBeTruthy();
      expect(fileInput.type).toBe("file");
      expect(fileInput.accept).toBe("image/jpeg,image/png,image/webp");
    });

    it("shows image preview thumbnail when backgroundImage has value", () => {
      resetStore({
        displaySettings: {
          ...defaultDisplaySettings,
          backgroundImage: "data:image/png;base64,abc123",
        },
      });

      render(<QuickSettings />);

      const preview = screen.getByRole("img", { name: "背景圖片預覽" });
      expect(preview).toBeInTheDocument();
    });
  });
});
