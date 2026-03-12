"use client";

import { useState } from "react";

export default function ControllerPage() {
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [currentLine, setCurrentLine] = useState(0);
  const [displayLines, setDisplayLines] = useState(4);

  // Sample lyrics data
  const sampleSongs = [
    {
      id: "1",
      title: "示範歌曲",
      artist: "LY 範例",
      lyrics: [
        "這是第一行歌詞",
        "這是第二行歌詞",
        "這是第三行歌詞",
        "這是第四行歌詞",
        "這是第五行歌詞",
        "這是第六行歌詞",
        "這是第七行歌詞",
        "這是第八行歌詞",
      ],
    },
  ];

  const currentSong = sampleSongs.find((s) => s.id === selectedSong) || sampleSongs[0];

  // Calculate which lines to display
  const getDisplayLines = () => {
    const lyrics = currentSong?.lyrics || [];
    const half = Math.floor(displayLines / 2);
    const start = Math.max(0, currentLine - half);
    const end = Math.min(lyrics.length, start + displayLines);
    return lyrics.slice(start, end);
  };

  const displayLyrics = getDisplayLines();

  return (
    <div className="space-y-6">
      {/* Song Selection */}
      <div className="bg-card rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">選擇歌曲</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sampleSongs.map((song) => (
            <button
              key={song.id}
              onClick={() => setSelectedSong(song.id)}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                selectedSong === song.id
                  ? "border-primary-600 bg-primary-50 dark:bg-primary-900/20"
                  : "border-border hover:border-primary-400"
              }`}
            >
              <div className="font-medium">{song.title}</div>
              <div className="text-sm text-muted-foreground">{song.artist}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Lyrics Preview */}
      <div className="bg-card rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">歌詞預覽</h2>
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-8 min-h-[300px]">
          {displayLyrics.map((line, idx) => {
            const globalIndex = currentSong?.lyrics.indexOf(line) ?? 0;
            const isActive = globalIndex === currentLine;

            return (
              <p
                key={idx}
                className={`text-2xl text-center py-2 transition-all ${
                  isActive
                    ? "text-primary-600 font-bold scale-105"
                    : "text-muted-foreground"
                }`}
              >
                {line}
              </p>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-card rounded-lg p-6 shadow-md">
        <h2 className="text-xl font-semibold mb-4">控制</h2>

        {/* Display Lines Control */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">
            顯示行數: {displayLines}
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={displayLines}
            onChange={(e) => setDisplayLines(Number(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentLine(Math.max(0, currentLine - 1))}
            className="px-6 py-3 bg-secondary hover:bg-secondary/80 rounded-lg font-medium transition-colors"
            disabled={currentLine === 0}
          >
            上一句
          </button>
          <div className="text-center">
            <div className="text-2xl font-bold">{currentLine + 1}</div>
            <div className="text-sm text-muted-foreground">
              / {currentSong?.lyrics.length || 0}
            </div>
          </div>
          <button
            onClick={() =>
              setCurrentLine(
                Math.min((currentSong?.lyrics.length || 1) - 1, currentLine + 1),
              )
            }
            className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            disabled={currentLine >= (currentSong?.lyrics.length || 1) - 1}
          >
            下一句
          </button>
        </div>

        {/* Connection Status */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <span
            className={`inline-block w-3 h-3 rounded-full ${
              true ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span>已連接 0 個顯示端</span>
        </div>

        {/* Sync Code */}
        <div className="mt-4 text-center">
          <div className="text-sm text-muted-foreground">同步碼</div>
          <div className="text-2xl font-mono tracking-widest">ABCD</div>
        </div>
      </div>
    </div>
  );
}
