/**
 * Spinner 共用元件測試
 *
 * 測試載入指示器的不同尺寸渲染與自訂樣式。
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("renders with default size", () => {
    render(<Spinner />);
    const svg = screen.getByRole("status");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("h-5", "w-5");
  });

  it("renders with custom size", () => {
    render(<Spinner size="lg" />);
    const svg = screen.getByRole("status");
    expect(svg).toHaveClass("h-8", "w-8");
  });

  it("applies custom className", () => {
    render(<Spinner className="text-red-500" />);
    const svg = screen.getByRole("status");
    expect(svg).toHaveClass("text-red-500");
  });
});
