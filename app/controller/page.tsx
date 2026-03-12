/**
 * Controller Page
 *
 * Main control interface for managing lyrics display.
 * Integrates all P0 components: SongSelector, LyricsDisplay, LyricsControl, SettingsPanel.
 * Design System v2.0 - Dark Tech Edition
 */

"use client";

import { useEffect } from "react";
import { Music, Wifi, Monitor, Users, Code } from "lucide-react";
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
    <div className="relative min-h-screen bg-void text-text-primary">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-30 pointer-events-none" />

      {/* Settings Panel - Fixed Position */}
      <SettingsPanel position="right" defaultCollapsed={false} />

      {/* Main Content */}
      <div className="space-y-8 pr-[340px] p-8">
        {/* Header */}
        <header className="space-y-2">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-elevated border border-primary/30 rounded-xl shadow-glow-sm">
              <Music className="w-6 h-6 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="font-heading text-3xl font-bold tracking-wide text-gradient">
                控制中心
              </h1>
              <p className="font-body text-sm text-text-muted">歌詞顯示控制面板</p>
            </div>
          </div>
          <div className="w-24 h-1 bg-gradient-to-r from-primary to-accent rounded-full" />
        </header>

        {/* Song Selection Section */}
        <section className="bg-elevated border border-border-dim rounded-2xl p-6 shadow-inner-glow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Music className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <h2 className="font-heading text-lg font-semibold uppercase tracking-wider">
              選擇歌曲
            </h2>
          </div>
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
        <section className="bg-elevated border border-border-dim rounded-2xl p-6 shadow-inner-glow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <Code className="w-5 h-5 text-secondary" strokeWidth={1.5} />
            </div>
            <h2 className="font-heading text-lg font-semibold uppercase tracking-wider">
              歌詞預覽
            </h2>
          </div>
          <div className="bg-void/50 rounded-xl min-h-[400px] overflow-hidden border border-border-dim">
            <LyricsDisplay />
          </div>
        </section>

        {/* Control Section */}
        <section className="bg-elevated border border-border-dim rounded-2xl p-6 shadow-inner-glow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-accent/10 rounded-lg">
              <Users className="w-5 h-5 text-accent" strokeWidth={1.5} />
            </div>
            <h2 className="font-heading text-lg font-semibold uppercase tracking-wider">
              導航控制
            </h2>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-center mb-8">
            <LyricsControl compact={false} position="bottom" />
          </div>

          {/* Connection Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <ConnectionCard
              icon={<Wifi className="w-4 h-4" />}
              status="已連接"
              statusColor="accent"
              label="連線狀態"
            />
            <ConnectionCard
              icon={<Monitor className="w-4 h-4" />}
              value="1"
              label="控制端"
            />
            <ConnectionCard
              icon={<Users className="w-4 h-4" />}
              value="0"
              label="顯示端"
            />
          </div>

          {/* Session Code Display */}
          <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-xl text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Code className="w-4 h-4 text-primary" />
              <span className="font-body text-sm text-text-muted uppercase tracking-wider">
                同步碼
              </span>
            </div>
            <div className="font-mono text-4xl font-bold text-primary tracking-widest py-2">
              {currentSong?.id.slice(-6).toUpperCase() || "------"}
            </div>
            <div className="flex items-center justify-center gap-2 mt-2">
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              <p className="font-body text-xs text-text-muted">
                在顯示端輸入此碼以連接
              </p>
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Connection Card Component
 */
interface ConnectionCardProps {
  icon: React.ReactNode;
  status?: string;
  statusColor?: "primary" | "secondary" | "accent";
  value?: string | number;
  label: string;
}

function ConnectionCard({ icon, status, statusColor = "accent", value, label }: ConnectionCardProps) {
  const statusColors = {
    primary: "text-primary bg-primary/20",
    secondary: "text-secondary bg-secondary/20",
    accent: "text-accent bg-accent/20",
  };

  return (
    <div className="flex items-center justify-center gap-3 p-4 bg-void/50 border border-border-dim rounded-xl">
      <div className="p-2 bg-elevated rounded-lg">
        {icon}
      </div>
      <span className="font-body text-text-muted">
        {label}:{" "}
        <span className={`font-heading font-semibold ${status ? statusColors[statusColor] : "text-text-primary"}`}>
          {status || value}
        </span>
      </span>
    </div>
  );
}
