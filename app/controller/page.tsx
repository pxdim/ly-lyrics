/**
 * 演出控制台 — 組裝層（assembly shell）
 *
 * 三級 RWD 佈局：桌面三欄 / 平板雙欄 / 手機 Tab 分頁
 * 所有子元件從 components/controller/ 匯入。
 */

"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Responsive,
  WidthProvider,
  type Layout as RGLLayout,
  type ResponsiveLayouts,
} from "react-grid-layout/legacy";
import { useLyricsStore } from "@/lib/store";
import { useLayoutStore } from "@/lib/store/layout-store";
import { generateSessionCode } from "@/lib/websocket/session-code";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useIsTablet } from "@/lib/hooks/useIsTablet";
import { useAiTracking } from "@/lib/hooks/use-ai-tracking";
import { StatusBar, MobileStatusBar } from "@/components/controller/ControllerHeader";
import { MobileTabBar, type MobileTab } from "@/components/controller/MobileTabBar";
import { EnhancedHeader } from "@/components/controller/EnhancedHeader";
import { DashboardCard } from "@/components/controller/DashboardCard";
import { LibraryPanel } from "@/components/controller/LibraryPanel";
import { CueGrid } from "@/components/controller/CueGrid";
import { QRCodePanel } from "@/components/controller/QRCodePanel";

// react-grid-layout 需要 WidthProvider HOC 自動偵測容器寬度
const ResponsiveGridLayout = WidthProvider(Responsive);

// 非首屏核心元件 — 懶載入以分割 bundle
// LivePreview：桌面右欄預覽面板
const LivePreview = dynamic(
  () => import("@/components/controller/LivePreview").then((m) => ({ default: m.LivePreview })),
  { ssr: false, loading: () => <div className="animate-pulse bg-surface h-40" /> },
);

// QuickSettings：設定面板，非首屏必要
const QuickSettings = dynamic(
  () => import("@/components/controller/QuickSettings").then((m) => ({ default: m.QuickSettings })),
  { ssr: false, loading: () => <div className="animate-pulse bg-surface h-20" /> },
);

// AiTrackingPanel：展開型面板，延遲載入不影響核心操作
const AiTrackingPanel = dynamic(
  () => import("@/components/ai-tracking/AiTrackingPanel").then((m) => ({ default: m.AiTrackingPanel })),
  { ssr: false, loading: () => <div className="animate-pulse bg-surface h-16" /> },
);

// PlaylistPanel：播放清單面板，非首屏必要
const PlaylistPanel = dynamic(
  () => import("@/components/controller/PlaylistPanel").then((m) => ({ default: m.PlaylistPanel })),
  { ssr: false, loading: () => <div className="animate-pulse bg-surface h-20" /> },
);

/** 共用佈局 props */
interface LayoutProps {
  sessionCode: string;
  onRegenerate: () => void;
}

/** 共用外殼 className — 使用設計系統 token */
const shellCls = "h-screen flex flex-col bg-surface text-text-primary overflow-hidden font-body text-[13px] antialiased";

export default function ControllerPage() {
  const connect = useLyricsStore((s) => s.connect);
  const disconnect = useLyricsStore((s) => s.disconnect);
  const joinSession = useLyricsStore((s) => s.joinSession);
  const leaveSession = useLyricsStore((s) => s.leaveSession);
  const [sessionCode, setSessionCode] = useState("");
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // 房間碼持久化：URL 參數 > sessionStorage > 新生成
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCode = urlParams.get("code")?.toUpperCase().slice(0, 6);
    const storedCode = sessionStorage.getItem("ly_controller_code");
    let code: string;
    if (urlCode && urlCode.length === 6) code = urlCode;
    else if (storedCode && storedCode.length === 6) code = storedCode;
    else code = generateSessionCode();

    setSessionCode(code);
    sessionStorage.setItem("ly_controller_code", code);
    const url = new URL(window.location.href);
    if (url.searchParams.get("code") !== code) {
      url.searchParams.set("code", code);
      window.history.replaceState({}, "", url.toString());
    }
    connect();
    joinSession(code, "controller");
    return () => { leaveSession(); disconnect(); };
    // connect/joinSession/leaveSession/disconnect 是穩定的 Zustand action
  }, [connect, joinSession, leaveSession, disconnect]);

  const regenerateSessionCode = useCallback(() => {
    leaveSession();
    disconnect();
    const newCode = generateSessionCode();
    setSessionCode(newCode);
    sessionStorage.setItem("ly_controller_code", newCode);
    const url = new URL(window.location.href);
    url.searchParams.set("code", newCode);
    window.history.replaceState({}, "", url.toString());
    connect();
    joinSession(newCode, "controller");
  }, [connect, disconnect, joinSession, leaveSession]);

  if (isMobile) return <MobileLayout sessionCode={sessionCode} onRegenerate={regenerateSessionCode} />;
  if (isTablet) return <TabletLayout sessionCode={sessionCode} onRegenerate={regenerateSessionCode} />;
  return <DesktopLayout sessionCode={sessionCode} onRegenerate={regenerateSessionCode} />;
}

