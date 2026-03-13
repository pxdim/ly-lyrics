import type { Metadata } from "next";
import { Orbitron, Exo_2, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Error Handling Components
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import { StoreHydration } from "@/components/StoreHydration";

// Dark Tech Theme Fonts
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["500", "600", "700"],
});

const exo2 = Exo_2({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "LY - 歌詞顯示系統",
  description: "市場首創的 AI 驅動歌詞顯示系統，支援即時聽歌辨識、多裝置同步、NDI 輸出到 VJ 軟體",
  keywords: ["歌詞顯示", "AI 歌詞辨識", "NDI 輸出", "Resolume", "歌詞同步"],
  authors: [{ name: "LY Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" className="dark" suppressHydrationWarning>
      <body
        className={`${orbitron.variable} ${exo2.variable} ${jetbrainsMono.variable} font-body bg-void text-text-primary antialiased`}
      >
        <StoreHydration />
        <ErrorBoundary>
          <ToastProvider>
            <ClientErrorWrapper>{children}</ClientErrorWrapper>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

// Client component wrapper for error handling
// Separated to enable "use client" directive
// This file is split to avoid "use client" affecting the entire layout
import { ClientErrorWrapper } from "./layout-client";
