import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ControlModeToggle } from "./ControlModeToggle";

// 模擬 next-intl
vi.mock("next-intl", async () => {
  const { createNextIntlMock } = await import("@/lib/test-utils/i18n-mock");
  return createNextIntlMock();
});

describe("ControlModeToggle", () => {
  it("renders MANUAL label when mode is manual", () => {
    render(<ControlModeToggle mode="manual" onToggle={vi.fn()} />);
    expect(screen.getByText(/manual/i)).toBeInTheDocument();
  });

  it("renders AUTO label when mode is auto", () => {
    render(<ControlModeToggle mode="auto" onToggle={vi.fn()} />);
    expect(screen.getByText(/auto/i)).toBeInTheDocument();
  });

  it("calls onToggle with auto when clicked in manual mode", () => {
    const onToggle = vi.fn();
    render(<ControlModeToggle mode="manual" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith("auto");
  });

  it("calls onToggle with manual when clicked in auto mode", () => {
    const onToggle = vi.fn();
    render(<ControlModeToggle mode="auto" onToggle={onToggle} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledWith("manual");
  });

  it("shows distinct visual state for auto vs manual", () => {
    const { rerender } = render(<ControlModeToggle mode="manual" onToggle={vi.fn()} />);
    const manualClass = screen.getByRole("button").className;
    rerender(<ControlModeToggle mode="auto" onToggle={vi.fn()} />);
    const autoClass = screen.getByRole("button").className;
    expect(manualClass).not.toBe(autoClass);
  });

  it("is disabled when disabled prop is true", () => {
    render(<ControlModeToggle mode="manual" onToggle={vi.fn()} disabled />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
