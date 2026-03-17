/**
 * GlowButton 共用元件測試
 *
 * 測試按鈕的渲染、點擊事件、loading 狀態、variant 樣式與 disabled 行為。
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GlowButton } from "./GlowButton";

describe("GlowButton", () => {
  it("renders children", () => {
    render(<GlowButton>Click me</GlowButton>);
    expect(screen.getByRole("button")).toHaveTextContent("Click me");
  });

  it("calls onClick when clicked", () => {
    const handler = vi.fn();
    render(<GlowButton onClick={handler}>Click</GlowButton>);
    fireEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("shows spinner when loading", () => {
    render(<GlowButton loading>Submit</GlowButton>);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("applies variant styles", () => {
    render(<GlowButton variant="secondary">Sec</GlowButton>);
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("secondary");
  });

  it("is disabled when disabled prop is true", () => {
    render(<GlowButton disabled>Nope</GlowButton>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
