import Link from "next/link";
import { redirect } from "next/navigation";
import { QuotaBanner } from "@/components/quota-banner";
import { buildUsageSummary } from "@/lib/account/usage-summary";
import { getAuthContext } from "@/lib/auth";

export default async function AccountPage() {
  const auth = await getAuthContext();

  if (auth.authEnabled && !auth.userId) {
    redirect(`/sign-in?redirect_url=${encodeURIComponent("/account")}`);
  }

  const unlimited = Boolean(auth.plan.unrestricted);
  const summary = buildUsageSummary({
    planName: auth.plan.name,
    aiUsedMonth: auth.user?.aiUsedMonth ?? 0,
    aiMonthly: auth.plan.limits.aiMonthly,
    googleUsedMonth: auth.user?.googleUsedMonth ?? 0,
    googleMonthly: auth.plan.limits.googleMonthly,
    unlimited,
  });

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
        Account
      </p>
      <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
        내 정보
      </h1>
      <p className="mt-2 text-[var(--muted)]">현재 플랜과 이번 달 사용량을 확인합니다.</p>

      <section className="mt-8 rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
        <p className="text-sm font-semibold text-[var(--muted)]">로그인 계정</p>
        <p className="mt-2 text-lg font-semibold text-[var(--ink)]">{auth.email ?? "이메일 없음"}</p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--muted)]">현재 플랜</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
              {auth.plan.name}
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {unlimited
                ? "기능·횟수 제한이 없는 슈퍼관리자입니다."
                : auth.plan.description}
            </p>
          </div>
          {unlimited ? (
            <span className="rounded-full bg-[var(--brand-soft)] px-3 py-1 text-sm font-semibold text-[var(--brand-ink)]">
              무제한
            </span>
          ) : (
            <Link
              href="/shop"
              className="inline-flex rounded-[var(--radius-cta)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
            >
              플랜 업그레이드
            </Link>
          )}
        </div>
      </section>

      {!unlimited && (!summary.aiIncluded || summary.aiPercent >= 80) ? (
        <div className="mt-6">
          <QuotaBanner usage={summary} href="/shop" />
        </div>
      ) : null}

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
          <p className="text-sm font-semibold text-[var(--muted)]">AI 생성</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
            {unlimited ? "무제한" : summary.aiIncluded ? `${summary.aiUsed} / ${summary.aiLimit}회` : "플랜 미포함"}
          </p>
        </article>
        <article className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
          <p className="text-sm font-semibold text-[var(--muted)]">Google 분석</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
            {unlimited
              ? "무제한"
              : summary.googleLimit > 0
                ? `${summary.googleUsed} / ${summary.googleLimit}회`
                : "플랜 미포함"}
          </p>
        </article>
      </section>
    </main>
  );
}
