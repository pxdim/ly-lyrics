import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Logo/Title */}
        <div className="space-y-4">
          <h1 className="text-7xl font-bold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
            LY
          </h1>
          <p className="text-xl text-muted-foreground">
            歌詞顯示系統
          </p>
        </div>

        {/* Tagline */}
        <p className="text-lg text-foreground/80 max-w-2xl mx-auto">
          市場首創的 AI 驅動歌詞顯示系統，支援即時聽歌辨識、多裝置同步、NDI 輸出到 VJ 軟體
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl mb-3">🎤</div>
            <h3 className="font-semibold text-lg mb-2">AI 聽歌辨識</h3>
            <p className="text-sm text-muted-foreground">即時識別播放中的歌詞並自動跳轉</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl mb-3">📱</div>
            <h3 className="font-semibold text-lg mb-2">多裝置同步</h3>
            <p className="text-sm text-muted-foreground">控制端與多個顯示端即時同步</p>
          </div>
          <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <div className="text-3xl mb-3">🎬</div>
            <h3 className="font-semibold text-lg mb-2">NDI 輸出</h3>
            <p className="text-sm text-muted-foreground">直接輸出到 Resolume Arena</p>
          </div>
        </div>

        {/* Mode Selection */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <Link
            href="/controller"
            className="px-8 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors shadow-lg"
          >
            控制端
          </Link>
          <Link
            href="/display"
            className="px-8 py-4 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors shadow-lg"
          >
            顯示端
          </Link>
        </div>

        {/* Status Badge */}
        <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </span>
          準備就緒
        </div>
      </div>
    </main>
  );
}
