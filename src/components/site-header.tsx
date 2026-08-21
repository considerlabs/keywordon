"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ChevronDown, Menu, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { isNavActive, TOP_NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export function SiteHeader() {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Navigation changes must close local menus.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenId(null);
    setMobileOpen(false);
  }, [pathname]);

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
          {TOP_NAV.map((group) => {
            const active = group.children
              ? group.children.some((item) => isNavActive(pathname, item.href))
              : group.href
                ? isNavActive(pathname, group.href)
                : false;

            if (group.children) {
              const open = openId === group.id;

              return (
                <div key={group.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : group.id)}
                    aria-expanded={open}
                    aria-haspopup="menu"
                    className={cn(
                      "flex items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium transition",
                      active
                        ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                        : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]",
                    )}
                  >
                    {group.label}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform",
                        open && "rotate-180",
                      )}
                      strokeWidth={2}
                    />
                  </button>
                  {open ? (
                    <div
                      className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg border border-[var(--line)] bg-[var(--panel)] py-1 shadow-lg"
                      role="menu"
                    >
                      {group.children.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          role="menuitem"
                          className={cn(
                            "flex items-center px-3 py-2 text-sm transition",
                            isNavActive(pathname, item.href)
                              ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                              : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]",
                          )}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <Link
                key={group.id}
                href={group.href ?? "/"}
                className={cn(
                  "flex items-center rounded-md px-2.5 py-2 text-sm font-medium transition",
                  active
                    ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                    : "text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]",
                )}
              >
                {group.label}
                {group.badge === "new" ? (
                  <span className="ml-1 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                    New
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            className="rounded-md p-2 text-[var(--muted)] transition hover:bg-black/5 hover:text-[var(--ink)] lg:hidden"
          >
            <span className="sr-only">메뉴 열기</span>
            <Menu className="h-5 w-5" strokeWidth={2} />
          </button>
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
      {mobileOpen ? (
        <nav
          id="mobile-navigation"
          className="border-t border-[var(--line)] bg-[var(--panel)] px-5 py-4 lg:hidden"
        >
          <div className="mx-auto max-w-6xl space-y-4">
            {TOP_NAV.map((group) => (
              <div key={group.id} className="space-y-1">
                {group.children ? (
                  <>
                    <p className="px-2 text-xs font-semibold text-[var(--muted)]">
                      {group.label}
                    </p>
                    {group.children.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "flex rounded-md px-2 py-2 text-sm font-medium transition",
                          isNavActive(pathname, item.href)
                            ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                            : "text-[var(--ink)] hover:bg-black/5",
                        )}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </>
                ) : (
                  <Link
                    href={group.href ?? "/"}
                    className={cn(
                      "flex items-center rounded-md px-2 py-2 text-sm font-semibold transition",
                      group.href && isNavActive(pathname, group.href)
                        ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                        : "text-[var(--ink)] hover:bg-black/5",
                    )}
                  >
                    {group.label}
                    {group.badge === "new" ? (
                      <span className="ml-1 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
                        New
                      </span>
                    ) : null}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}