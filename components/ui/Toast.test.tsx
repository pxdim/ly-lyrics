/**
 * Toast 元件測試
 *
 * 驗證設計系統合規性：語意色 class、不使用不存在的 shadow token。
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ToastProvider, useToast, type ToastType } from "./Toast";
import { useEffect } from "react";

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
});