// 手機版佈局 (<768px)
function MobileLayout({ sessionCode, onRegenerate }: LayoutProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("songs");
  const isConnected = useLyricsStore((s) => s.connectionState === "connected");
  const { start: startAi, stop: stopAi, onManualOverride } = useAiTracking();
  return (
    <div className={shellCls}>
      <MobileStatusBar sessionCode={sessionCode} isConnected={isConnected} onRegenerate={onRegenerate} />
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === "songs" && <div className="h-full flex flex-col"><LibraryPanel /></div>}
        {activeTab === "lyrics" && <div className="h-full"><CueGrid onManualOverride={onManualOverride} /></div>}
        {activeTab === "settings" && (
          <div className="h-full overflow-y-auto">
            <div className="p-3"><AiTrackingPanel onToggle={(a) => { if (a) startAi(); else stopAi(); }} /></div>
            <QuickSettings />
          </div>
        )}
      </div>
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

// 平板版佈局 (768px - 1279px)
function TabletLayout({ sessionCode, onRegenerate }: LayoutProps) {
  const { start: startAi, stop: stopAi, onManualOverride } = useAiTracking();
  return (
    <div className={shellCls}>
      <StatusBar sessionCode={sessionCode} onRegenerate={onRegenerate} />
      <div className="flex flex-1 min-h-0">
        <div className="w-2/5 min-h-0 flex flex-col"><LibraryPanel /></div>
        <div className="w-3/5 min-h-0 flex flex-col border-l border-border-dim">
          <div className="p-2 border-b border-border-dim shrink-0">
            <AiTrackingPanel onToggle={(a) => { if (a) startAi(); else stopAi(); }} />
          </div>
          <CueGrid onManualOverride={onManualOverride} />
        </div>
      </div>
    </div>
  );
}

// 桌面版佈局 (>=1280px) — react-grid-layout 可拖曳卡片佈局
function DesktopLayout({ sessionCode, onRegenerate }: LayoutProps) {
  const { start: startAi, stop: stopAi, onManualOverride } = useAiTracking();
  const layouts = useLayoutStore((s) => s.layouts);
  const isLocked = useLayoutStore((s) => s.isLocked);
  const setLayouts = useLayoutStore((s) => s.setLayouts);

  // 過濾掉 w=0 或 h=0 的隱藏卡片
  const visibleCardIds = useMemo(() => {
    const lgLayout = layouts.lg ?? [];
    const visible = new Set<string>();
    for (const item of lgLayout) {
      if (item.w > 0 && item.h > 0) {
        visible.add(item.i);
      }
    }
    return visible;
  }, [layouts]);

  // 用 ref 暫存拖曳中的 layout，只在 drag/resize stop 時寫入 store（避免高頻 localStorage I/O）
  const pendingLayoutsRef = React.useRef<import("@/lib/store/layout-store").Layouts | null>(null);

  const handleLayoutChange = useCallback(
    (_currentLayout: RGLLayout, allLayouts: ResponsiveLayouts) => {
      pendingLayoutsRef.current = allLayouts as import("@/lib/store/layout-store").Layouts;
    },
    [],
  );

  const handleDragResizeStop = useCallback(() => {
    if (pendingLayoutsRef.current) {
      setLayouts(pendingLayoutsRef.current);
      pendingLayoutsRef.current = null;
    }
  }, [setLayouts]);

  return (
    <div className={shellCls}>
      <EnhancedHeader sessionCode={sessionCode} onRegenerate={onRegenerate} />

      <div className="flex-1 overflow-auto p-3">
        <ResponsiveGridLayout
          layouts={layouts}
          onLayoutChange={handleLayoutChange}
          onDragStop={handleDragResizeStop}
          onResizeStop={handleDragResizeStop}
          breakpoints={{ lg: 1200, md: 768 }}
          cols={{ lg: 12, md: 8 }}
          rowHeight={80}
          isDraggable={!isLocked}
          isResizable={!isLocked}
          draggableHandle=".card-drag-handle"
          containerPadding={[0, 0]}
          margin={[12, 12]}
        >
          {visibleCardIds.has("songs") && (
            <div key="songs">
              <DashboardCard title="Song Library" isLocked={isLocked}>
                <LibraryPanel />
              </DashboardCard>
            </div>
          )}

          {visibleCardIds.has("cues") && (
            <div key="cues">
              <DashboardCard title="Cue Grid" isLocked={isLocked}>
                <CueGrid onManualOverride={onManualOverride} />
              </DashboardCard>
            </div>
          )}

          {visibleCardIds.has("preview") && (
            <div key="preview">
              <DashboardCard title="Program Out" isLocked={isLocked}>
                <LivePreview />
              </DashboardCard>
            </div>
          )}

          {visibleCardIds.has("config") && (
            <div key="config">
              <DashboardCard title="Display Config" isLocked={isLocked}>
                <QuickSettings />
              </DashboardCard>
            </div>
          )}

          {visibleCardIds.has("ai") && (
            <div key="ai">
              <DashboardCard title="AI Tracking" isLocked={isLocked}>
                <AiTrackingPanel onToggle={(active) => { if (active) startAi(); else stopAi(); }} />
              </DashboardCard>
            </div>
          )}

          {visibleCardIds.has("playlist") && (
            <div key="playlist">
              <DashboardCard title="Playlist" isLocked={isLocked}>
                <PlaylistPanel />
              </DashboardCard>
            </div>
          )}

          {visibleCardIds.has("connection") && (
            <div key="connection">
              <DashboardCard title="Connection" isLocked={isLocked}>
                <QRCodePanel sessionCode={sessionCode} size={100} compact />
              </DashboardCard>
            </div>
          )}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
