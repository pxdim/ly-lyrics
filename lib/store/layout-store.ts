/**
 * Layout Store — 可拖曳卡片佈局狀態管理
 *
 * 管理 Controller 頁面的 react-grid-layout 佈局配置，
 * 支援預設模板（standard / focus / full / minimal）、
 * 自訂佈局、鎖定切換，並透過 Zustand persist 持久化至 localStorage。
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ============================================================================
// 卡片 ID 常數
// ============================================================================

export const CARD_IDS = {
  SONGS: "songs",
  CUES: "cues",
  PREVIEW: "preview",
  CONFIG: "config",
  AI: "ai",
  PLAYLIST: "playlist",
  TRANSPORT: "transport",
  CONNECTION: "connection",
} as const;

// ============================================================================
// 型別定義
// ============================================================================

/** 單一卡片的佈局項目 */
export interface LayoutItem {
  /** 卡片唯一識別符 */
  i: string;
  /** 格線 X 座標 */
  x: number;
  /** 格線 Y 座標 */
  y: number;
  /** 格線寬度（12 欄制） */
  w: number;
  /** 格線高度 */
  h: number;
  /** 最小寬度限制 */
  minW?: number;
  /** 最小高度限制 */
  minH?: number;
}

/** 各斷點的佈局集合 */
export interface Layouts {
  lg: LayoutItem[];
  [key: string]: LayoutItem[];
}

// ============================================================================
// 預設佈局模板
// ============================================================================

/** 標準佈局（作為預設初始值獨立常數，避免 TS index access 產生 undefined） */
const STANDARD_LAYOUT: Layouts = {
  lg: [
    { i: "songs", x: 0, y: 0, w: 3, h: 6, minW: 2, minH: 3 },
    { i: "cues", x: 3, y: 0, w: 6, h: 6, minW: 4, minH: 4 },
    { i: "preview", x: 9, y: 0, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "config", x: 9, y: 3, w: 3, h: 3, minW: 2, minH: 2 },
    { i: "ai", x: 0, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: "playlist", x: 3, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
    { i: "transport", x: 6, y: 6, w: 3, h: 2, minW: 3, minH: 2 },
    { i: "connection", x: 9, y: 6, w: 3, h: 2, minW: 2, minH: 2 },
  ],
};

const PRESET_LAYOUTS: Record<string, Layouts> = {
  /** 標準佈局：歌曲列表 + Cue 格線 + 預覽 + 設定，底部輔助面板 */
  standard: STANDARD_LAYOUT,
  /** 專注佈局：最大化 Cue 格線區域，隱藏輔助面板 */
  focus: {
    lg: [
      { i: "songs", x: 0, y: 0, w: 2, h: 8, minW: 2, minH: 3 },
      { i: "cues", x: 2, y: 0, w: 7, h: 8, minW: 4, minH: 4 },
      { i: "preview", x: 9, y: 0, w: 3, h: 4, minW: 2, minH: 2 },
      { i: "config", x: 9, y: 4, w: 3, h: 4, minW: 2, minH: 2 },
      { i: "ai", x: 0, y: 0, w: 0, h: 0 },
      { i: "playlist", x: 0, y: 0, w: 0, h: 0 },
      { i: "transport", x: 0, y: 0, w: 0, h: 0 },
      { i: "connection", x: 0, y: 0, w: 0, h: 0 },
    ],
  },
  /** 全功能佈局：所有面板均可見且較大 */
  full: {
    lg: [
      { i: "songs", x: 0, y: 0, w: 3, h: 5, minW: 2, minH: 3 },
      { i: "cues", x: 3, y: 0, w: 5, h: 5, minW: 4, minH: 4 },
      { i: "preview", x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
      { i: "config", x: 8, y: 3, w: 4, h: 2, minW: 2, minH: 2 },
      { i: "ai", x: 0, y: 5, w: 3, h: 3, minW: 2, minH: 2 },
      { i: "playlist", x: 3, y: 5, w: 3, h: 3, minW: 2, minH: 2 },
      { i: "transport", x: 6, y: 5, w: 3, h: 3, minW: 3, minH: 2 },
      { i: "connection", x: 9, y: 5, w: 3, h: 3, minW: 2, minH: 2 },
    ],
  },
  /** 極簡佈局：僅歌曲列表 + Cue 格線 */
  minimal: {
    lg: [
      { i: "songs", x: 0, y: 0, w: 4, h: 8, minW: 2, minH: 3 },
      { i: "cues", x: 4, y: 0, w: 8, h: 8, minW: 4, minH: 4 },
      { i: "preview", x: 0, y: 0, w: 0, h: 0 },
      { i: "config", x: 0, y: 0, w: 0, h: 0 },
      { i: "ai", x: 0, y: 0, w: 0, h: 0 },
      { i: "playlist", x: 0, y: 0, w: 0, h: 0 },
      { i: "transport", x: 0, y: 0, w: 0, h: 0 },
      { i: "connection", x: 0, y: 0, w: 0, h: 0 },
    ],
  },
};

// ============================================================================
// Store 型別
// ============================================================================

interface LayoutState {
  /** 各斷點的佈局配置 */
  layouts: Layouts;
  /** 是否鎖定佈局（鎖定時不可拖曳/調整大小） */
  isLocked: boolean;
  /** 目前使用的預設模板名稱，使用者自訂拖曳後為 "custom" */
  currentPreset: string;
  /** 更新佈局，同時將 currentPreset 設為 "custom" */
  setLayouts: (layouts: Layouts) => void;
  /** 切換佈局鎖定狀態 */
  toggleLock: () => void;
  /** 套用預設佈局模板，未知名稱回退至 standard */
  applyPreset: (preset: string) => void;
}

// ============================================================================
// Store 建立
// ============================================================================

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      layouts: STANDARD_LAYOUT,
      isLocked: false,
      currentPreset: "standard",

      setLayouts: (layouts) => set({ layouts, currentPreset: "custom" }),

      toggleLock: () => set((state) => ({ isLocked: !state.isLocked })),

      applyPreset: (preset) => {
        const resolvedLayouts =
          PRESET_LAYOUTS[preset] ?? STANDARD_LAYOUT;
        const resolvedPreset =
          preset in PRESET_LAYOUTS ? preset : "standard";
        set({
          layouts: resolvedLayouts,
          currentPreset: resolvedPreset,
        });
      },
    }),
    {
      name: "ly-layout",
      partialize: (state) => ({
        layouts: state.layouts,
        isLocked: state.isLocked,
        currentPreset: state.currentPreset,
      }),
    }
  )
);
