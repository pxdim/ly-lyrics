"use client";

import type { FC, ReactNode } from "react";

interface AuthLayoutProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * 登入/註冊頁面的共用佈局元件
 * 提供品牌 Logo、標題、玻璃卡片容器與可選的頁腳區域
 */
export const AuthLayout: FC<AuthLayoutProps> = ({
  title,
  children,
  footer,
}) => (
  <main className="min-h-screen flex items-center justify-center p-4 bg-void text-text-primary relative overflow-hidden">
    {/* 背景漸層效果 */}
    <div className="absolute inset-0 bg-gradient-radial from-primary/5 via-transparent to-transparent opacity-50" />

    <div className="w-full max-w-md relative z-10">
      {/* Logo 與標題 */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-heading font-bold tracking-wider">
          <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            LY
          </span>
        </h1>
        <p className="mt-2 font-body text-text-muted">{title}</p>
      </div>

      {/* 玻璃卡片容器 */}
      <div className="glass-card p-8 animate-scale-in">
        {children}
        {footer && (
          <div className="mt-6 text-center text-sm font-body text-text-muted">
            {footer}
          </div>
        )}
      </div>
    </div>
  </main>
);
