/**
 * 演出控制台 — Broadcast Console 風格
 *
 * 可拖曳調整大小的三欄面板：歌曲庫 | Cue Grid 歌詞 | 預覽 + 設定
 * 右欄垂直分割：上方即時預覽 | 下方快速設定
 * 所有演出流程相關功能集中在同一頁面。
 */

"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Panel, Group, Separator } from "react-resizable-panels";
import { useLyricsStore } from "@/lib/store";
import { fetchSongs, deleteSong, type ClientSong } from "@/lib/api/songs";
import { fetchPlaylists, createPlaylist, updatePlaylist, deletePlaylist, type ClientPlaylist } from "@/lib/api/playlists";
import { AddSongModal } from "@/components/controller/AddSongModal";
import { generateSessionCode } from "@/lib/websocket/session-code";

// ============================================================================
// 主頁面
// ============================================================================

export default function ControllerPage() {
  const connect = useLyricsStore((state) => state.connect);
  const disconnect = useLyricsStore((state) => state.disconnect);
  const joinSession = useLyricsStore((state) => state.joinSession);
  const leaveSession = useLyricsStore((state) => state.leaveSession);
  // 房間碼在 useEffect 中生成（client-only），避免 SSR/client 隨機值不同導致 hydration mismatch
  const [sessionCode, setSessionCode] = useState("");

  // 房間碼持久化：URL 參數 > sessionStorage > 新生成
  // 確保 F5 重新整理時房間碼不變，所有接收端不會斷線
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCode = urlParams.get("code")?.toUpperCase().slice(0, 6);
    const storedCode = sessionStorage.getItem("ly_controller_code");

    let code: string;
    if (urlCode && urlCode.length === 6) {
      code = urlCode;
    } else if (storedCode && storedCode.length === 6) {
      code = storedCode;
    } else {
      code = generateSessionCode();
    }

    setSessionCode(code);
    sessionStorage.setItem("ly_controller_code", code);

    // 將房間碼寫入 URL（不觸發導航），方便分享和 F5 恢復
    const url = new URL(window.location.href);
    if (url.searchParams.get("code") !== code) {
      url.searchParams.set("code", code);
      window.history.replaceState({}, "", url.toString());
    }

    connect();
    joinSession(code, "controller");
    return () => {
      leaveSession();
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 重新產生房間碼（手動觸發，用於需要切換房間的場景）
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

  return (
    <div className="h-screen flex flex-col bg-[#090A0C] text-[#E4E7EB] overflow-hidden font-body text-[13px] antialiased">
      <StatusBar sessionCode={sessionCode} onRegenerate={regenerateSessionCode} />
      <Group orientation="horizontal" className="flex-1 min-h-0" id="controller-main">
        {/* 左欄：歌曲庫 + 播放清單 */}
        <Panel id="songs" defaultSize="20%" minSize="12%" maxSize="35%">
          <LibraryPanel />
        </Panel>
        <Separator className="w-[5px] bg-[#090A0C] hover:bg-primary/20 active:bg-primary/30 transition-colors cursor-col-resize flex items-center justify-center group">
          <div className="w-px h-8 bg-[#2A2D35] group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
        </Separator>

        {/* 中欄：Cue Grid */}
        <Panel id="cues" defaultSize="45%" minSize="30%">
          <CueGrid />
        </Panel>
        <Separator className="w-[5px] bg-[#090A0C] hover:bg-primary/20 active:bg-primary/30 transition-colors cursor-col-resize flex items-center justify-center group">
          <div className="w-px h-8 bg-[#2A2D35] group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
        </Separator>

        {/* 右欄：預覽 + 設定 (垂直分割) */}
        <Panel id="right" defaultSize="35%" minSize="20%" maxSize="50%">
          <Group orientation="vertical" id="controller-right">
            {/* 上：即時預覽 */}
            <Panel id="preview" defaultSize="45%" minSize="20%">
              <LivePreview />
            </Panel>
            <Separator className="h-[5px] bg-[#090A0C] hover:bg-primary/20 active:bg-primary/30 transition-colors cursor-row-resize flex items-center justify-center group">
              <div className="h-px w-8 bg-[#2A2D35] group-hover:bg-primary/50 group-active:bg-primary transition-colors" />
            </Separator>
            {/* 下：快速設定 */}
            <Panel id="settings" defaultSize="55%" minSize="25%">
              <QuickSettings />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}

// ============================================================================
// 頂部狀態列
// ============================================================================

function StatusBar({ sessionCode, onRegenerate }: { sessionCode: string; onRegenerate: () => void }) {
  const isConnected = useLyricsStore((state) => state.connectionState === "connected");
  const controllerCount = useLyricsStore((state) => state.controllerCount);
  const displayCount = useLyricsStore((state) => state.displayCount);
  const currentSong = useLyricsStore((state) => state.currentSong);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const copyToClipboard = useCallback(async (type: "code" | "link") => {
    const text = type === "code"
      ? sessionCode
      : `${window.location.origin}/display?code=${sessionCode}`;
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }, [sessionCode]);

  return (
    <header className="flex items-center justify-between whitespace-nowrap border-b border-[#2A2D35] bg-[#16181D] px-6 py-2 shrink-0 h-12">
      {/* 左：標題 + 房間碼 */}
      <div className="flex items-center gap-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <h2 className="text-[16px] font-semibold leading-tight tracking-[-0.015em]">
          Control Desk
        </h2>

        {/* 房間碼：點擊複製 */}
        <div className="flex items-center gap-1.5 ml-2">
          <button
            type="button"
            onClick={() => copyToClipboard("code")}
            className="flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 rounded-md hover:bg-primary/20 hover:border-primary/50 transition-all group cursor-pointer"
            title="點擊複製房間碼"
          >
            <span className="text-[11px] font-mono text-primary/70 uppercase tracking-wider">Room</span>
            <span className="text-[15px] font-mono font-bold text-primary tracking-[0.2em]">
              {sessionCode}
            </span>
            {/* 複製圖示 */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary/50 group-hover:text-primary transition-colors">
              {copied === "code" ? (
                <path d="M20 6L9 17l-5-5" />
              ) : (
                <>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </>
              )}
            </svg>
          </button>

          {/* 複製顯示端連結按鈕 */}
          <button
            type="button"
            onClick={() => copyToClipboard("link")}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#090A0C] border border-[#2A2D35] rounded-md hover:border-primary/40 hover:bg-primary/5 transition-all text-[11px] font-mono text-[#6B7280] hover:text-primary cursor-pointer"
            title="複製顯示端連結"
          >
            {/* 連結圖示 */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {copied === "link" ? (
                <path d="M20 6L9 17l-5-5" />
              ) : (
                <>
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </>
              )}
            </svg>
            {copied === "link" ? "已複製" : "複製連結"}
          </button>

          {/* 重新產生房間碼 */}
          <button
            type="button"
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#090A0C] border border-[#2A2D35] rounded-md hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-[11px] font-mono text-[#6B7280] hover:text-amber-400 cursor-pointer"
            title="重新產生房間碼（所有接收端需重新連線）"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0115.36-6.36L21 8" />
              <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 01-15.36 6.36L3 16" />
            </svg>
            新房間
          </button>
        </div>

        {currentSong && (
          <span className="text-[12px] font-mono border border-[#2A2D35] px-2 py-0.5 bg-[#090A0C] text-[#6B7280] ml-2 truncate max-w-[200px]">
            {currentSong.title}
            {currentSong.artist ? ` — ${currentSong.artist}` : ""}
          </span>
        )}
      </div>

      {/* 右：連線狀態 */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? "bg-primary animate-pulse" : "bg-red-500"}`} />
          <span className={`text-[12px] font-mono ${isConnected ? "text-primary" : "text-red-400"}`}>
            {isConnected ? "SYSTEM READY" : "OFFLINE"}
          </span>
        </div>
        <div className="h-5 w-px bg-[#2A2D35]" />
        <div className="flex items-center gap-4 text-[12px] font-mono text-[#6B7280]">
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12.55a11 11 0 0 1 14.08 0" /><path d="M1.42 9a16 16 0 0 1 21.16 0" /><path d="M8.53 16.11a6 6 0 0 1 6.95 0" /><line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
            WS
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="0" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            CTL: {controllerCount}
          </span>
          <span className="flex items-center gap-1.5 text-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            DSP: {displayCount}
          </span>
        </div>
      </div>
    </header>
  );
}

// ============================================================================
// 左欄：歌曲庫
// ============================================================================

type LibraryTab = "songs" | "playlists";

function LibraryPanel() {
  const [activeTab, setActiveTab] = useState<LibraryTab>("songs");

  return (
    <div className="h-full flex flex-col border-r border-[#2A2D35] bg-[#090A0C]">
      {/* Tab 切換 */}
      <div className="flex border-b border-[#2A2D35] bg-[#16181D] shrink-0">
        {(["songs", "playlists"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-[11px] font-mono tracking-wider uppercase transition-colors border-b-2 ${
              activeTab === tab
                ? "text-primary border-primary bg-primary/5"
                : "text-[#6B7280] border-transparent hover:text-[#E4E7EB] hover:bg-[#16181D]/80"
            }`}
            type="button"
          >
            {tab === "songs" ? "Songs" : "Playlists"}
          </button>
        ))}
      </div>

      {/* Tab 內容 */}
      {activeTab === "songs" ? <SongListPanel /> : <PlaylistListPanel />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Songs Tab
// ────────────────────────────────────────────────────────────

function SongListPanel() {
  const [songs, setSongs] = useState<ClientSong[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentSong = useLyricsStore((state) => state.currentSong);
  const setCurrentSong = useLyricsStore((state) => state.setCurrentSong);

  const loadSongs = useCallback(async (searchQuery?: string) => {
    try {
      setIsLoading(true);
      const params: { limit: number; search?: string } = { limit: 100 };
      if (searchQuery) params.search = searchQuery;
      const result = await fetchSongs(params);
      setSongs(result.data);
    } catch (err) {
      console.error("載入歌曲失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSongs();
  }, [loadSongs]);

  // 搜尋防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      loadSongs(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, loadSongs]);

  const handleSelectSong = (song: ClientSong) => {
    setCurrentSong(song as Parameters<typeof setCurrentSong>[0]);
  };

  const handleDeleteSong = async (e: React.MouseEvent, songId: string) => {
    e.stopPropagation();
    if (!confirm("確定要刪除這首歌曲嗎？")) return;

    setDeletingId(songId);
    try {
      await deleteSong(songId);
      if (currentSong?.id === songId) {
        setCurrentSong(null);
      }
      await loadSongs(search);
    } catch (err) {
      console.error("刪除歌曲失敗:", err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2D35] shrink-0">
        <span className="text-[11px] font-mono text-[#6B7280]">{songs.length} TRACKS</span>
        <button
          onClick={() => setShowAddModal(true)}
          className="text-[#6B7280] hover:text-[#E4E7EB] transition-colors"
          type="button"
          title="新增歌曲"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* 搜尋 */}
      <div className="px-3 py-2 border-b border-[#2A2D35] shrink-0">
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280]">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋歌曲..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#090A0C] border border-[#2A2D35] text-[13px] text-[#E4E7EB] placeholder:text-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none"
          />
        </div>
      </div>

      {/* 歌曲列表 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-4 text-center text-[12px] text-[#6B7280] font-mono">LOADING...</div>
        ) : songs.length === 0 ? (
          <div className="p-4 text-center text-[12px] text-[#6B7280] font-mono">
            {search ? "NO RESULTS" : "EMPTY"}
          </div>
        ) : (
          songs.map((song, idx) => {
            const isActive = currentSong?.id === song.id;
            return (
              <div
                key={song.id}
                onClick={() => handleSelectSong(song)}
                className={`group flex items-center gap-3 px-4 py-2.5 border-b border-[#2A2D35]/50 cursor-pointer transition-colors ${
                  isActive
                    ? "bg-[#16181D] text-[#E4E7EB] border-l-2 border-l-primary relative"
                    : "hover:bg-[#16181D]/50 text-[#6B7280] hover:text-[#E4E7EB]"
                }`}
              >
                {isActive && (
                  <div className="absolute inset-y-0 left-0 w-full bg-primary/5 pointer-events-none" />
                )}
                <span className="font-mono text-[11px] w-5 shrink-0 text-right">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                {isActive ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary shrink-0">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6B7280] shrink-0">
                    <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                  </svg>
                )}
                <div className="flex-1 min-w-0 relative z-10">
                  <p className={`truncate text-[13px] ${isActive ? "font-semibold" : ""}`}>
                    {song.title}
                  </p>
                  {song.artist && (
                    <p className="text-[11px] text-[#6B7280] truncate">{song.artist}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0 relative z-10">
                  <span className="font-mono text-[10px] text-[#6B7280]">
                    {song.lyrics.length}L
                  </span>
                  <button
                    onClick={(e) => handleDeleteSong(e, song.id)}
                    disabled={deletingId === song.id}
                    className="p-1 opacity-0 group-hover:opacity-100 text-[#6B7280] hover:text-red-400 transition-all"
                    type="button"
                    title="刪除歌曲"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AddSongModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSongAdded={() => loadSongs(search)}
      />
    </>
  );
}

// ────────────────────────────────────────────────────────────
// Playlists Tab
// ────────────────────────────────────────────────────────────

function PlaylistListPanel() {
  const [playlists, setPlaylists] = useState<ClientPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<ClientPlaylist | null>(null);

  // 載入所有歌曲（用於建立播放清單時的歌曲選擇 + 載入播放清單歌曲）
  const [allSongs, setAllSongs] = useState<ClientSong[]>([]);
  const [selectedSongIds, setSelectedSongIds] = useState<Set<string>>(new Set());

  const setCurrentSong = useLyricsStore((state) => state.setCurrentSong);
  const currentSong = useLyricsStore((state) => state.currentSong);

  const loadPlaylists = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await fetchPlaylists({ limit: 100 });
      setPlaylists(result.data);
    } catch (err) {
      console.error("載入播放清單失敗:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadAllSongs = useCallback(async () => {
    try {
      const result = await fetchSongs({ limit: 200 });
      setAllSongs(result.data);
    } catch (err) {
      console.error("載入歌曲失敗:", err);
    }
  }, []);

  useEffect(() => {
    loadPlaylists();
    loadAllSongs();
  }, [loadPlaylists, loadAllSongs]);

  // 建立播放清單
  const handleCreate = async () => {
    if (!newName.trim() || selectedSongIds.size === 0) return;
    setCreating(true);
    try {
      await createPlaylist({
        name: newName.trim(),
        songIds: Array.from(selectedSongIds),
      });
      setNewName("");
      setSelectedSongIds(new Set());
      setShowCreate(false);
      await loadPlaylists();
    } catch (err) {
      console.error("建立播放清單失敗:", err);
    } finally {
      setCreating(false);
    }
  };

  const toggleSongSelection = (songId: string) => {
    setSelectedSongIds((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) {
        next.delete(songId);
      } else {
        next.add(songId);
      }
      return next;
    });
  };

  // 選取播放清單 → 顯示其歌曲
  const handleSelectPlaylist = (pl: ClientPlaylist) => {
    setSelectedPlaylist(pl);
    setShowCreate(false);
  };

  // 從播放清單中選曲
  const handleSelectSongFromPlaylist = (song: ClientSong) => {
    setCurrentSong(song as Parameters<typeof setCurrentSong>[0]);
  };

  // 返回播放清單列表
  const handleBack = () => {
    setSelectedPlaylist(null);
    setEditingName(null);
  };

  // 重命名
  const [editingName, setEditingName] = useState<string | null>(null);
  const handleRename = async () => {
    if (!selectedPlaylist || editingName === null || !editingName.trim()) return;
    try {
      const updated = await updatePlaylist(selectedPlaylist.id, { name: editingName.trim() });
      setSelectedPlaylist(updated);
      setEditingName(null);
      await loadPlaylists();
    } catch (err) {
      console.error("重命名播放清單失敗:", err);
    }
  };

  // 刪除
  const handleDeletePlaylist = async () => {
    if (!selectedPlaylist || !confirm("確定要刪除此播放清單嗎？")) return;
    try {
      await deletePlaylist(selectedPlaylist.id);
      setSelectedPlaylist(null);
      await loadPlaylists();
    } catch (err) {
      console.error("刪除播放清單失敗:", err);
    }
  };

  // ── 播放清單歌曲詳情畫面 ──
  if (selectedPlaylist) {
    const playlistSongs = selectedPlaylist.songIds
      .map((id) => allSongs.find((s) => s.id === id))
      .filter((s): s is ClientSong => s !== undefined);

    return (
      <>
        {/* 返回 + 標題 + 操作 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2D35] shrink-0">
          <button
            onClick={handleBack}
            className="text-[#6B7280] hover:text-[#E4E7EB] transition-colors p-1"
            type="button"
            title="返回播放清單"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            {editingName !== null ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleRename}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") setEditingName(null);
                }}
                className="w-full px-1 py-0.5 bg-[#090A0C] border border-primary/50 text-[13px] text-[#E4E7EB] focus:outline-none font-body rounded-none"
                autoFocus
              />
            ) : (
              <p
                className="text-[13px] font-semibold text-[#E4E7EB] truncate cursor-pointer hover:text-primary transition-colors"
                onClick={() => setEditingName(selectedPlaylist.name)}
                title="點擊重命名"
              >
                {selectedPlaylist.name}
              </p>
            )}
            <p className="text-[10px] font-mono text-[#6B7280]">{playlistSongs.length} TRACKS</p>
          </div>
          <button
            onClick={handleDeletePlaylist}
            className="text-[#6B7280] hover:text-red-400 transition-colors p-1 shrink-0"
            type="button"
            title="刪除播放清單"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>

        {/* 歌曲列表 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {playlistSongs.length === 0 ? (
            <div className="p-4 text-center text-[12px] text-[#6B7280] font-mono">
              NO SONGS FOUND
            </div>
          ) : (
            playlistSongs.map((song, idx) => {
              const isActive = currentSong?.id === song.id;
              return (
                <div
                  key={song.id}
                  onClick={() => handleSelectSongFromPlaylist(song)}
                  className={`group flex items-center gap-3 px-4 py-2.5 border-b border-[#2A2D35]/50 cursor-pointer transition-colors ${
                    isActive
                      ? "bg-[#16181D] text-[#E4E7EB] border-l-2 border-l-primary relative"
                      : "hover:bg-[#16181D]/50 text-[#6B7280] hover:text-[#E4E7EB]"
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-y-0 left-0 w-full bg-primary/5 pointer-events-none" />
                  )}
                  <span className="font-mono text-[11px] w-5 shrink-0 text-right">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  {isActive ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-primary shrink-0">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6B7280] shrink-0">
                      <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                    </svg>
                  )}
                  <div className="flex-1 min-w-0 relative z-10">
                    <p className={`truncate text-[13px] ${isActive ? "font-semibold" : ""}`}>{song.title}</p>
                    {song.artist && <p className="text-[11px] text-[#6B7280] truncate">{song.artist}</p>}
                  </div>
                  <span className="font-mono text-[10px] text-[#6B7280] shrink-0">{song.lyrics.length}L</span>
                </div>
              );
            })
          )}
        </div>
      </>
    );
  }

  // ── 建立播放清單畫面 ──
  if (showCreate) {
    return (
      <>
        {/* 返回 + 標題 */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2A2D35] shrink-0">
          <button
            onClick={() => { setShowCreate(false); setSelectedSongIds(new Set()); }}
            className="text-[#6B7280] hover:text-[#E4E7EB] transition-colors p-1"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-[13px] font-semibold text-[#E4E7EB]">新增播放清單</span>
        </div>

        {/* 名稱輸入 */}
        <div className="px-3 py-2 border-b border-[#2A2D35] shrink-0">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="播放清單名稱..."
            className="w-full px-3 py-1.5 bg-[#090A0C] border border-[#2A2D35] text-[13px] text-[#E4E7EB] placeholder:text-[#6B7280] focus:outline-none focus:border-primary/50 transition-colors font-body rounded-none"
            autoFocus
          />
        </div>

        {/* 選擇歌曲提示 */}
        <div className="px-3 py-1.5 border-b border-[#2A2D35] shrink-0">
          <span className="text-[10px] font-mono text-[#6B7280]">
            選擇歌曲 ({selectedSongIds.size} SELECTED)
          </span>
        </div>

        {/* 歌曲多選列表 */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {allSongs.map((song) => {
            const isSelected = selectedSongIds.has(song.id);
            return (
              <div
                key={song.id}
                onClick={() => toggleSongSelection(song.id)}
                className={`flex items-center gap-3 px-4 py-2 border-b border-[#2A2D35]/50 cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-[#E4E7EB]"
                    : "hover:bg-[#16181D]/50 text-[#6B7280] hover:text-[#E4E7EB]"
                }`}
              >
                <div className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-primary border-primary" : "border-[#2A2D35]"
                }`}>
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#090A0C" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px]">{song.title}</p>
                  {song.artist && <p className="text-[11px] text-[#6B7280] truncate">{song.artist}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {/* 建立按鈕 */}
        <div className="p-3 border-t border-[#2A2D35] shrink-0">
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim() || selectedSongIds.size === 0}
            className="w-full py-2 bg-primary text-[#090A0C] font-mono text-[12px] tracking-wider disabled:opacity-30 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
            type="button"
          >
            {creating ? "CREATING..." : "CREATE PLAYLIST"}
          </button>
        </div>
      </>
    );
  }

  // ── 播放清單列表主畫面 ──
  return (
    <>
      {/* 標題列 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2D35] shrink-0">
        <span className="text-[11px] font-mono text-[#6B7280]">{playlists.length} LISTS</span>
        <button
          onClick={() => setShowCreate(true)}
          className="text-[#6B7280] hover:text-[#E4E7EB] transition-colors"
          type="button"
          title="新增播放清單"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* 播放清單列表 */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="p-4 text-center text-[12px] text-[#6B7280] font-mono">LOADING...</div>
        ) : playlists.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-[#2A2D35]">
              <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
            </svg>
            <p className="font-mono text-[12px] text-[#6B7280]">NO PLAYLISTS</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-[11px] font-mono text-primary hover:text-primary/80 transition-colors"
              type="button"
            >
              + CREATE FIRST
            </button>
          </div>
        ) : (
          playlists.map((pl) => (
            <div
              key={pl.id}
              onClick={() => handleSelectPlaylist(pl)}
              className="group flex items-center gap-3 px-4 py-3 border-b border-[#2A2D35]/50 cursor-pointer transition-colors hover:bg-[#16181D]/50 text-[#6B7280] hover:text-[#E4E7EB]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[13px]">{pl.name}</p>
                <p className="text-[10px] font-mono text-[#6B7280]">{pl.songIds.length} tracks</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))
        )}
      </div>
    </>
  );
}

// ============================================================================
// 中欄：Cue Grid（歌詞 + 點擊跳轉 + Transport）
// ============================================================================

function CueGrid() {
  const lyrics = useLyricsStore((state) => state.lyrics);
  const currentIndex = useLyricsStore((state) => state.currentIndex);
  const jumpToLine = useLyricsStore((state) => state.jumpToLine);
  const currentSong = useLyricsStore((state) => state.currentSong);
  const displaySettings = useLyricsStore((state) => state.displaySettings);
  const nextLine = useLyricsStore((state) => state.nextLine);
  const prevLine = useLyricsStore((state) => state.prevLine);

  const activeLineRef = useRef<HTMLDivElement>(null);
  const totalLines = lyrics.length;
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < totalLines - 1;

  // 自動滾動到當前行
  useEffect(() => {
    if (activeLineRef.current && displaySettings.autoScroll) {
      activeLineRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentIndex, displaySettings.autoScroll]);

  // 鍵盤快捷鍵
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (canGoPrev) prevLine();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        if (canGoNext) nextLine();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canGoPrev, canGoNext, prevLine, nextLine]);

  if (!currentSong || totalLines === 0) {
    return (
      <div className="h-full flex flex-col bg-[#090A0C] relative">
        <div className="flex items-center px-4 py-3 border-b border-[#2A2D35] bg-[#16181D] shrink-0">
          <div className="w-14 font-mono text-[11px] text-[#6B7280] uppercase">Line</div>
          <div className="flex-1 font-mono text-[11px] text-[#6B7280] uppercase pl-3">Lyric Payload</div>
          <div className="w-14 font-mono text-[11px] text-[#6B7280] uppercase text-right">Action</div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto text-[#2A2D35]">
              <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
            </svg>
            <p className="font-mono text-[13px] text-[#6B7280] tracking-wider uppercase">
              No Track Selected
            </p>
            <p className="font-mono text-[11px] text-[#2A2D35]">
              Select a track from the library to begin
            </p>
          </div>
        </div>
        <div className="p-3 border-t border-[#2A2D35] shrink-0">
          <div className="w-full h-10 bg-[#16181D] border border-[#2A2D35] flex items-center justify-center text-[#2A2D35] font-mono text-[13px] tracking-widest">
            [ SPACE ] — GO TO NEXT CUE
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#090A0C] relative">
      {/* Cue Grid Header */}
      <div className="flex items-center px-4 py-3 border-b border-[#2A2D35] bg-[#16181D] shrink-0">
        <div className="w-14 font-mono text-[11px] text-[#6B7280] uppercase">Line</div>
        <div className="flex-1 font-mono text-[11px] text-[#6B7280] uppercase pl-3">Lyric Payload</div>
        <div className="w-14 font-mono text-[11px] text-[#6B7280] uppercase text-right">Action</div>
      </div>

      {/* Cue Grid Body */}
      <div className="flex-1 overflow-y-auto pb-20 min-h-0">
        {lyrics.map((line, idx) => {
          const isActive = idx === currentIndex;
          const isPast = idx < currentIndex;
          const isNext = idx === currentIndex + 1;

          if (isActive) {
            return (
              <div
                key={idx}
                ref={activeLineRef}
                onClick={() => jumpToLine(idx)}
                className="flex items-center px-4 py-3.5 bg-[#16181D] border-y border-primary/30 relative cursor-pointer"
                style={{ boxShadow: "inset 4px 0 0 0 var(--color-primary, #00D9FF)" }}
              >
                <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                <div className="w-14 font-mono text-[13px] text-primary flex items-center gap-1.5 relative z-10">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  {String(idx + 1).padStart(2, "0")}
                </div>
                <div
                  className="flex-1 pl-3 text-[16px] font-bold tracking-wide relative z-10"
                  style={{ color: displaySettings.highlightColor, fontFamily: "'Noto Sans TC', 'Exo 2', sans-serif" }}
                >
                  {line || "(空行)"}
                </div>
                <div className="w-14 text-right relative z-10">
                  <span className="text-[9px] font-mono border border-primary text-primary px-1.5 py-0.5 bg-primary/10">
                    LIVE
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={idx}
              onClick={() => jumpToLine(idx)}
              className={`group flex items-center px-4 py-2.5 border-b border-[#2A2D35]/30 cursor-crosshair transition-colors ${
                isNext
                  ? "bg-[#16181D]/30 hover:bg-[#16181D]/80"
                  : "hover:bg-[#16181D]/50"
              }`}
            >
              <div className={`w-14 font-mono text-[13px] ${isPast ? "text-[#6B7280]" : isNext ? "text-[#E4E7EB]" : "text-[#6B7280]"}`}>
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div
                className={`flex-1 pl-3 text-[14px] ${isPast ? "text-[#6B7280]" : isNext ? "text-[#E4E7EB]" : "text-[#6B7280]"}`}
                style={{ fontFamily: "'Noto Sans TC', 'Exo 2', sans-serif" }}
              >
                {line || "(空行)"}
              </div>
              <div className="w-14 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[9px] font-mono border border-[#2A2D35] text-[#6B7280] px-1.5 py-0.5 bg-[#090A0C]">
                  JUMP
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transport Controls (Fixed Bottom) */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-[#090A0C] border-t border-[#2A2D35]">
        <div className="flex items-center gap-3 mb-2 px-1">
          <span className="font-mono text-[11px] text-primary font-semibold">
            {String(currentIndex + 1).padStart(2, "0")}
          </span>
          <div className="flex-1 h-[2px] bg-[#2A2D35] relative">
            <div
              className="absolute inset-y-0 left-0 bg-primary transition-all duration-200"
              style={{ width: `${((currentIndex + 1) / totalLines) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-[#6B7280]">
            {String(totalLines).padStart(2, "0")}
          </span>
        </div>
        <button
          onClick={() => { if (canGoNext) nextLine(); }}
          disabled={!canGoNext}
          className="w-full h-10 bg-[#16181D] border border-primary text-primary font-mono text-[13px] tracking-widest flex items-center justify-center gap-2 hover:bg-primary hover:text-[#090A0C] transition-colors active:scale-[0.99] disabled:opacity-30 disabled:hover:bg-[#16181D] disabled:hover:text-primary disabled:cursor-not-allowed"
          type="button"
        >
          [ SPACE ] — GO TO NEXT CUE
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 右上：即時預覽（模擬 Display 端的實際輸出）
// ============================================================================

function LivePreview() {
  const lyrics = useLyricsStore((state) => state.lyrics);
  const currentIndex = useLyricsStore((state) => state.currentIndex);
  const currentSong = useLyricsStore((state) => state.currentSong);
  const displaySettings = useLyricsStore((state) => state.displaySettings);

  // 模擬 Display 端的可見行計算邏輯（同 LyricsDisplay.tsx）
  const visibleLines = useMemo(() => {
    if (lyrics.length === 0) return [];
    const { displayLines } = displaySettings;
    // 前瞻偏移：與 LyricsDisplay 同步
    const prevLines = Math.floor(displayLines / 3);
    let startIdx = Math.max(0, currentIndex - prevLines);
    const endIdx = Math.min(lyrics.length, startIdx + displayLines);
    if (endIdx - startIdx < displayLines) {
      startIdx = Math.max(0, endIdx - displayLines);
    }
    return lyrics.slice(startIdx, endIdx).map((text, i) => ({
      text,
      isActive: startIdx + i === currentIndex,
    }));
  }, [lyrics, currentIndex, displaySettings]);

  // 預覽容器的背景色
  const previewBg = displaySettings.showBackground
    ? displaySettings.backgroundColor
    : "#000000";

  return (
    <div className="h-full flex flex-col border-b border-[#2A2D35] bg-[#090A0C]">
      {/* 標題 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2D35] bg-[#16181D] shrink-0">
        <h3 className="text-[11px] font-mono tracking-wider text-[#6B7280] uppercase">
          Program Out
        </h3>
        <div className="flex items-center gap-2">
          {currentSong && (
            <span className="bg-red-600 text-white text-[9px] font-mono px-1.5 py-0.5">LIVE</span>
          )}
          <span className="text-[11px] font-mono text-primary">Preview</span>
        </div>
      </div>

      {/* 16:9 預覽區 — 精確模擬 Display 端 */}
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        <div
          className="w-full aspect-video max-h-full border border-[#2A2D35] relative overflow-hidden flex flex-col items-center justify-center"
          style={{ backgroundColor: previewBg }}
        >
          {/* Safe Area 導引線 */}
          <div className="absolute inset-[5%] border border-white/5 pointer-events-none" />

          {currentSong && visibleLines.length > 0 ? (
            <div className="flex flex-col items-center justify-center gap-1 px-[10%] w-full">
              {visibleLines.map((item, i) => (
                <p
                  key={i}
                  className="text-center leading-tight transition-all duration-300"
                  style={{
                    fontSize: `clamp(10px, 2.5vw, ${Math.round(displaySettings.fontSize * 0.45)}px)`,
                    color: item.isActive ? displaySettings.highlightColor : displaySettings.textColor,
                    opacity: item.isActive ? 1 : 0.4,
                    transform: item.isActive ? "scale(1.05)" : "scale(1)",
                    fontWeight: item.isActive ? 700 : 400,
                    textShadow: item.isActive
                      ? `0 0 12px ${displaySettings.highlightColor}40, 0 0 24px ${displaySettings.highlightColor}20`
                      : "none",
                    fontFamily: "'Noto Sans TC', 'Exo 2', sans-serif",
                  }}
                >
                  {item.text || "\u00A0"}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[12px] text-[#2A2D35] font-mono">NO SIGNAL</p>
          )}

          {/* 角標 */}
          <div className="absolute top-2 left-2 text-[9px] font-mono text-[#6B7280]/50">
            {displaySettings.displayLines}L / {displaySettings.fontSize}px
          </div>
          <div className="absolute bottom-2 right-2 text-[9px] font-mono text-[#6B7280]/50">
            CH 1
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 右下：快速設定
// ============================================================================

const HIGHLIGHT_COLORS = [
  { value: "#00D9FF", label: "Cyan" },
  { value: "#A855F7", label: "Purple" },
  { value: "#00FF88", label: "Green" },
  { value: "#FF3366", label: "Pink" },
  { value: "#FFB800", label: "Gold" },
  { value: "#FF6B00", label: "Orange" },
] as const;

function QuickSettings() {
  const displaySettings = useLyricsStore((state) => state.displaySettings);
  const updateDisplaySettings = useLyricsStore((state) => state.updateDisplaySettings);

  return (
    <div className="h-full flex flex-col bg-[#16181D]">
      {/* 標題 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#2A2D35] bg-[#16181D] shrink-0">
        <h3 className="text-[11px] font-mono tracking-wider text-[#6B7280] uppercase">
          Display Config
        </h3>
      </div>

      {/* 設定內容 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {/* 顯示行數 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-[#6B7280] uppercase">Lines</span>
            <span className="text-[11px] font-mono text-primary">{displaySettings.displayLines}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={displaySettings.displayLines}
            onChange={(e) => updateDisplaySettings({ displayLines: parseInt(e.target.value, 10) })}
            className="w-full h-[2px] bg-[#2A2D35] accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-none"
          />
        </div>

        {/* 字體大小 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono text-[#6B7280] uppercase">Font Size</span>
            <span className="text-[11px] font-mono text-primary">{displaySettings.fontSize}px</span>
          </div>
          <input
            type="range"
            min={16}
            max={64}
            step={2}
            value={displaySettings.fontSize}
            onChange={(e) => updateDisplaySettings({ fontSize: parseInt(e.target.value, 10) })}
            className="w-full h-[2px] bg-[#2A2D35] accent-primary cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-none"
          />
        </div>

        {/* 高亮色 */}
        <div>
          <span className="block text-[11px] font-mono text-[#6B7280] uppercase mb-1.5">
            Highlight
          </span>
          <div className="grid grid-cols-6 gap-1.5">
            {HIGHLIGHT_COLORS.map((color) => (
              <button
                key={color.value}
                onClick={() => updateDisplaySettings({ highlightColor: color.value })}
                className={`w-full aspect-square border transition-all ${
                  displaySettings.highlightColor === color.value
                    ? "border-[#E4E7EB] scale-110"
                    : "border-[#2A2D35] opacity-70 hover:opacity-100 hover:border-[#6B7280]"
                }`}
                style={{ backgroundColor: color.value }}
                type="button"
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* 主題 */}
        <div>
          <span className="block text-[11px] font-mono text-[#6B7280] uppercase mb-1.5">
            Theme
          </span>
          <div className="flex gap-1.5">
            {(["dark", "light"] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => updateDisplaySettings({ theme })}
                className={`flex-1 py-1.5 text-[11px] font-mono transition-colors border ${
                  displaySettings.theme === theme
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-[#090A0C] text-[#6B7280] border-[#2A2D35] hover:border-[#6B7280]"
                }`}
                type="button"
              >
                {theme === "dark" ? "DARK" : "LIGHT"}
              </button>
            ))}
          </div>
        </div>

        {/* 開關選項 */}
        <div className="space-y-0.5">
          <ToggleRow
            label="BACKGROUND"
            checked={displaySettings.showBackground}
            onChange={(v) => updateDisplaySettings({ showBackground: v })}
          />
          <ToggleRow
            label="AUTO SCROLL"
            checked={displaySettings.autoScroll}
            onChange={(v) => updateDisplaySettings({ autoScroll: v })}
          />
          <ToggleRow
            label="ANIMATION"
            checked={displaySettings.enableAnimation}
            onChange={(v) => updateDisplaySettings({ enableAnimation: v })}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-[#2A2D35] grid grid-cols-2 gap-1.5 shrink-0">
        <button
          onClick={() => {
            useLyricsStore.getState().disconnect();
            useLyricsStore.getState().connect();
          }}
          className="bg-[#090A0C] border border-[#2A2D35] p-2 text-[10px] font-mono text-[#6B7280] hover:text-[#E4E7EB] hover:bg-[#16181D]/50 text-center transition-colors"
          type="button"
        >
          RESTART WS
        </button>
        <button
          onClick={() => useLyricsStore.getState().setCurrentSong(null)}
          className="bg-[#090A0C] border border-[#2A2D35] p-2 text-[10px] font-mono text-[#6B7280] hover:text-[#E4E7EB] hover:bg-[#16181D]/50 text-center transition-colors"
          type="button"
        >
          BLACKOUT
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// 共用小元件
// ============================================================================

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(!checked); } }}
      className="flex items-center justify-between py-2 cursor-pointer group border-b border-[#2A2D35]/30"
    >
      <span className="text-[11px] font-mono text-[#6B7280] group-hover:text-[#E4E7EB] transition-colors">
        {label}
      </span>
      <div
        className={`w-8 h-4 transition-colors flex items-center border ${
          checked ? "bg-primary/20 border-primary/40" : "bg-[#090A0C] border-[#2A2D35]"
        }`}
      >
        <div
          className={`w-3 h-3 transition-all ${
            checked ? "translate-x-[18px] bg-primary" : "translate-x-[1px] bg-[#6B7280]"
          }`}
        />
      </div>
    </div>
  );
}
