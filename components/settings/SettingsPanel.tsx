/**
 * SettingsPanel Component
 *
 * Display settings panel for adjusting display lines, font size, and theme.
 * All changes update the Zustand store and sync via WebSocket when connected.
 * Design System v2.0 - Dark Tech Edition
 */

"use client";

import { type FC, useState } from "react";
import { Settings, X, Palette, Monitor } from "lucide-react";
import { useLyricsStore } from "@/lib/store";

export interface SettingsPanelProps {
  /** Optional custom class name for styling */
  className?: string;
  /** Whether to show the panel in collapsed state by default */
  defaultCollapsed?: boolean;
  /** Position of the panel */
  position?: "left" | "right";
}

const FONT_SIZE_OPTIONS = [16, 18, 20, 24, 32, 40, 48, 64] as const;

const THEME_OPTIONS: Array<{ value: "dark" | "light"; label: string; icon: FC<any> }> = [
  { value: "dark", label: "Dark", icon: Monitor },
  { value: "light", label: "Light", icon: Monitor },
];

const HIGHLIGHT_COLORS = [
  { value: "#00D9FF", label: "Electric Blue" },
  { value: "#A855F7", label: "Neon Purple" },
  { value: "#00FF88", label: "Neon Green" },
  { value: "#FF3366", label: "Neon Pink" },
  { value: "#FFB800", label: "Amber" },
  { value: "#FF6B00", label: "Orange" },
] as const;

