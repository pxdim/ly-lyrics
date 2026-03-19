import type { Metadata } from "next";
import { Archivo_Black, Noto_Sans_TC, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";

// Error Handling Components
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ToastProvider } from "@/components/ui/Toast";
import { StoreHydration } from "@/components/StoreHydration";
import { ThemeApplier } from "@/components/ThemeApplier";

// Neon Brutalist Glass 主題字體
const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const notoSansTC = Noto_Sans_TC({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
  weight: ["400", "500", "700", "900"],
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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className={`${archivoBlack.variable} ${notoSansTC.variable} ${jetbrainsMono.variable} font-body bg-void text-text-primary antialiased`}
      >
        <StoreHydration />
        <ThemeApplier />
        <ErrorBoundary>
          <NextIntlClientProvider messages={messages}>
            <ToastProvider>
              <ClientErrorWrapper>{children}</ClientErrorWrapper>
            </ToastProvider>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

// Client component wrapper for error handling
// Separated to enable "use client" directive
// This file is split to avoid "use client" affecting the entire layout
import { ClientErrorWrapper } from "./layout-client";
