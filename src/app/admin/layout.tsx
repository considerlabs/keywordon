import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { getAuthContext, isClerkConfigured } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin/emails";

const LINKS = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/users", label: "회원" },
  { href: "/admin/settings", label: "설정" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!isClerkConfigured()) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16 text-[var(--ink)]">
        Clerk가 설정되지 않아 관리자 콘솔을 사용할 수 없습니다.
      </div>
    );
  }

  const auth = await getAuthContext();
  if (!auth.userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/admin")}`);
  }
  if (!isAdminEmail(auth.email)) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
          접근 불가
        </h1>
        <p className="mt-3 text-[var(--muted)]">관리자 권한이 없는 계정입니다.</p>
        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-[var(--brand)]">
          홈으로
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--canvas)] text-[var(--ink)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="font-[family-name:var(--font-display)] text-lg font-bold tracking-tight"
            >
              KeywordOn Admin
            </Link>
            <nav className="flex gap-1 text-sm font-semibold">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-1.5 text-[var(--muted)] hover:bg-black/5 hover:text-[var(--ink)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
              사이트로
            </Link>
            <UserButton />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </div>
  );
}
