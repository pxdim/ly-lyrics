import Link from "next/link";
import { Mic, Smartphone, Video } from "lucide-react";

/**
 * Home Page - Landing Page
 * Design System v2.0 - Dark Tech Edition
 */

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-void text-text-primary relative overflow-hidden">
      {/* 背景效果 */}
      <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50" />
      <div className="absolute inset-0 bg-scanlines opacity-30 pointer-events-none" />

      {/* 背景光暈 */}
      <div className="glow-orb-primary" style={{ top: '-10%', left: '-5%' }} />
      <div className="glow-orb-secondary" style={{ bottom: '-10%', right: '-5%' }} />

      {/* 主內容區間距響應式 */}
      <div className="max-w-5xl w-full text-center space-y-8 sm:space-y-10 md:space-y-12 relative z-10">
        {/* Logo/Title */}
        <div className="space-y-6">
          {/* 標題響應式：手機 text-4xl → sm text-6xl → md text-8xl */}
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-heading font-bold tracking-wider focus-glow">
            <span className="inline-block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent animate-glow">
              LY
            </span>
          </h1>
          {/* 副標題響應式：手機 text-lg → sm text-xl → md text-2xl */}
          <p className="text-lg sm:text-xl md:text-2xl font-body text-text-muted tracking-wide">
            歌詞顯示系統
          </p>
          {/* Logo 裝飾線響應式：手機縮短 */}
          <div className="w-20 sm:w-28 md:w-32 h-1 mx-auto bg-gradient-to-r from-primary to-secondary rounded-full shadow-glow-md" />
        </div>

        {/* Tagline */}
        <p className="text-lg text-text-muted max-w-2xl mx-auto font-body leading-relaxed">
          市場首創的 AI 驅動歌詞顯示系統<br />
          <span className="text-primary">即時聽歌辨識</span> · <span className="text-secondary">多裝置同步</span> · <span className="text-secondary">NDI 輸出</span>
        </p>

        {/* Features Grid — 交錯入場動畫 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="animate-slide-in stagger-1 opacity-0 fill-mode-forwards">
            <FeatureCard
              icon={<Mic className="w-8 h-8" strokeWidth={1.5} />}
              title="AI 聽歌辨識"
              description="即時識別播放中的歌詞並自動跳轉"
              color="primary"
            />
          </div>
          <div className="animate-slide-in stagger-2 opacity-0 fill-mode-forwards">
            <FeatureCard
              icon={<Smartphone className="w-8 h-8" strokeWidth={1.5} />}
              title="多裝置同步"
              description="控制端與多個顯示端即時同步"
              color="secondary"
            />
          </div>
          <div className="animate-slide-in stagger-3 opacity-0 fill-mode-forwards">
            <FeatureCard
              icon={<Video className="w-8 h-8" strokeWidth={1.5} />}
              title="NDI 輸出"
              description="直接輸出到 Resolume Arena"
              color="secondary"
            />
          </div>
        </div>

        {/* Mode Selection */}
        <div className="flex flex-col sm:flex-row gap-6 justify-center mt-16">
          <Link
            href="/controller"
            className="group relative px-10 py-4 bg-gradient-primary text-void rounded-xl font-heading font-semibold text-lg tracking-wider uppercase transition-all duration-[var(--duration-fast)] hover:shadow-glow-lg hover:-translate-y-1"
          >
            控制端
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-[var(--duration-fast)]" />
          </Link>
          <Link
            href="/display"
            className="group relative px-10 py-4 bg-gradient-secondary text-void rounded-xl font-heading font-semibold text-lg tracking-wider uppercase transition-all duration-[var(--duration-fast)] hover:shadow-glow-secondary hover:-translate-y-1"
          >
            顯示端
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-secondary via-primary to-secondary opacity-0 group-hover:opacity-20 transition-opacity duration-[var(--duration-fast)]" />
          </Link>
        </div>

        {/* Status Badge */}
        <div className="mt-12 inline-flex items-center gap-3 px-6 py-3 bg-elevated border border-border-dim rounded-full shadow-inner-glow">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-success shadow-glow-secondary"></span>
          </span>
          <span className="font-body font-medium text-success">系統準備就緒</span>
        </div>
      </div>
    </main>
  );
}

/**
 * Feature Card Component
 */
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "primary" | "secondary";
}

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  const colorStyles = {
    primary: "group-hover:border-primary/50 group-hover:shadow-glow-md",
    secondary: "group-hover:border-secondary/50 group-hover:shadow-glow-secondary",
  };

  const iconColors = {
    primary: "text-primary",
    secondary: "text-secondary",
  };

  return (
    <div className={`group p-5 md:p-8 bg-elevated border border-border-dim rounded-2xl transition-all duration-300 hover:-translate-y-1 ${colorStyles[color]}`}>
      <div className={`inline-flex p-3 rounded-xl bg-void border border-border-dim mb-4 ${iconColors[color]}`}>
        {icon}
      </div>
      <h3 className="font-heading font-semibold text-xl mb-3 text-text-primary">
        {title}
      </h3>
      <p className="font-body text-sm text-text-muted leading-relaxed">
        {description}
      </p>
    </div>
  );
}
