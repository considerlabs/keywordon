import Link from "next/link";
import type { UsageSummary } from "@/lib/account/usage-summary";

type QuotaBannerProps = {
  usage: Pick<
    UsageSummary,
    "aiUsed" | "aiLimit" | "aiRemaining" | "aiPercent" | "aiIncluded"
  >;
  href?: string;
};

export function QuotaBanner({ usage, href }: QuotaBannerProps) {
  const shouldShow =
    !usage.aiIncluded || usage.aiRemaining <= 5 || usage.aiPercent >= 80;

  if (!shouldShow) return null;

  return (
    <Link
      href={href ?? "/account"}
      className="block rounded-lg border border-[var(--accent)]/30 bg-[var(--panel)] p-4 transition hover:border-[var(--accent)]/60 hover:bg-[var(--surface)]"
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-[var(--ink)]">
          {usage.aiIncluded
            ? `이번 달 AI ${usage.aiUsed}/${usage.aiLimit}`
            : "AI 생성 플랜 미포함"}
        </span>
        <span className="text-[var(--accent)]">
          {usage.aiIncluded ? "사용량 보기" : "플랜 보기"}
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        {usage.aiIncluded ? (
          <div
            className="h-full rounded-full bg-[var(--accent)]"
            style={{ width: `${usage.aiPercent}%` }}
          />
        ) : null}
      </div>
    </Link>
  );
}
