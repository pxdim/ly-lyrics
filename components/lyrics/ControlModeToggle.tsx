"use client";

interface ControlModeToggleProps {
  mode: "auto" | "manual";
  onToggle: (next: "auto" | "manual") => void;
  disabled?: boolean;
}

export function ControlModeToggle({ mode, onToggle, disabled }: ControlModeToggleProps) {
  const isAuto = mode === "auto";

  return (
    <button
      type="button"
      onClick={() => onToggle(isAuto ? "manual" : "auto")}
      disabled={disabled}
      title={isAuto ? "切換為手動模式" : "切換為自動模式（AI 追蹤）"}
      className={[
        "px-2 py-1 text-[11px] font-mono uppercase tracking-widest",
        "border transition-colors",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        isAuto
          ? "bg-success/10 border-success/40 text-success hover:bg-success/20"
          : "bg-surface border-border-dim text-text-muted hover:bg-elevated hover:border-text-muted",
      ].join(" ")}
    >
      {isAuto ? "AUTO" : "MANUAL"}
    </button>
  );
}
