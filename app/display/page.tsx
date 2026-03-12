"use client";

import { useState, useEffect } from "react";

export default function DisplayPage() {
  const [currentLine, setCurrentLine] = useState(0);
  const [displayLines] = useState(4);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [connectionCode, setConnectionCode] = useState("");

  // Sample lyrics
  const lyrics = [
    "這是第一行歌詞",
    "這是第二行歌詞",
    "這是第三行歌詞",
    "這是第四行歌詞",
    "這是第五行歌詞",
    "這是第六行歌詞",
    "這是第七行歌詞",
    "這是第八行歌詞",
  ];

  // Calculate which lines to display
  const getDisplayLines = () => {
    const half = Math.floor(displayLines / 2);
    const start = Math.max(0, currentLine - half);
    const end = Math.min(lyrics.length, start + displayLines);
    return { lines: lyrics.slice(start, end), startIndex: start };
  };

  const { lines: displayLyrics, startIndex } = getDisplayLines();

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        setCurrentLine((prev) => Math.min(lyrics.length - 1, prev + 1));
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        setCurrentLine((prev) => Math.max(0, prev - 1));
      } else if (e.key === " ") {
        // Spacebar to toggle theme
        setTheme((prev) => (prev === "dark" ? "light" : "dark"));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center p-8 transition-colors ${
        theme === "dark" ? "bg-black text-white" : "bg-white text-black"
      }`}
    >
      {/* Connection Code Input (shown initially) */}
      {!connectionCode && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-50">
          <div className="text-center space-y-6">
            <h1 className="text-4xl font-bold text-white">LY 顯示端</h1>
            <p className="text-muted-foreground">輸入同步碼以連接</p>
            <input
              type="text"
              value={connectionCode}
              onChange={(e) => setConnectionCode(e.target.value.toUpperCase())}
              placeholder="輸入同步碼"
              className="px-6 py-4 text-2xl font-mono text-center bg-gray-800 text-white rounded-lg border-2 border-primary-600 focus:outline-none focus:border-primary-400 uppercase"
              maxLength={4}
            />
            <button
              onClick={() => {/* TODO: Connect to controller */}}
              className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              連接
            </button>
          </div>
        </div>
      )}

      {/* Lyrics Display */}
      <div className="max-w-4xl w-full">
        {displayLyrics.map((line, idx) => {
          const globalIndex = startIndex + idx;
          const isActive = globalIndex === currentLine;

          return (
            <p
              key={idx}
              className={`text-4xl md:text-5xl lg:text-6xl text-center py-4 transition-all duration-300 ${
                isActive
                  ? "text-primary-600 font-bold scale-105 focus-glow"
                  : "opacity-40"
              }`}
            >
              {line}
            </p>
          );
        })}
      </div>

      {/* Current Position Indicator */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 text-sm opacity-50">
        {currentLine + 1} / {lyrics.length}
      </div>
    </div>
  );
}
