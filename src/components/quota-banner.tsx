import Link from "next/link";

type QuotaBannerProps = {
  aiUsed: number;
  aiLimit: number;
  href?: string;
};

export function QuotaBanner({ aiUsed, aiLimit, href }: QuotaBannerProps) {
  const aiRemaining = Math.max(0, aiLimit - aiUsed);
  const aiPercent =
    aiLimit <= 0 ? 100 : Math.min(100, Math.round((aiUsed / aiLimit) * 100));
  const shouldShow = aiLimit <= 0 || aiRemaining <= 5 || aiPercent >= 80;

  if (!shouldShow) return null;

  return (
    <Link
      href={href ?? "/account/usage"}
      className="block rounded-lg border border-[var(--accent)]/30 bg-[var(--panel)] p-4 transition hover:border-[var(--accent)]/60 hover:bg-[var(--surface)]"
    >
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-[var(--ink)]">
          이번 달 AI {aiUsed}/{aiLimit}
        </span>
        <span className="text-[var(--accent)]">사용량 보기</span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
        <div
          className="h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${aiPercent}%` }}
        />
      </div>
    </Link>
  );
}
