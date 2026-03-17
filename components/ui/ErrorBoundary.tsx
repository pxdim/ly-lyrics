/**
 * ErrorBoundary Component
 *
 * Catches React errors and displays a fallback UI.
 * Following specs from docs/spec/error-handling.md
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourApp />
 * </ErrorBoundary>
 * ```
 */

"use client";

import React, {
  type ComponentType,
  type ReactNode,
  createContext,
  useContext,
} from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logError } from "@/lib/errors/AppError";

// ============================================================================
// Error Types
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorInfo {
  componentStack: string;
}

interface ErrorBoundaryContextValue {
  error: Error | null;
  resetError: () => void;
}

const ErrorBoundaryContext = createContext<ErrorBoundaryContextValue | null>(
  null
);

// ============================================================================
// Error Fallback Component
// ============================================================================

interface ErrorFallbackProps {
  error: Error | null;
  resetError: () => void;
}

/**
 * Error fallback UI component
 */
function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void p-8">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none" />

      <div className="max-w-md w-full relative z-10">
        {/* Error Card */}
        <div className="bg-elevated border-2 border-primary/30 rounded-2xl p-8 shadow-glow-primary">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/10 rounded-full">
              <AlertTriangle className="w-12 h-12 text-primary" strokeWidth={2} />
            </div>
          </div>

          {/* Title */}
          <h1 className="font-heading text-2xl font-bold text-center text-primary mb-4">
            哎呀，出了點問題
          </h1>

          {/* Error Message */}
          <div className="bg-void/50 rounded-xl p-4 mb-6 border border-border-dim">
            <p className="font-body text-text-muted text-center">
              {error?.message || "發生未預期的錯誤"}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-primary text-void rounded-xl font-heading font-semibold tracking-wider uppercase transition-all duration-300 hover:shadow-glow-primary hover:-translate-y-0.5"
              type="button"
            >
              <RefreshCw className="w-5 h-5" strokeWidth={2} />
              重新載入
            </button>

            <button
              onClick={() => window.location.href = "/"}
              className="w-full px-6 py-3 bg-elevated border border-border-dim text-text-muted rounded-xl font-body font-medium transition-all duration-300 hover:border-primary/50 hover:text-primary"
              type="button"
            >
              回到首頁
            </button>
          </div>

          {/* Tech Info (Dev Only) */}
          {process.env.NODE_ENV === "development" && error?.stack && (
            <details className="mt-6">
              <summary className="font-body text-xs text-text-muted cursor-pointer hover:text-primary transition-colors">
                技術細節 (開發模式)
              </summary>
              <pre className="mt-2 p-3 bg-void/80 rounded-lg text-xs font-mono text-primary/70 overflow-auto max-h-40">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ErrorBoundary Component
// ============================================================================

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback component */
  fallback?: ComponentType<ErrorFallbackProps>;
  /** Callback when error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Error Boundary Class Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundaryClass extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("[ErrorBoundary] Caught error:", {
        error,
        componentStack: errorInfo.componentStack,
      });
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);

    // Log to error tracking system
    logError(error, {
      location: "ErrorBoundary",
      metadata: { componentStack: errorInfo.componentStack },
    });
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || ErrorFallback;
      return (
        <ErrorBoundaryContext.Provider
          value={{
            error: this.state.error,
            resetError: this.resetError,
          }}
        >
          <FallbackComponent
            error={this.state.error}
            resetError={this.resetError}
          />
        </ErrorBoundaryContext.Provider>
      );
    }

    return (
      <ErrorBoundaryContext.Provider
        value={{
          error: null,
          resetError: () => {},
        }}
      >
        {this.props.children}
      </ErrorBoundaryContext.Provider>
    );
  }
}

// ============================================================================
// Export Wrapper
// ============================================================================

export { ErrorBoundaryClass as ErrorBoundary };

/**
 * Hook to access error boundary context
 *
 * @example
 * ```tsx
 * const { error, resetError } = useErrorBoundary();
 * ```
 */
export function useErrorBoundary(): ErrorBoundaryContextValue {
  const context = useContext(ErrorBoundaryContext);
  if (!context) {
    throw new Error("useErrorBoundary must be used within ErrorBoundary");
  }
  return context;
}

/**
 * HOC to wrap a component with error boundary
 *
 * @example
 * ```tsx
 * export default withErrorBoundary(MyComponent);
 * ```
 */
export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
): ComponentType<P> {
  const WrappedComponent = (props: P) => (
    <ErrorBoundaryClass {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundaryClass>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
}
