import type { ReactNode } from "react";
import Link from "next/link";

export default function ControllerLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="controller-mode min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-bold text-primary-600">
              LY
            </Link>
            <span className="text-sm text-muted-foreground">| 控制端</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link
              href="/controller"
              className="text-sm hover:text-primary-600 transition-colors"
            >
              歌曲
            </Link>
            <Link
              href="/controller/playlists"
              className="text-sm hover:text-primary-600 transition-colors"
            >
              播放列表
            </Link>
            <Link
              href="/controller/settings"
              className="text-sm hover:text-primary-600 transition-colors"
            >
              設定
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto py-4 text-center text-sm text-muted-foreground">
        <p>LY - 歌詞顯示系統 © 2026</p>
      </footer>
    </div>
  );
}
