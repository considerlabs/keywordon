"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Clapperboard,
  FileText,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  icon: React.ReactNode;
  external?: boolean;
};

const ADMIN_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "대시보드",
    match: (p) => p === "/admin",
    icon: <LayoutDashboard className="h-4 w-4" strokeWidth={2} />,
  },
  {
    href: "/admin/users",
    label: "회원",
    match: (p) => p.startsWith("/admin/users"),
    icon: <Users className="h-4 w-4" strokeWidth={2} />,
  },
  {
    href: "/admin/settings",
    label: "설정",
    match: (p) => p.startsWith("/admin/settings"),
    icon: <Settings className="h-4 w-4" strokeWidth={2} />,
  },
];

const SERVICE_ITEMS: NavItem[] = [
  {
    href: "/analyze",
    label: "키워드 분석",
    match: (p) => p.startsWith("/analyze"),
    icon: <Search className="h-4 w-4" strokeWidth={2} />,
  },
  {
    href: "/write",
    label: "글쓰기 AI",
    match: (p) => p.startsWith("/write") || p.startsWith("/copilot"),
    icon: <FileText className="h-4 w-4" strokeWidth={2} />,
  },
  {
    href: "/blog",
    label: "블로그 분석",
    match: (p) => p.startsWith("/blog"),
    icon: <BarChart3 className="h-4 w-4" strokeWidth={2} />,
  },
  {
    href: "/automation",
    label: "AI 자동화",
    match: (p) => p.startsWith("/automation"),
    icon: <Workflow className="h-4 w-4" strokeWidth={2} />,
  },
  {
    href: "/shortform",
    label: "숏폼",
    match: (p) => p.startsWith("/shortform"),
    icon: <Clapperboard className="h-4 w-4" strokeWidth={2} />,
  },
  {
    href: "/trends",
    label: "급상승 트렌드",
    match: (p) => p.startsWith("/trends"),
    icon: <TrendingUp className="h-4 w-4" strokeWidth={2} />,
  },
];

function NavList({ items, path }: { items: NavItem[]; path: string }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const active = item.match(path);
        return (
          <li key={`${item.href}-${item.label}`}>
            <Link
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors",
                active
                  ? "bg-[var(--brand-soft)] font-medium text-[var(--brand-ink)] shadow-[inset_3px_0_0_0_var(--brand)]"
                  : "text-[var(--ink)]/80 hover:bg-[var(--brand-soft)]/70",
              )}
            >
              <span className={cn(active ? "text-[var(--brand)]" : "text-[var(--muted)]")}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function AdminSideNav() {
  const path = usePathname();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      return { admin: ADMIN_ITEMS, service: SERVICE_ITEMS };
    }
    const match = (item: NavItem) => item.label.toLowerCase().includes(needle);
    return {
      admin: ADMIN_ITEMS.filter(match),
      service: SERVICE_ITEMS.filter(match),
    };
  }, [q]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="px-3 pt-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="메뉴 검색..."
            className="h-9 w-full rounded-lg border border-[var(--line)] bg-white pr-3 pl-8 text-sm outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20"
          />
        </label>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {filtered.admin.length > 0 ? (
          <>
            <p className="mb-2 px-2 text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
              관리
            </p>
            <NavList items={filtered.admin} path={path} />
          </>
        ) : null}

        {filtered.service.length > 0 ? (
          <>
            <p className="mt-5 mb-2 px-2 text-[11px] font-semibold tracking-wide text-[var(--muted)] uppercase">
              서비스
            </p>
            <NavList items={filtered.service} path={path} />
          </>
        ) : null}

        {filtered.admin.length === 0 && filtered.service.length === 0 ? (
          <p className="px-2 text-sm text-[var(--muted)]">검색 결과가 없습니다.</p>
        ) : null}
      </nav>
    </div>
  );
}

export function AdminBrandMark() {
  return (
    <span className="flex size-9 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-[0_8px_20px_-10px_rgba(26,79,224,0.65)]">
      <Sparkles className="h-4 w-4" strokeWidth={2.5} />
    </span>
  );
}
