import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext, isClerkConfigured } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin/emails";
import { AdminShell } from "@/components/admin/shell";

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

  return <AdminShell email={auth.email}>{children}</AdminShell>;
}
