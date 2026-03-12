/**
 * SettingsPanel Component
 *
 * Display settings panel for adjusting display lines, font size, and theme.
 * All changes update the Zustand store and sync via WebSocket when connected.
 */

"use client";

import { type FC, useState } from "react";
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

const THEME_OPTIONS: Array<{ value: "dark" | "light"; label: string }> = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export const SettingsPanel: FC<SettingsPanelProps> = ({
  className = "",
  defaultCollapsed = false,
  position = "right",
}) => {
  const { displaySettings, updateDisplaySettings, resetDisplaySettings } =
    useLyricsStore();

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
    width: isCollapsed ? "auto" : "300px",
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    backdropFilter: "blur(12px)",
    borderRadius: "1rem",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)",
    zIndex: 100,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    overflow: "hidden",
  };

  const headerStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "1rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  };

  const titleStyle: React.CSSProperties = {
    color: "white",
    fontSize: "0.875rem",
    fontWeight: "600",
    margin: 0,
  };

  const buttonStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "2rem",
    height: "2rem",
    borderRadius: "0.5rem",
    border: "none",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "white",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  const contentStyle: React.CSSProperties = {
    padding: "1rem",
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
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: "0.75rem",
    fontWeight: "500",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "0.5rem",
  };

  const valueStyle: React.CSSProperties = {
    color: displaySettings.highlightColor,
    fontSize: "0.75rem",
    fontWeight: "600",
  };

  const sliderStyle: React.CSSProperties = {
    width: "100%",
    height: "6px",
    borderRadius: "3px",
    outline: "none",
    cursor: "pointer",
    accentColor: displaySettings.highlightColor,
  };

  const toggleContainerStyle: React.CSSProperties = {
    display: "flex",
    gap: "0.5rem",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: "0.25rem",
    borderRadius: "0.5rem",
  };

  const toggleButtonStyle: React.CSSProperties = {
    flex: 1,
    padding: "0.5rem",
    borderRadius: "0.375rem",
    border: "none",
    backgroundColor: "transparent",
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: "0.75rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  const resetButtonStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "0.5rem",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    backgroundColor: "transparent",
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: "0.75rem",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  return (
    <div style={containerStyle} className={`settings-panel ${className}`}>
      {/* Header */}
      <div style={headerStyle}>
        {!isCollapsed && <h3 style={titleStyle}>Display Settings</h3>}
        <button
          style={buttonStyle}
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand settings" : "Collapse settings"}
          type="button"
        >
          {isCollapsed ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              width={16}
              height={16}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              width={16}
              height={16}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 9l-7 7-7-7"
              />
            </svg>
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
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  style={{
                    ...toggleButtonStyle,
                    backgroundColor:
                      displaySettings.theme === option.value
                        ? displaySettings.highlightColor
                        : "transparent",
                    color:
                      displaySettings.theme === option.value
                        ? "white"
                        : "rgba(255, 255, 255, 0.6)",
                  }}
                  onClick={() => handleUpdate({ theme: option.value })}
                  type="button"
                  aria-pressed={displaySettings.theme === option.value}
                >
                  {option.label}
                </button>
              ))}
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
              <span>Highlight Color</span>
            </div>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              {[
                "#0ea5e9", // Sky blue
                "#8b5cf6", // Violet
                "#ec4899", // Pink
                "#f59e0b", // Amber
                "#10b981", // Emerald
                "#ef4444", // Red
              ].map((color) => (
                <button
                  key={color}
                  style={{
                    width: "2rem",
                    height: "2rem",
                    borderRadius: "0.5rem",
                    border:
                      displaySettings.highlightColor === color
                        ? "2px solid white"
                        : "2px solid transparent",
                    backgroundColor: color,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => handleUpdate({ highlightColor: color })}
                  type="button"
                  aria-label={`Select ${color} as highlight color`}
                  aria-pressed={displaySettings.highlightColor === color}
                />
              ))}
            </div>
          </div>

          {/* Reset Button */}
          <button
            style={resetButtonStyle}
            onClick={() => resetDisplaySettings()}
            type="button"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
};
