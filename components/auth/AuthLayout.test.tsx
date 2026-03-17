import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthLayout } from "./AuthLayout";

describe("AuthLayout", () => {
  it("renders title", () => {
    render(
      <AuthLayout title="登入歌詞顯示系統">
        <div>form content</div>
      </AuthLayout>
    );
    expect(screen.getByText("LY")).toBeInTheDocument();
    expect(screen.getByText("登入歌詞顯示系統")).toBeInTheDocument();
  });

  it("renders children inside glass card", () => {
    render(
      <AuthLayout title="Test">
        <input data-testid="my-input" />
      </AuthLayout>
    );
    expect(screen.getByTestId("my-input")).toBeInTheDocument();
  });

  it("renders footer content", () => {
    render(
      <AuthLayout title="Test" footer={<span>footer text</span>}>
        <div />
      </AuthLayout>
    );
    expect(screen.getByText("footer text")).toBeInTheDocument();
  });
});
