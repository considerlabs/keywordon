import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AdminBrandMark, AdminSideNav } from "@/components/admin/side-nav";

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string | null;
}) {
  const initial = (email?.[0] ?? "A").toUpperCase();

  return (
    <div className="admin-shell relative flex min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(26,79,224,0.12)_0%,transparent_70%)]" />
        <div className="absolute top-24 right-0 h-[360px] w-[420px] rounded-full bg-[radial-gradient(ellipse,rgba(15,53,184,0.08)_0%,transparent_70%)]" />
      </div>

      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md">
        <Link
          href="/admin"
          className="flex items-center gap-2.5 border-b border-[var(--line)] px-4 py-4"
        >
          <AdminBrandMark />
          <span>
            <span className="block text-[15px] font-bold tracking-tight">KeywordOn</span>
            <span className="block text-[11px] text-[var(--muted)]">Admin Console</span>
          </span>
        </Link>

        <AdminSideNav />

        <div className="mt-auto border-t border-[var(--line)] px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand-ink)]">
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{email ?? "관리자"}</p>
              <p className="text-xs text-[var(--muted)]">관리자 · 내 정보</p>
            </div>
            <UserButton />
          </div>
          <Link
            href="/"
            className="mt-3 inline-block text-xs text-[var(--muted)] hover:text-[var(--brand)]"
          >
            사이트로 돌아가기
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-[var(--line)]/60 bg-[var(--canvas)]/80 backdrop-blur-md">
          <div className="flex h-14 items-center justify-between gap-3 px-6">
            <div>
              <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                운영
              </p>
              <p className="text-sm text-[var(--ink)]">회원 · 설정 · 서비스 워크플로</p>
            </div>
            <Link
              href="/write"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3.5 text-sm font-semibold text-white shadow-[0_14px_28px_-16px_rgba(26,79,224,0.75)] hover:bg-[var(--brand-ink)]"
            >
              + 글쓰기 시작
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto max-w-5xl px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
