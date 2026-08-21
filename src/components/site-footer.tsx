"use client";

import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  return (
    <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-5 py-8 text-sm text-[var(--muted)] md:flex-row md:items-center md:justify-between">
        <p className="font-[family-name:var(--font-display)] font-semibold text-[var(--ink)]">
          KeywordOn
        </p>
        <p>SEO · 콘텐츠 마케팅 · 키워드 발굴 · AI Copilot</p>
      </div>
    </footer>
  );
}
