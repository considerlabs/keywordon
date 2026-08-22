"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ChevronDown, CreditCard, Menu, Search, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isNavActive, TOP_NAV, type NavGroup } from "@/lib/nav";
import { cn } from "@/lib/utils";

const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
const HOVER_CLOSE_MS = 280;

export function SiteHeader() {
  const pathname = usePathname();
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openMenu(id: string) {
    clearCloseTimer();
    setOpenId(id);
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpenId(null), HOVER_CLOSE_MS);
  }

  useEffect(() => {
    // Navigation changes must close local menus.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenId(null);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const closeMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenId(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("keydown", closeMenusOnEscape);
    return () => {
      document.removeEventListener("keydown", closeMenusOnEscape);
      clearCloseTimer();
    };
  }, []);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-[var(--line)]/80 bg-[var(--surface)]/90 backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] text-white shadow-[0_8px_20px_rgba(26,79,224,0.35)] transition group-hover:scale-105">
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--ink)]">
            Keyword<span className="text-[var(--brand)]">On</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="주요 메뉴">
          {TOP_NAV.map((group) => (
            <DesktopNavItem
              key={group.id}
              group={group}
              pathname={pathname}
              open={openId === group.id}
              onOpen={() => openMenu(group.id)}
              onScheduleClose={scheduleClose}
              onClose={() => setOpenId(null)}
            />
          ))}
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
                  <button className="rounded-[var(--radius-cta)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]">
                    로그인
                  </button>
                </SignInButton>
              }
            >
              <UserButton>
                <UserButton.MenuItems>
                  <UserButton.Link
                    label="내 정보"
                    href="/account"
                    labelIcon={<UserRound className="h-4 w-4" />}
                  />
                  <UserButton.Link
                    label="플랜 업그레이드"
                    href="/shop"
                    labelIcon={<CreditCard className="h-4 w-4" />}
                  />
                </UserButton.MenuItems>
              </UserButton>
            </Show>
          ) : (
            <Link
              href="/shop"
              className="rounded-[var(--radius-cta)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
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
          <div className="mx-auto max-w-6xl space-y-5">
            {TOP_NAV.map((group) => (
              <div key={group.id} className="space-y-1">
                {group.children ? (
                  <>
                    <p className="px-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {group.label}
                    </p>
                    {group.children.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "block rounded-lg px-2 py-2.5 transition",
                          isNavActive(pathname, item.href)
                            ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                            : "text-[var(--ink)] hover:bg-black/5",
                        )}
                      >
                        <span className="block text-sm font-semibold">{item.label}</span>
                        {item.description ? (
                          <span className="mt-0.5 block text-xs text-[var(--muted)]">
                            {item.description}
                          </span>
                        ) : null}
                      </Link>
                    ))}
                  </>
                ) : (
                  <Link
                    href={group.href ?? "/"}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center rounded-lg px-2 py-2.5 text-sm font-semibold transition",
                      group.href && isNavActive(pathname, group.href)
                        ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                        : "text-[var(--ink)] hover:bg-black/5",
                    )}
                  >
                    {group.label}
                    {group.badge === "new" ? (
                      <span className="ml-2 rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
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

type DesktopNavItemProps = {
  group: NavGroup;
  pathname: string;
  open: boolean;
  onOpen: () => void;
  onScheduleClose: () => void;
  onClose: () => void;
};

function DesktopNavItem({
  group,
  pathname,
  open,
  onOpen,
  onScheduleClose,
  onClose,
}: DesktopNavItemProps) {
  const active = group.children
    ? group.children.some((item) => isNavActive(pathname, item.href))
    : group.href
      ? isNavActive(pathname, group.href)
      : false;

  if (!group.children) {
    return (
      <Link
        href={group.href ?? "/"}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition",
          active
            ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
            : "text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--ink)]",
        )}
      >
        {group.label}
        {group.badge === "new" ? (
          <span className="rounded bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
            New
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={onScheduleClose}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition",
          open || active
            ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
            : "text-[var(--muted)] hover:bg-black/[0.04] hover:text-[var(--ink)]",
        )}
      >
        {group.label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")}
          strokeWidth={2}
        />
      </button>

      {open ? (
        <div
          className="absolute left-0 top-full z-50 w-[min(36rem,calc(100vw-2rem))]"
          role="menu"
        >
          {/* Bridge: overlaps trigger so cursor never leaves the hover zone */}
          <div className="h-3 w-full" aria-hidden />
          <div className="-mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[0_24px_60px_rgba(16,24,40,0.14)]">
            <div className="border-b border-[var(--line)] bg-[var(--canvas)]/70 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
                {group.label}
              </p>
            </div>
            <div className="grid gap-1 p-2 sm:grid-cols-2">
              {group.children.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={onClose}
                  className={cn(
                    "rounded-xl px-3.5 py-3 transition",
                    isNavActive(pathname, item.href)
                      ? "bg-[var(--brand-soft)]"
                      : "hover:bg-[var(--canvas)]",
                  )}
                >
                  <span
                    className={cn(
                      "block text-sm font-semibold",
                      isNavActive(pathname, item.href)
                        ? "text-[var(--brand-ink)]"
                        : "text-[var(--ink)]",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.description ? (
                    <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">
                      {item.description}
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
