/**
 * ErrorBoundary 元件測試
 *
 * 測試 React Error Boundary 的錯誤捕捉、fallback UI 渲染、
 * 重置功能、自訂 fallback、onError 回呼、useErrorBoundary hook
 * 與 withErrorBoundary HOC。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ErrorBoundary,
  useErrorBoundary,
  withErrorBoundary,
} from "./ErrorBoundary";
import type { ErrorBoundaryProps as _ErrorBoundaryProps } from "./ErrorBoundary";

// Mock logError — 外部依賴
vi.mock("@/lib/errors/AppError", () => ({
  logError: vi.fn(),
}));

import { logError } from "@/lib/errors/AppError";

const mockLogError = vi.mocked(logError);

// ============================================================================
// 測試輔助
// ============================================================================

/** 會拋出錯誤的子元件 */
function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test render error");
  }
  return <div>正常渲染的內容</div>;
}

/** 用於測試 useErrorBoundary hook 的元件 */
function ErrorBoundaryConsumer() {
  const { error, resetError } = useErrorBoundary();
  return (
    <div>
      <span data-testid="error-status">{error ? error.message : "no error"}</span>
      <button onClick={resetError}>Reset</button>
    </div>
  );
}

// 抑制 React 錯誤邊界的 console.error 輸出（測試預期行為）
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});
afterEach(() => {
  console.error = originalConsoleError;
});

// ============================================================================
// 測試
// ============================================================================

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 正常渲染
  // --------------------------------------------------------------------------

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>正常內容</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("正常內容")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 錯誤捕捉
  // --------------------------------------------------------------------------

  it("renders fallback UI when child throws error", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("哎呀，出了點問題")).toBeInTheDocument();
  });

  it("displays error message in fallback UI", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("Test render error")).toBeInTheDocument();
  });

  it("shows default message when error has no message", () => {
    function NoMessageChild(): React.ReactNode {
      throw new Error();
    }
    render(
      <ErrorBoundary>
        <NoMessageChild />
      </ErrorBoundary>
    );
    expect(screen.getByText("發生未預期的錯誤")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 重置功能
  // --------------------------------------------------------------------------

  it("resets error state when '重新載入' button is clicked", () => {
    // 使用可控制的拋出行為
    let shouldThrow = true;

    function ControlledChild() {
      if (shouldThrow) {
        throw new Error("Controlled error");
      }
      return <div>已恢復</div>;
    }

    render(
      <ErrorBoundary>
        <ControlledChild />
      </ErrorBoundary>
    );

    expect(screen.getByText("哎呀，出了點問題")).toBeInTheDocument();

    // 修復錯誤後重置
    shouldThrow = false;
    fireEvent.click(screen.getByText("重新載入"));

    expect(screen.getByText("已恢復")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 回到首頁
  // --------------------------------------------------------------------------

  it("renders '回到首頁' button in fallback", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText("回到首頁")).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // 自訂 fallback
  // --------------------------------------------------------------------------

  it("renders custom fallback component when provided", () => {
    function CustomFallback({ error, resetError }: { error: Error | null; resetError: () => void }) {
      return (
        <div>
          <span>自訂錯誤畫面: {error?.message}</span>
          <button onClick={resetError}>重試</button>
        </div>
      );
    }

    render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText(/自訂錯誤畫面: Test render error/)).toBeInTheDocument();
  });

  // --------------------------------------------------------------------------
  // onError 回呼
  // --------------------------------------------------------------------------

  it("calls onError callback when error is caught", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Test render error" }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  // --------------------------------------------------------------------------
  // logError 呼叫
  // --------------------------------------------------------------------------

  it("calls logError when error is caught", () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(mockLogError).toHaveBeenCalledOnce();
    expect(mockLogError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Test render error" }),
      expect.objectContaining({ location: "ErrorBoundary" })
    );
  });

  // --------------------------------------------------------------------------
  // ErrorBoundary Context
  // --------------------------------------------------------------------------

  it("provides error context to children via useErrorBoundary", () => {
    render(
      <ErrorBoundary>
        <ErrorBoundaryConsumer />
      </ErrorBoundary>
    );
    expect(screen.getByTestId("error-status")).toHaveTextContent("no error");
  });
});

// ============================================================================
// useErrorBoundary hook
// ============================================================================

describe("useErrorBoundary", () => {
  it("throws when used outside ErrorBoundary", () => {
    // 抑制 React 額外錯誤輸出
    function BadConsumer() {
      useErrorBoundary();
      return null;
    }

    expect(() => {
      render(<BadConsumer />);
    }).toThrow("useErrorBoundary must be used within ErrorBoundary");
  });
});

// ============================================================================
// withErrorBoundary HOC
// ============================================================================

describe("withErrorBoundary", () => {
  it("wraps component with ErrorBoundary", () => {
    function TestComponent() {
      return <div>HOC 包裝的元件</div>;
    }

    const Wrapped = withErrorBoundary(TestComponent);
    render(<Wrapped />);
    expect(screen.getByText("HOC 包裝的元件")).toBeInTheDocument();
  });

  it("catches errors from wrapped component", () => {
    function ErrorComponent(): React.ReactNode {
      throw new Error("HOC error");
    }

    const Wrapped = withErrorBoundary(ErrorComponent);
    render(<Wrapped />);
    expect(screen.getByText("哎呀，出了點問題")).toBeInTheDocument();
  });

  it("sets displayName on wrapped component", () => {
    function NamedComponent() {
      return null;
    }

    const Wrapped = withErrorBoundary(NamedComponent);
    expect(Wrapped.displayName).toBe("withErrorBoundary(NamedComponent)");
  });

  it("passes custom props to ErrorBoundary", () => {
    const onError = vi.fn();
    function ErrorComponent(): React.ReactNode {
      throw new Error("Custom error");
    }

    const Wrapped = withErrorBoundary(ErrorComponent, { onError });
    render(<Wrapped />);
    expect(onError).toHaveBeenCalledOnce();
  });
});
