/**
 * Toast 元件測試
 *
 * 驗證設計系統合規性：語意色 class、不使用不存在的 shadow token。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ToastProvider, useToast, type ToastType } from "./Toast";
import { useEffect, useState } from "react";

// 輔助元件：觸發指定類型的 toast
function ToastTrigger({ type, title }: { type: ToastType; title: string }) {
  const { showToast } = useToast();

  useEffect(() => {
    showToast({ type, title, duration: 0 });
  }, [type, title, showToast]);

  return null;
}

// 輔助函式：在 ToastProvider 內渲染指定類型的 toast
function renderToast(type: ToastType) {
  render(
    <ToastProvider>
      <ToastTrigger type={type} title={`${type} toast`} />
    </ToastProvider>
  );
}

describe("Toast", () => {
  describe("IconColors 語意色合規", () => {
    it("error 類型使用 text-error 而非 text-red-500", () => {
      renderToast("error");
      // icon wrapper 是 toast 容器內第一個帶 rounded-lg 的 div
      const toastContainer = screen.getByText("error toast")
        .closest("[class*='border-']")!;
      const iconWrapper = toastContainer.querySelector("[class*='rounded-lg']");
      expect(iconWrapper?.className).toContain("text-error");
      expect(iconWrapper?.className).not.toContain("text-red-500");
    });

    it("warning 類型使用 text-warning 而非 text-amber-500", () => {
      renderToast("warning");
      const toastContainer = screen.getByText("warning toast")
        .closest("[class*='border-']")!;
      const iconWrapper = toastContainer.querySelector("[class*='rounded-lg']");
      expect(iconWrapper?.className).toContain("text-warning");
      expect(iconWrapper?.className).not.toContain("text-amber-500");
    });

    it("success 類型使用 text-success", () => {
      renderToast("success");
      const toastContainer = screen.getByText("success toast")
        .closest("[class*='border-']")!;
      const iconWrapper = toastContainer.querySelector("[class*='rounded-lg']");
      expect(iconWrapper?.className).toContain("text-success");
    });

    it("info 類型使用 text-primary", () => {
      renderToast("info");
      const toastContainer = screen.getByText("info toast")
        .closest("[class*='border-']")!;
      const iconWrapper = toastContainer.querySelector("[class*='rounded-lg']");
      expect(iconWrapper?.className).toContain("text-primary");
    });
  });

  describe("BorderColors shadow 合規", () => {
    it("error 類型不包含不存在的 shadow-glow-red", () => {
      renderToast("error");
      // 找到 toast 的外層容器（包含 border class 的 div）
      const toastContainer = screen.getByText("error toast")
        .closest("[class*='border-']");
      expect(toastContainer).not.toBeNull();
      expect(toastContainer!.className).not.toContain("shadow-glow-red");
      expect(toastContainer!.className).toContain("border-error/50");
    });

    it("warning 類型不包含不存在的 shadow-glow-amber", () => {
      renderToast("warning");
      const toastContainer = screen.getByText("warning toast")
        .closest("[class*='border-']");
      expect(toastContainer).not.toBeNull();
      expect(toastContainer!.className).not.toContain("shadow-glow-amber");
      expect(toastContainer!.className).toContain("border-warning/50");
    });

    it("success 類型使用 shadow-glow-accent 而非 shadow-glow-secondary", () => {
      renderToast("success");
      const toastContainer = screen.getByText("success toast")
        .closest("[class*='border-']");
      expect(toastContainer).not.toBeNull();
      expect(toastContainer!.className).toContain("shadow-glow-accent");
      expect(toastContainer!.className).not.toContain("shadow-glow-secondary");
    });

    it("info 類型使用 shadow-glow-md", () => {
      renderToast("info");
      const toastContainer = screen.getByText("info toast")
        .closest("[class*='border-']");
      expect(toastContainer).not.toBeNull();
      expect(toastContainer!.className).toContain("shadow-glow-md");
    });
  });

  // ============================================================================
  // Auto-dismiss 計時器
  // ============================================================================

  describe("auto-dismiss timer", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("removes toast after duration expires", () => {
      function TimedToastTrigger() {
        const { showToast } = useToast();
        useEffect(() => {
          showToast({ type: "info", title: "timed toast", duration: 2000 });
        }, [showToast]);
        return null;
      }

      render(
        <ToastProvider>
          <TimedToastTrigger />
        </ToastProvider>
      );

      expect(screen.getByText("timed toast")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.queryByText("timed toast")).not.toBeInTheDocument();
    });

    it("does not auto-dismiss when duration is 0", () => {
      render(
        <ToastProvider>
          <ToastTrigger type="error" title="persistent toast" />
        </ToastProvider>
      );

      expect(screen.getByText("persistent toast")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(60000);
      });

      // duration: 0 表示不自動移除
      expect(screen.getByText("persistent toast")).toBeInTheDocument();
    });

    it("uses default 5000ms duration when not specified", () => {
      function DefaultDurationTrigger() {
        const { showToast } = useToast();
        useEffect(() => {
          showToast({ type: "info", title: "default timer" });
        }, [showToast]);
        return null;
      }

      render(
        <ToastProvider>
          <DefaultDurationTrigger />
        </ToastProvider>
      );

      expect(screen.getByText("default timer")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(4999);
      });
      expect(screen.getByText("default timer")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByText("default timer")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // 手動關閉按鈕
  // ============================================================================

  describe("manual close button", () => {
    it("removes toast when close button is clicked", () => {
      render(
        <ToastProvider>
          <ToastTrigger type="info" title="closable toast" />
        </ToastProvider>
      );

      expect(screen.getByText("closable toast")).toBeInTheDocument();

      const closeButton = screen.getByRole("button", { name: "Close" });
      fireEvent.click(closeButton);

      expect(screen.queryByText("closable toast")).not.toBeInTheDocument();
    });

    it("renders close button with accessible aria-label", () => {
      render(
        <ToastProvider>
          <ToastTrigger type="success" title="accessible toast" />
        </ToastProvider>
      );

      const closeButton = screen.getByRole("button", { name: "Close" });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute("aria-label", "Close");
    });
  });

  // ============================================================================
  // 不同 type（success/error/warning/info）的渲染
  // ============================================================================

  describe("rendering different toast types", () => {
    it("renders success toast with title and message", () => {
      function SuccessTrigger() {
        const { showSuccess } = useToast();
        useEffect(() => {
          showSuccess("操作完成");
        }, [showSuccess]);
        return null;
      }

      render(
        <ToastProvider>
          <SuccessTrigger />
        </ToastProvider>
      );

      expect(screen.getByText("成功")).toBeInTheDocument();
      expect(screen.getByText("操作完成")).toBeInTheDocument();
    });

    it("renders error toast with default title and message", () => {
      function ErrorTrigger() {
        const { showError } = useToast();
        useEffect(() => {
          showError("發生未知錯誤");
        }, [showError]);
        return null;
      }

      render(
        <ToastProvider>
          <ErrorTrigger />
        </ToastProvider>
      );

      expect(screen.getByText("錯誤")).toBeInTheDocument();
      expect(screen.getByText("發生未知錯誤")).toBeInTheDocument();
    });

    it("renders warning toast with default title", () => {
      function WarningTrigger() {
        const { showWarning } = useToast();
        useEffect(() => {
          showWarning("請注意");
        }, [showWarning]);
        return null;
      }

      render(
        <ToastProvider>
          <WarningTrigger />
        </ToastProvider>
      );

      expect(screen.getByText("警告")).toBeInTheDocument();
      expect(screen.getByText("請注意")).toBeInTheDocument();
    });

    it("renders info toast with default title", () => {
      function InfoTrigger() {
        const { showInfo } = useToast();
        useEffect(() => {
          showInfo("系統提示");
        }, [showInfo]);
        return null;
      }

      render(
        <ToastProvider>
          <InfoTrigger />
        </ToastProvider>
      );

      expect(screen.getByText("提示")).toBeInTheDocument();
      expect(screen.getByText("系統提示")).toBeInTheDocument();
    });

    it("renders toast with custom title override", () => {
      function CustomTitleTrigger() {
        const { showError } = useToast();
        useEffect(() => {
          showError("連線逾時", "自訂標題");
        }, [showError]);
        return null;
      }

      render(
        <ToastProvider>
          <CustomTitleTrigger />
        </ToastProvider>
      );

      expect(screen.getByText("自訂標題")).toBeInTheDocument();
      expect(screen.getByText("連線逾時")).toBeInTheDocument();
    });

    it("renders toast with action button", () => {
      const actionHandler = vi.fn();

      function ActionTrigger() {
        const { showToast } = useToast();
        useEffect(() => {
          showToast({
            type: "info",
            title: "action toast",
            duration: 0,
            action: { label: "重試", onClick: actionHandler },
          });
        }, [showToast]);
        return null;
      }

      render(
        <ToastProvider>
          <ActionTrigger />
        </ToastProvider>
      );

      const actionButton = screen.getByText("重試");
      expect(actionButton).toBeInTheDocument();
    });
  });

  // ============================================================================
  // 多個 toast 堆疊
  // ============================================================================

  describe("multiple toast stacking", () => {
    it("displays multiple toasts simultaneously", () => {
      function MultiTrigger() {
        const { showToast } = useToast();
        useEffect(() => {
          showToast({ type: "info", title: "toast-1", duration: 0 });
          showToast({ type: "success", title: "toast-2", duration: 0 });
          showToast({ type: "warning", title: "toast-3", duration: 0 });
        }, [showToast]);
        return null;
      }

      render(
        <ToastProvider>
          <MultiTrigger />
        </ToastProvider>
      );

      expect(screen.getByText("toast-1")).toBeInTheDocument();
      expect(screen.getByText("toast-2")).toBeInTheDocument();
      expect(screen.getByText("toast-3")).toBeInTheDocument();
    });

    it("respects maxToasts limit and removes oldest", () => {
      function OverflowTrigger() {
        const { showToast } = useToast();
        useEffect(() => {
          showToast({ type: "info", title: "first", duration: 0 });
          showToast({ type: "info", title: "second", duration: 0 });
          showToast({ type: "info", title: "third", duration: 0 });
        }, [showToast]);
        return null;
      }

      render(
        <ToastProvider maxToasts={2}>
          <OverflowTrigger />
        </ToastProvider>
      );

      // 最舊的應該被移除
      expect(screen.queryByText("first")).not.toBeInTheDocument();
      expect(screen.getByText("second")).toBeInTheDocument();
      expect(screen.getByText("third")).toBeInTheDocument();
    });

    it("clearAll removes all toasts", () => {
      function ClearAllTrigger() {
        const { showToast, clearAll } = useToast();
        const [_cleared, setCleared] = useState(false);

        useEffect(() => {
          showToast({ type: "info", title: "clear-1", duration: 0 });
          showToast({ type: "info", title: "clear-2", duration: 0 });
        }, [showToast]);

        return (
          <button onClick={() => { clearAll(); setCleared(true); }}>
            clear
          </button>
        );
      }

      render(
        <ToastProvider>
          <ClearAllTrigger />
        </ToastProvider>
      );

      expect(screen.getByText("clear-1")).toBeInTheDocument();
      expect(screen.getByText("clear-2")).toBeInTheDocument();

      // 點擊清除按鈕
      act(() => {
        fireEvent.click(screen.getByText("clear"));
      });

      expect(screen.queryByText("clear-1")).not.toBeInTheDocument();
      expect(screen.queryByText("clear-2")).not.toBeInTheDocument();
    });
  });

  // ============================================================================
  // useToast 在 Provider 外拋出錯誤
  // ============================================================================

  describe("useToast outside provider", () => {
    it("throws error when used outside ToastProvider", () => {
      // 抑制 React 的 console.error 輸出
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});

      function Orphan() {
        useToast();
        return null;
      }

      expect(() => render(<Orphan />)).toThrow(
        "useToast must be used within ToastProvider"
      );

      spy.mockRestore();
    });
  });
});
