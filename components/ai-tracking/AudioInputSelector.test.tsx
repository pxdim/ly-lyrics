/**
 * AudioInputSelector 元件測試
 *
 * 驗證：
 * 1. 基本渲染：Input Device label、Gain 滑桿、Level 音量計
 * 2. dBFS 色段邏輯：不同音量對應正確的 meterColor class
 * 3. 設計系統合規：無硬編碼 hex/rgba
 * 4. 裝置列表：mock navigator.mediaDevices 測試裝置枚舉
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { AudioInputSelector } from "./AudioInputSelector";

// 預設 props 工廠
function defaultProps(overrides: Partial<Parameters<typeof AudioInputSelector>[0]> = {}) {
  return {
    deviceId: "device-1",
    gain: 0,
    volume: 0,
    isCapturing: false,
    onDeviceChange: vi.fn(),
    onGainChange: vi.fn(),
    ...overrides,
  };
}

// Mock navigator.mediaDevices
function mockMediaDevices(devices: Partial<MediaDeviceInfo>[] = []) {
  const mockDevices = devices.map((d) => ({
    deviceId: d.deviceId ?? "default",
    groupId: d.groupId ?? "group-1",
    kind: d.kind ?? "audioinput",
    label: d.label ?? "",
    toJSON: () => ({}),
  })) as MediaDeviceInfo[];

  Object.defineProperty(navigator, "mediaDevices", {
    value: {
      enumerateDevices: vi.fn().mockResolvedValue(mockDevices),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
}

// 輔助：渲染元件並等待非同步裝置枚舉完成
async function renderAndSettle(props: Parameters<typeof AudioInputSelector>[0]) {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(<AudioInputSelector {...props} />);
  });
  return result!;
}

describe("AudioInputSelector", () => {
  beforeEach(() => {
    mockMediaDevices([
      { deviceId: "device-1", label: "麥克風 A", kind: "audioinput" },
      { deviceId: "device-2", label: "Audio Interface", kind: "audioinput" },
    ]);
  });

  describe("基本渲染", () => {
    it("顯示 Input Device label", async () => {
      await renderAndSettle(defaultProps());
      expect(screen.getByText("Input Device")).toBeInTheDocument();
    });

    it("顯示 Gain 滑桿與標籤", async () => {
      await renderAndSettle(defaultProps());
      expect(screen.getByText("Gain")).toBeInTheDocument();
      expect(screen.getByLabelText("增益調整")).toBeInTheDocument();
    });

    it("顯示 Level 音量計標籤", async () => {
      await renderAndSettle(defaultProps());
      expect(screen.getByText("Level")).toBeInTheDocument();
    });
  });

  describe("dBFS 色段邏輯", () => {
    it("低音量（volume=0.01）使用綠色 bg-emerald-400", async () => {
      // volume=0.01 → dBFS ≈ -40，低於 -18，應為綠色
      const { container } = await renderAndSettle(
        defaultProps({ volume: 0.01 })
      );
      const meterBar = container.querySelector("[class*='bg-emerald-400']");
      expect(meterBar).not.toBeNull();
    });

    it("中等音量（volume=0.2）使用黃色 bg-amber-400", async () => {
      // volume=0.2 → dBFS ≈ -14，介於 -18 與 -6 之間，應為黃色
      const { container } = await renderAndSettle(
        defaultProps({ volume: 0.2 })
      );
      const meterBar = container.querySelector("[class*='bg-amber-400']");
      expect(meterBar).not.toBeNull();
    });

    it("高音量（volume=0.8）使用紅色 bg-red-500", async () => {
      // volume=0.8 → dBFS ≈ -1.9，高於 -6，應為紅色
      const { container } = await renderAndSettle(
        defaultProps({ volume: 0.8 })
      );
      const meterBar = container.querySelector("[class*='bg-red-500']");
      expect(meterBar).not.toBeNull();
    });
  });

  describe("設計系統合規 — 無硬編碼 hex", () => {
    it("LED 分段線使用 CSS 變數而非硬編碼 hex #1A1D24", async () => {
      const { container } = await renderAndSettle(
        defaultProps({ volume: 0.01 })
      );
      // 找到分段線 overlay div（absolute inset-0 + backgroundImage）
      const allDivs = container.querySelectorAll("div");
      let found = false;
      allDivs.forEach((div) => {
        const bgImage = div.style.backgroundImage;
        if (bgImage && bgImage.includes("repeating-linear-gradient")) {
          // 不應包含硬編碼 hex
          expect(bgImage).not.toContain("#1A1D24");
          // 應使用 CSS 變數
          expect(bgImage).toContain("--color-elevated");
          found = true;
        }
      });
      expect(found).toBe(true);
    });

    it("dBFS 刻度不包含硬編碼 hex #3A3D45 和 #4A4D55", async () => {
      const { container } = await renderAndSettle(defaultProps());
      // 確認 dBFS 刻度中沒有硬編碼 hex class
      const scaleDiv = container.querySelector("[class*='text-[8px]']");
      expect(scaleDiv).not.toBeNull();
      expect(scaleDiv!.className).not.toContain("text-[#3A3D45]");
      expect(scaleDiv!.className).toContain("text-text-dim");

      // 檢查 -24 刻度使用 text-text-muted 而非 text-[#4A4D55]
      const span24 = screen.getByText("-24");
      expect(span24.className).not.toContain("text-[#4A4D55]");
      expect(span24.className).toContain("text-text-muted");
    });
  });

  describe("裝置列表", () => {
    it("枚舉並顯示音訊輸入裝置", async () => {
      await renderAndSettle(defaultProps());

      await waitFor(() => {
        expect(screen.getByText("麥克風 A")).toBeInTheDocument();
        expect(screen.getByText("Audio Interface")).toBeInTheDocument();
      });
    });

    it("錄音中時 select 為 disabled", async () => {
      await renderAndSettle(defaultProps({ isCapturing: true }));
      const select = screen.getByLabelText("音訊輸入裝置");
      expect(select).toBeDisabled();
    });

    it("切換裝置時呼叫 onDeviceChange", async () => {
      const onDeviceChange = vi.fn();
      await renderAndSettle(defaultProps({ onDeviceChange }));

      await waitFor(() => {
        expect(screen.getByText("麥克風 A")).toBeInTheDocument();
      });

      const select = screen.getByLabelText("音訊輸入裝置");
      fireEvent.change(select, { target: { value: "device-2" } });
      expect(onDeviceChange).toHaveBeenCalledWith("device-2");
    });
  });
});
