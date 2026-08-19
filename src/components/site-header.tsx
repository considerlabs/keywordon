"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/analyze", label: "키워드 분석" },
  { href: "/bulk", label: "대량 조회" },
  { href: "/discover", label: "발굴" },
  { href: "/blog", label: "블로그" },
  { href: "/site", label: "사이트" },
  { href: "/copilot", label: "AI" },
  { href: "/shop", label: "플랜" },
];

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)]/80 bg-[var(--surface)]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-white shadow-[0_8px_20px_rgba(13,115,119,0.35)] transition group-hover:scale-105">
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--ink)]">
            Keyword<span className="text-[var(--brand)]">On</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-2.5 py-2 text-sm font-medium transition",
                  active
                    ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                    : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {clerkEnabled ? (
            <Show
              when="signed-in"
              fallback={
                <SignInButton mode="modal">
                  <button className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand)]">
                    로그인
                  </button>
                </SignInButton>
              }
            >
              <UserButton />
            </Show>
          ) : (
            <Link
              href="/shop"
              className="rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand)]"
            >
              플랜 보기
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}