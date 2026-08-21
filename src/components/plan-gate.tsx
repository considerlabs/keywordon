import Link from "next/link";
import type { PlanDefinition } from "@/lib/plans";

type PlanGateProps = {
  featureLabel: string;
  planName: PlanDefinition["name"];
};

export function PlanGate({ featureLabel, planName }: PlanGateProps) {
  return (
    <section className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-6 py-8 text-center">
      <p className="text-sm text-[var(--muted)]">
        {featureLabel}은(는) {planName} 플랜에서 사용할 수 없습니다.
      </p>
      <Link
        href="/shop"
        className="mt-4 inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
      >
        플랜 보기
      </Link>
    </section>
  );
}
