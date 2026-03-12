/**
 * Controller Page
 *
 * Main control interface for managing lyrics display.
 * Integrates all P0 components: SongSelector, LyricsDisplay, LyricsControl, SettingsPanel.
 */

"use client";

import { useEffect } from "react";
import { useLyricsStore } from "@/lib/store";
import { SongSelector } from "@/components/lyrics/SongSelector";
import { LyricsDisplay } from "@/components/lyrics/LyricsDisplay";
import { LyricsControl } from "@/components/lyrics/LyricsControl";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export default function ControllerPage() {
  const { currentSong, connect, disconnect } = useLyricsStore();

  // Initialize WebSocket connection on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <div className="relative min-h-screen">
      {/* Settings Panel - Fixed Position */}
      <SettingsPanel position="right" defaultCollapsed={false} />

      {/* Main Content */}
      <div className="space-y-6 pr-[320px]">
        {/* Song Selection Section */}
        <section className="bg-card rounded-lg p-6 shadow-md border border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            選擇歌曲
          </h2>
          <SongSelector
            placeholder="搜索歌曲..."
            showArtist={true}
            maxResults={50}
            onSongSelect={(song) => {
              console.log("Selected song:", song.title);
            }}
          />
        </section>

        {/* Lyrics Preview Section */}
        <section className="bg-card rounded-lg p-6 shadow-md border border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            歌詞預覽
          </h2>
          <div className="bg-muted rounded-lg min-h-[300px] overflow-hidden">
            <LyricsDisplay />
          </div>
        </section>

        {/* Control Section */}
        <section className="bg-card rounded-lg p-6 shadow-md border border-border">
          <h2 className="text-xl font-semibold mb-4 text-foreground">
            導航控制
          </h2>
          <div className="flex justify-center">
            <LyricsControl compact={false} position="bottom" />
          </div>

          {/* Connection Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-muted-foreground">
                連線狀態: <span className="text-foreground font-medium">已連接</span>
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">
                控制端: <span className="text-foreground font-medium">1</span>
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">
                顯示端: <span className="text-foreground font-medium">0</span>
              </span>
            </div>
          </div>

          {/* Session Code Display */}
          <div className="mt-4 text-center p-4 bg-primary/5 rounded-lg border border-primary/20">
            <div className="text-sm text-muted-foreground mb-1">同步碼</div>
            <div className="text-3xl font-mono font-bold text-primary tracking-widest">
              {currentSong?.id.slice(-6).toUpperCase() || "------"}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              在顯示端輸入此碼以連接
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
