/**
 * ConfirmDialog 共用元件測試
 *
 * 測試對話框的開關狀態、確認/取消按鈕、背景點擊關閉、破壞性變體樣式。
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    title: "確認刪除",
    message: "確定要刪除這首歌嗎？",
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders when open", () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText("確認刪除")).toBeInTheDocument();
    expect(screen.getByText("確定要刪除這首歌嗎？")).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText("確認刪除")).not.toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("確認"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("取消"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel when backdrop clicked", () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId("confirm-backdrop"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("renders destructive variant", () => {
    render(<ConfirmDialog {...defaultProps} variant="destructive" />);
    const confirmBtn = screen.getByText("確認");
    expect(confirmBtn.className).toContain("error");
  });
});
