"use client";

import Link from "next/link";
import { Minus, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import type { TrendItem } from "@/lib/keyword-engine";

interface RealtimeTrendsProps {
  items: TrendItem[];
  updatedAt: string;
}

function ChangeIcon({ change }: { change: TrendItem["change"] }) {
  if (change === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (change === "down") return <TrendingDown className="h-3.5 w-3.5 text-rose-500" />;
  if (change === "new") return <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />;
  return <Minus className="h-3.5 w-3.5 text-[var(--muted)]" />;
}

export function RealtimeTrends({ items, updatedAt }: RealtimeTrendsProps) {
  const timeLabel = new Date(updatedAt).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
            Live Trends
          </p>
          <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
            실시간 검색어 순위
          </h2>
        </div>
        <p className="text-sm text-[var(--muted)]">{timeLabel} 기준</p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.keyword}>
            <Link
              href={`/analyze?q=${encodeURIComponent(item.keyword)}&engine=naver`}
              className="group flex items-center gap-4 rounded-xl px-4 py-3 transition hover:bg-white hover:shadow-[0_12px_30px_rgba(15,40,50,0.08)]"
            >
              <span className="w-7 text-center font-[family-name:var(--font-display)] text-xl font-bold text-[var(--brand)]">
                {item.rank}
              </span>
              <span className="flex-1 truncate text-[15px] font-medium text-[var(--ink)] group-hover:text-[var(--brand-ink)]">
                {item.keyword}
              </span>
              <span className="flex items-center gap-1 text-xs font-semibold text-[var(--muted)]">
                <ChangeIcon change={item.change} />
                {item.change === "new"
                  ? "NEW"
                  : item.change === "same"
                    ? "-"
                    : item.delta}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}