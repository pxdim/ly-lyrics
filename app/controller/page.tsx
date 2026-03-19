/**
 * 演出控制台 — 組裝層（assembly shell）
 *
 * 三級 RWD 佈局：桌面三欄 / 平板雙欄 / 手機 Tab 分頁
 * 所有子元件從 components/controller/ 匯入。
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Panel, Group, Separator } from "react-resizable-panels";
import { useLyricsStore } from "@/lib/store";
import { generateSessionCode } from "@/lib/websocket/session-code";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { useIsTablet } from "@/lib/hooks/useIsTablet";
import { useAiTracking } from "@/lib/hooks/use-ai-tracking";
import { StatusBar, MobileStatusBar } from "@/components/controller/ControllerHeader";
import { MobileTabBar, type MobileTab } from "@/components/controller/MobileTabBar";
import { LibraryPanel } from "@/components/controller/LibraryPanel";
import { CueGrid } from "@/components/controller/CueGrid";

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

/** 共用佈局 props */
interface LayoutProps {
  sessionCode: string;
  onRegenerate: () => void;
}

/** 共用外殼 className（桌面/平板/手機三版共用） */
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

// 桌面版佈局 (>=1280px) — react-resizable-panels
function DesktopLayout({ sessionCode, onRegenerate }: LayoutProps) {
  const { start: startAi, stop: stopAi, onManualOverride } = useAiTracking();
  return (
    <div className={shellCls}>
      <StatusBar sessionCode={sessionCode} onRegenerate={onRegenerate} />
      <div className="flex flex-1 min-h-0">
        <Group orientation="horizontal" className="flex-1 min-h-0" id="controller-main">
          <Panel id="songs" defaultSize="20%" minSize="12%" maxSize="35%">
            <LibraryPanel />
          </Panel>
          <Separator className="w-[5px] bg-surface hover:bg-primary/20 active:bg-primary/30 transition-colors cursor-col-resize flex items-center justify-center group">
            <div className="w-px h-8 bg-border-dim group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
          </Separator>
          <Panel id="cues" defaultSize="45%" minSize="30%">
            <CueGrid onManualOverride={onManualOverride} />
          </Panel>
          <Separator className="w-[5px] bg-surface hover:bg-primary/20 active:bg-primary/30 transition-colors cursor-col-resize flex items-center justify-center group">
            <div className="w-px h-8 bg-border-dim group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
          </Separator>
          <Panel id="right" defaultSize="35%" minSize="20%" maxSize="50%">
            <Group orientation="vertical" id="controller-right">
              <Panel id="preview" defaultSize="45%" minSize="20%">
                <LivePreview />
              </Panel>
              <Separator className="h-[5px] bg-surface hover:bg-primary/20 active:bg-primary/30 transition-colors cursor-row-resize flex items-center justify-center group">
                <div className="h-px w-8 bg-border-dim group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
              </Separator>
              <Panel id="settings" defaultSize="55%" minSize="25%">
                <div className="h-full overflow-y-auto">
                  <div className="p-3">
                    <AiTrackingPanel onToggle={(a) => { if (a) startAi(); else stopAi(); }} />
                  </div>
                  <QuickSettings />
                </div>
              </Panel>
            </Group>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