export const SettingsPanel: FC<SettingsPanelProps> = ({
  className = "",
  defaultCollapsed = false,
  position = "right",
}) => {
  const displaySettings = useLyricsStore((state) => state.displaySettings);
  const updateDisplaySettings = useLyricsStore((state) => state.updateDisplaySettings);
  const resetDisplaySettings = useLyricsStore((state) => state.resetDisplaySettings);

  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const handleUpdate = (updates: Parameters<typeof updateDisplaySettings>[0]) => {
    updateDisplaySettings(updates);
  };

  // Container style
  const containerStyle: React.CSSProperties = {
    position: "fixed",
    [position]: "1rem",
    top: "50%",
    transform: "translateY(-50%)",
    width: isCollapsed ? "auto" : "320px",
    backgroundColor: "rgba(3, 3, 4, 0.95)",
    backdropFilter: "blur(16px)",
    borderRadius: "1rem",
    border: "1px solid " + "rgba(0, 217, 255, 0.3)",
    boxShadow: "0 0 20px rgba(0, 217, 255, 0.15), 0 20px 40px rgba(0, 0, 0, 0.4)",
    zIndex: 100,
    transition: "all 300ms cubic-bezier(0.16, 1, 0.3, 1)",
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem 1.25rem",
    borderBottom: "1px solid " + "rgba(0, 217, 255, 0.2)",
    background: "linear-gradient(180deg, rgba(0, 217, 255, 0.05) 0%, transparent 100%)",
  };

  const titleStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    color: "#00D9FF",
    fontSize: "0.875rem",
    fontWeight: "600",
    fontFamily: "'Orbitron', sans-serif",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
  };

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: "0.5rem",
    border: "1px solid " + "rgba(0, 217, 255, 0.3)",
    backgroundColor: "rgba(0, 217, 255, 0.1)",
    color: "#00D9FF",
    cursor: "pointer",
    transition: "all 200ms ease-out",
  };

  const contentStyle: React.CSSProperties = {
    padding: "1.25rem",
    maxHeight: "70vh",
    overflowY: "auto",
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: "1.5rem",
  };

  const labelStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    color: "#FFFFFF",
    fontSize: "0.75rem",
    fontWeight: "600",
    fontFamily: "'Orbitron', sans-serif",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: "0.75rem",
  };

  const valueStyle: React.CSSProperties = {
    color: displaySettings.highlightColor,
    fontSize: "0.875rem",
    fontWeight: "600",
    fontFamily: "'JetBrains Mono', monospace",
  };

  const sliderStyle: React.CSSProperties = {
    width: "100%",
    height: "6px",
    borderRadius: "3px",
    outline: "none",
    cursor: "pointer",
    backgroundColor: "rgba(0, 217, 255, 0.2)",
    appearance: "none",
  };

  const toggleContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.5rem",
    backgroundColor: "rgba(3, 3, 4, 0.6)",
    padding: "0.25rem",
    borderRadius: "0.5rem",
    border: "1px solid " + "rgba(0, 217, 255, 0.2)",
  };

  const toggleButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: "0.625rem",
    borderRadius: "0.375rem",
    border: "none",
    backgroundColor: "transparent",
    color: "#8A8F98",
    fontSize: "0.75rem",
    fontWeight: "500",
    fontFamily: "'Exo 2', sans-serif",
    cursor: "pointer",
    transition: "all 200ms ease-out",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.375rem",
  };

  const resetButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.875rem",
    borderRadius: "0.75rem",
    border: "1px solid " + "rgba(255, 51, 102, 0.5)",
    backgroundColor: "rgba(255, 51, 102, 0.1)",
    color: "#FF3366",
    fontSize: "0.875rem",
    fontWeight: "600",
    fontFamily: "'Orbitron', sans-serif",
    cursor: "pointer",
    transition: "all 200ms ease-out",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div style={containerStyle} className={`settings-panel ${className}`}>
      {/* Header */}
      <div style={headerStyle}>
        {!isCollapsed && (
          <h3 style={titleStyle}>
            <Settings size={16} />
            <span>Settings</span>
          </h3>
        )}
        <button
          style={{
            ...buttonStyle,
            ...(isCollapsed ? { width: "auto", padding: "0 0.75rem" } : {}),
          }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 217, 255, 0.2)";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(0, 217, 255, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(0, 217, 255, 0.1)";
            e.currentTarget.style.boxShadow = "none";
          }}
          aria-label={isCollapsed ? "Expand settings" : "Collapse settings"}
          type="button"
          className="group"
        >
          {isCollapsed ? (
            <>
              <Settings size={16} className="group-hover:rotate-90 transition-transform duration-300" />
            </>
          ) : (
            <X size={16} className="group-hover:rotate-90 transition-transform duration-300" />
          )}
        </button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div style={contentStyle}>
          {/* Display Lines */}
          <div style={sectionStyle}>
            <div style={labelStyle}>
              <span>Display Lines</span>
              <span style={valueStyle}>{displaySettings.displayLines}</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              value={displaySettings.displayLines}
              onChange={(e) =>
                handleUpdate({ displayLines: parseInt(e.target.value, 10) })
              }
              style={sliderStyle}
              aria-label="Number of lines to display"
            />
          </div>

          {/* Font Size */}
          <div style={sectionStyle}>
            <div style={labelStyle}>
              <span>Font Size</span>
              <span style={valueStyle}>{displaySettings.fontSize}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={FONT_SIZE_OPTIONS.length - 1}
              value={FONT_SIZE_OPTIONS.indexOf(displaySettings.fontSize as any) ?? 0}
              onChange={(e) => {
                const idx = parseInt(e.target.value, 10);
                const fontSize = FONT_SIZE_OPTIONS[idx];
                if (fontSize) {
                  handleUpdate({ fontSize });
                }
              }}
              style={sliderStyle}
              aria-label="Font size"
            />
          </div>

          {/* Theme Toggle */}
          <div style={sectionStyle}>
            <div style={labelStyle}>
              <span>Theme</span>
            </div>
            <div style={toggleContainerStyle}>
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = displaySettings.theme === option.value;
                return (
                  <button
                    key={option.value}
                    style={{
                      ...toggleButtonStyle,
                      backgroundColor: isActive ? displaySettings.highlightColor : "transparent",
                      color: isActive ? "#030304" : "#8A8F98",
                      fontWeight: isActive ? "600" : "500",
                    }}
                    onClick={() => handleUpdate({ theme: option.value })}
                    type="button"
                    aria-pressed={isActive}
                    className="group"
                  >
                    <Icon size={14} className={isActive ? "" : "opacity-50"} />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Show Background Toggle */}
          <div style={sectionStyle}>
            <div style={labelStyle}>
              <span>Show Background</span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={displaySettings.showBackground}
                  onChange={(e) =>
                    handleUpdate({ showBackground: e.target.checked })
                  }
                  style={{
                    width: "1rem",
                    height: "1rem",
                    accentColor: displaySettings.highlightColor,
                  }}
                />
                <span style={valueStyle}>
                  {displaySettings.showBackground ? "On" : "Off"}
                </span>
              </label>
            </div>
          </div>

          {/* Auto Scroll Toggle */}
          <div style={sectionStyle}>
            <div style={labelStyle}>
              <span>Auto Scroll</span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={displaySettings.autoScroll}
                  onChange={(e) =>
                    handleUpdate({ autoScroll: e.target.checked })
                  }
                  style={{
                    width: "1rem",
                    height: "1rem",
                    accentColor: displaySettings.highlightColor,
                  }}
                />
                <span style={valueStyle}>
                  {displaySettings.autoScroll ? "On" : "Off"}
                </span>
              </label>
            </div>
          </div>

          {/* Enable Animation Toggle */}
          <div style={sectionStyle}>
            <div style={labelStyle}>
              <span>Animations</span>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={displaySettings.enableAnimation}
                  onChange={(e) =>
                    handleUpdate({ enableAnimation: e.target.checked })
                  }
                  style={{
                    width: "1rem",
                    height: "1rem",
                    accentColor: displaySettings.highlightColor,
                  }}
                />
                <span style={valueStyle}>
                  {displaySettings.enableAnimation ? "On" : "Off"}
                </span>
              </label>
            </div>
          </div>

          {/* Highlight Color */}
          <div style={sectionStyle}>
            <div style={labelStyle}>
              <span className="flex items-center gap-2">
                <Palette size={14} />
                <span>Highlight</span>
              </span>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "0.625rem",
              }}
            >
              {HIGHLIGHT_COLORS.map((color) => {
                const isSelected = displaySettings.highlightColor === color.value;
                return (
                  <button
                    key={color.value}
                    style={{
                      position: "relative",
                      padding: "0.625rem",
                      borderRadius: "0.625rem",
                      border: isSelected
                        ? `2px solid ${color.value}`
                        : "1px solid rgba(255, 255, 255, 0.1)",
                      backgroundColor: isSelected
                        ? `${color.value}20`
                        : "rgba(3, 3, 4, 0.6)",
                      cursor: "pointer",
                      transition: "all 200ms ease-out",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                    onClick={() => handleUpdate({ highlightColor: color.value })}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = "scale(1.05)";
                        e.currentTarget.style.borderColor = color.value;
                        e.currentTarget.style.boxShadow = `0 0 10px ${color.value}40`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.boxShadow = "none";
                      }
                    }}
                    type="button"
                    aria-label={`Select ${color.label} as highlight color`}
                    aria-pressed={isSelected}
                    className="group"
                  >
                    <div
                      style={{
                        width: "1.5rem",
                        height: "1.5rem",
                        borderRadius: "0.375rem",
                        backgroundColor: color.value,
                        boxShadow: isSelected ? `0 0 12px ${color.value}` : `0 0 6px ${color.value}60`,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.625rem",
                        color: isSelected ? color.value : "#8A8F98",
                        fontWeight: isSelected ? "600" : "400",
                      }}
                    >
                      {color.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Button */}
          <button
            style={resetButtonStyle}
            onClick={() => resetDisplaySettings()}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 51, 102, 0.2)";
              e.currentTarget.style.boxShadow = "0 0 12px rgba(255, 51, 102, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(255, 51, 102, 0.1)";
              e.currentTarget.style.boxShadow = "none";
            }}
            type="button"
            className="group"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
};
