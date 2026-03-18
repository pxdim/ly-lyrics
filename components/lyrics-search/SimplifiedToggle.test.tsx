/**
 * SimplifiedToggle 元件測試
 *
 * 測試簡繁轉換按鈕的渲染、點擊切換與狀態顯示。
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SimplifiedToggle } from "./SimplifiedToggle";

describe("SimplifiedToggle", () => {
  // --------------------------------------------------------------------------
  // 基本渲染
  // --------------------------------------------------------------------------

  it("renders toggle button", () => {
    render(<SimplifiedToggle isTraditional={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows '轉繁體' when isTraditional is false", () => {
    render(<SimplifiedToggle isTraditional={false} onToggle={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("轉繁體");
  });

  it("shows '顯示原文' when isTraditional is true", () => {
    render(<SimplifiedToggle isTraditional={true} onToggle={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveTextContent("顯示原文");
  });

  // --------------------------------------------------------------------------
  // 使用者互動
  // --------------------------------------------------------------------------

  it("calls onToggle when clicked", () => {
    const onToggle = vi.fn();
    render(<SimplifiedToggle isTraditional={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  // --------------------------------------------------------------------------
  // 樣式
  // --------------------------------------------------------------------------

  it("applies active styles when isTraditional is true", () => {
    render(<SimplifiedToggle isTraditional={true} onToggle={vi.fn()} />);
    const btn = screen.getByRole("button");
    // 啟用狀態有 primary 色彩
    expect(btn.className).toContain("bg-primary/10");
    expect(btn.className).toContain("border-primary/40");
  });

  it("applies inactive styles when isTraditional is false", () => {
    render(<SimplifiedToggle isTraditional={false} onToggle={vi.fn()} />);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("bg-transparent");
    expect(btn.className).toContain("border-border-dim");
  });
});
