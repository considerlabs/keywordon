import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { QuotaBanner } from "@/components/quota-banner";
import { buildUsageSummary } from "@/lib/account/usage-summary";
import { getAuthContext } from "@/lib/auth";

type UsageCardProps = {
  title: string;
  used: number;
  limit: number;
  remaining?: number;
};

function UsageCard({ title, used, limit, remaining }: UsageCardProps) {
  const percent = limit <= 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));

  return (
    <article className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--muted)]">{title}</p>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
            {used}
            <span className="ml-1 text-lg font-medium text-[var(--muted)]">/ {limit}회</span>
          </p>
        </div>
        {remaining !== undefined ? (
          <span className="rounded-full bg-[var(--canvas)] px-3 py-1 text-sm font-semibold text-[var(--ink)]">
            {remaining}회 남음
          </span>
        ) : null}
      </div>
      <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[var(--brand)]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-[var(--muted)]">이번 달 사용량 {percent}%</p>
    </article>
  );
}

export default async function AccountUsagePage() {
  const authContext = await getAuthContext();

  if (authContext.authEnabled && !authContext.userId) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-10">
        <EmptyState
          title="로그인이 필요합니다"
          description="로그인 후 사용량을 확인하세요."
          action={{
            href: "/sign-in?redirect_url=%2Faccount%2Fusage",
            label: "로그인하기",
          }}
        />
      </main>
    );
  }

  const summary = buildUsageSummary({
    planName: authContext.plan.name,
    aiUsedMonth: authContext.user?.aiUsedMonth ?? 0,
    aiMonthly: authContext.plan.limits.aiMonthly,
    googleUsedMonth: authContext.user?.googleUsedMonth ?? 0,
    googleMonthly: authContext.plan.limits.googleMonthly,
  });

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            Usage
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
            이번 달 사용량
          </h1>
          <p className="mt-2 text-[var(--muted)]">{summary.planName} 플랜을 이용 중입니다.</p>
        </div>
        <Link
          href="/shop"
          className="inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
        >
          플랜 보기
        </Link>
      </div>

      {summary.aiPercent >= 80 ? (
        <div className="mb-6">
          <QuotaBanner aiUsed={summary.aiUsed} aiLimit={summary.aiLimit} href="/shop" />
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <UsageCard
          title="AI 생성"
          used={summary.aiUsed}
          limit={summary.aiLimit}
          remaining={summary.aiRemaining}
        />
        <UsageCard
          title="Google 분석"
          used={summary.googleUsed}
          limit={summary.googleLimit}
        />
      </section>
    </main>
  );
}
