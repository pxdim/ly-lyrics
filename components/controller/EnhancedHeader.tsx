/**
 * EnhancedHeader -- 控制台增強頂部狀態列
 *
 * 組合 StatusBar + LayoutControls，提供完整的桌面版控制台頂部。
 * StatusBar 提供基礎功能（房間碼、QR Code、連線狀態、裝置計數），
 * LayoutControls 透過 rightSlot 插入佈局模板選擇器與鎖定按鈕。
 *
 * 設計系統：使用 CSS 變數 + Tailwind 語意 class，零硬編碼 hex/rgba。
 */

"use client";

import { type FC } from "react";
import { StatusBar } from "@/components/controller/ControllerHeader";
import { LayoutControls } from "@/components/controller/LayoutControls";

// ============================================================================
// Props 型別
// ============================================================================

interface EnhancedHeaderProps {
  /** 房間碼 */
  sessionCode: string;
  /** 重新產生房間碼回呼 */
  onRegenerate: () => void;
}

// ============================================================================
// 元件
// ============================================================================

export const EnhancedHeader: FC<EnhancedHeaderProps> = ({
  sessionCode,
  onRegenerate,
}) => {
  return (
    <StatusBar
      sessionCode={sessionCode}
      onRegenerate={onRegenerate}
      rightSlot={<LayoutControls />}
    />
  );
};
