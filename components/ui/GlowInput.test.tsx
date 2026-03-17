/**
 * GlowInput 共用元件測試
 *
 * 測試輸入框的渲染、label 關聯、錯誤狀態、props 轉發行為。
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlowInput } from "./GlowInput";

describe("GlowInput", () => {
  it("renders with label", () => {
    render(<GlowInput label="Email" id="email" />);
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  it("renders error message", () => {
    render(<GlowInput label="Email" id="email" error="Required" />);
    expect(screen.getByText("Required")).toBeInTheDocument();
  });

  it("applies error styling when error is present", () => {
    render(<GlowInput label="Email" id="email" error="Required" />);
    const input = screen.getByLabelText("Email");
    expect(input.className).toContain("border-error");
  });

  it("forwards input props", () => {
    render(<GlowInput label="Email" id="email" type="email" required />);
    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("type", "email");
    expect(input).toBeRequired();
  });
});
