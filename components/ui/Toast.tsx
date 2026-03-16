/**
 * Toast Notification System
 *
 * Global toast notifications for user feedback.
 * Following specs from docs/spec/error-handling.md
 */

"use client";

import {
  type FC,
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, "id">) => void;
  showError: (message: string, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ============================================================================
// Icons
// ============================================================================

const ToastIcons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const IconColors: Record<ToastType, string> = {
  success: "text-accent",
  error: "text-red-500",
  warning: "text-amber-500",
  info: "text-primary",
};

const BorderColors: Record<ToastType, string> = {
  success: "border-accent/50 shadow-glow-accent",
  error: "border-red-500/50 shadow-glow-red",
  warning: "border-amber-500/50 shadow-glow-amber",
  info: "border-primary/50 shadow-glow-md",
};

// ============================================================================
// Toast Component
// ============================================================================

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const ToastItem: FC<ToastItemProps> = ({ toast, onRemove }) => {
  useEffect(() => {
    if (toast.duration === 0) {
      return;
    }
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.duration ?? 5000);

    return () => clearTimeout(timer);
  }, [toast, toast.duration, onRemove]);

  const Icon = ToastIcons[toast.type];

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-xl
        bg-elevated/95 backdrop-blur-md border
        ${BorderColors[toast.type]}
        transition-all duration-300
        hover:-translate-y-0.5
      `}
      style={{
        minWidth: "320px",
        maxWidth: "400px",
        boxShadow: "0 4px 20px hsl(var(--color-glow-primary) / 0.12)",
      }}
    >
      {/* Icon */}
      <div className={`p-1 rounded-lg ${IconColors[toast.type]}`}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-heading font-semibold text-sm text-text-primary">
          {toast.title}
        </p>
        {toast.message && (
          <p className="font-body text-sm text-text-muted mt-0.5">
            {toast.message}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-body font-medium text-primary hover:underline"
            type="button"
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={() => onRemove(toast.id)}
        className="p-1 text-text-muted hover:text-text-primary transition-colors"
        type="button"
        aria-label="Close"
      >
        <X className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
};

// ============================================================================
// Toast Container Component
// ============================================================================

export interface ToastContainerProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

const positionStyles: Record<
  NonNullable<ToastContainerProps["position"]>,
  React.CSSProperties
> = {
  "top-right": {
    position: "fixed",
    top: "1rem",
    right: "1rem",
    zIndex: 100,
  },
  "top-left": {
    position: "fixed",
    top: "1rem",
    left: "1rem",
    zIndex: 100,
  },
  "bottom-right": {
    position: "fixed",
    bottom: "1rem",
    right: "1rem",
    zIndex: 100,
  },
  "bottom-left": {
    position: "fixed",
    bottom: "1rem",
    left: "1rem",
    zIndex: 100,
  },
  "top-center": {
    position: "fixed",
    top: "1rem",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 100,
  },
  "bottom-center": {
    position: "fixed",
    bottom: "1rem",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 100,
  },
};

export const ToastContainer: FC<ToastContainerProps> = ({
  position = "top-right",
}) => {
  const context = useContext(ToastContext);

  if (!context) {
    return null;
  }

  const { toasts, removeToast } = context;

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div style={positionStyles[position]} className="flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Toast Provider
// ============================================================================

export interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export const ToastProvider: FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substr(2, 9);

      setToasts((prev) => {
        const newToast = { ...toast, id };

        // Remove oldest if exceeds max
        const trimmed = prev.length >= maxToasts ? prev.slice(1) : prev;

        return [...trimmed, newToast];
      });

      // 自動移除由 ToastItem useEffect 統一處理，避免雙重 timer
    },
    [maxToasts]
  );

  const showError = useCallback(
    (message: string, title = "錯誤") => {
      showToast({ type: "error", title, message, duration: 0 });
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string, title = "成功") => {
      showToast({ type: "success", title, message, duration: 3000 });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title = "警告") => {
      showToast({ type: "warning", title, message, duration: 5000 });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title = "提示") => {
      showToast({ type: "info", title, message, duration: 4000 });
    },
    [showToast]
  );

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const contextValue: ToastContextValue = {
    toasts,
    showToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    removeToast,
    clearAll,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// ============================================================================
// useToast Hook
// ============================================================================

/**
 * Toast notification hook
 *
 * @example
 * ```tsx
 * const { showError, showSuccess, showWarning, showInfo } = useToast();
 *
 * showError("操作失敗，請稍後再試");
 * showSuccess("設定已儲存");
 * ```
 */
export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook specifically for error notifications
 */
export function useErrorToast() {
  const { showError } = useToast();

  return useCallback(
    (error: unknown, context?: string) => {
      let message = "發生錯誤，請稍後再試";

      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === "string") {
        message = error;
      }

      showError(message, context ? `${context} 錯誤` : "錯誤");
    },
    [showError]
  );
}

/**
 * Hook for success notifications
 */
export function useSuccessToast() {
  const { showSuccess } = useToast();

  return useCallback(
    (message: string, title?: string) => {
      showSuccess(message, title);
    },
    [showSuccess]
  );
}
