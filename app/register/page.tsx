/**
 * 註冊頁面
 *
 * 使用 AuthLayout、GlowInput、GlowButton 共用元件重新設計。
 * 透過 proxy 呼叫 Go backend 註冊，token 由後端設定 HttpOnly cookie。
 * 所有 UI 字串透過 next-intl useTranslations 取得。
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { register } from "@/lib/api/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { GlowInput } from "@/components/ui/GlowInput";
import { GlowButton } from "@/components/ui/GlowButton";

export default function RegisterPage() {
  const router = useRouter();
  const t = useTranslations("auth.register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    // 前端密碼長度驗證
    if (password.length < 6) {
      setError(t("passwordMinLength"));
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name);
      router.push("/controller");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("defaultError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title={t("title")}
      footer={
        <p>
          {t("hasAccount")}{" "}
          <Link
            href="/login"
            className="text-primary hover:text-primary-300 transition-colors duration-[var(--duration-fast)]"
          >
            {t("loginLink")}
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 錯誤訊息 */}
        {error && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-sm font-body animate-shake">
            {error}
          </div>
        )}

        <GlowInput
          label={t("nameLabel")}
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          hint={t("nameHint")}
          disabled={loading}
        />

        <GlowInput
          label={t("emailLabel")}
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t("emailPlaceholder")}
          disabled={loading}
        />

        <GlowInput
          label={t("passwordLabel")}
          id="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("passwordPlaceholder")}
          disabled={loading}
        />

        <GlowButton
          type="submit"
          loading={loading}
          className="w-full"
        >
          {loading ? t("submitting") : t("submitButton")}
        </GlowButton>
      </form>
    </AuthLayout>
  );
}
