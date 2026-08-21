"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import type { TrendItem } from "@/lib/keyword-engine";

type TrendsStatus = "loading" | "ready" | "empty" | "plan" | "login" | "error";

function ChangeIcon({ change }: { change: TrendItem["change"] }) {
  if (change === "up") return <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />;
  if (change === "down") return <TrendingDown className="h-3.5 w-3.5 text-rose-500" />;
  if (change === "new") return <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />;
  return <Minus className="h-3.5 w-3.5 text-[var(--muted)]" />;
}

export function TrendsPanel() {
  const [status, setStatus] = useState<TrendsStatus>("loading");
  const [items, setItems] = useState<TrendItem[]>([]);
  const [updatedAt, setUpdatedAt] = useState("");
  const [daysUntilTrend, setDaysUntilTrend] = useState(7);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/trends");
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          items?: TrendItem[];
          updatedAt?: string;
          hasHistory?: boolean;
          daysUntilTrend?: number;
        };

        if (cancelled) return;

        if (response.status === 403) {
          setStatus("plan");
          return;
        }
        if (response.status === 401) {
          setStatus("login");
          return;
        }
        if (!response.ok) {
          setMessage(payload.error ?? "트렌드를 불러오지 못했습니다.");
          setStatus("error");
          return;
        }

        setItems(payload.items ?? []);
        setUpdatedAt(payload.updatedAt ?? new Date().toISOString());
        setDaysUntilTrend(payload.daysUntilTrend ?? 7);
        setStatus(payload.hasHistory ? "ready" : "empty");
      } catch {
        if (!cancelled) {
          setMessage("네트워크 오류로 트렌드를 불러오지 못했습니다.");
          setStatus("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "login") {
    return (
      <EmptyState
        title="로그인이 필요합니다"
        description="급상승 트렌드는 무료 회원 이상에서 이용할 수 있습니다."
        action={{ label: "로그인", href: "/sign-in?redirect_url=/trends" }}
      />
    );
  }

  if (status === "plan") {
    return <PlanGate featureLabel="급상승 트렌드" planName="비회원" />;
  }

  const timeLabel = updatedAt
    ? new Date(updatedAt).toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Trends
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          급상승 트렌드
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          지금 주목받는 검색어와 콘텐츠 주제를 빠르게 발견하세요.
        </p>
      </div>

      {status === "loading" ? (
        <p className="text-sm text-[var(--muted)]">트렌드 목록을 불러오는 중…</p>
      ) : null}

      {status === "error" ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
          {message}
        </p>
      ) : null}

      {status === "empty" ? (
        <EmptyState
          title="시계열 수집을 시작했습니다"
          description={`매시간 키워드 순위를 저장합니다. 추이 그래프는 약 ${daysUntilTrend}일 후부터 확인할 수 있습니다.`}
          action={{ href: "/automation", label: "AI 자동화에서 글감 찾기" }}
        />
      ) : null}

      {status === "ready" || (status === "empty" && items.length > 0) ? (
        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
              실시간 검색어 순위
            </h2>
            {timeLabel ? <p className="text-sm text-[var(--muted)]">{timeLabel} 기준</p> : null}
          </div>

          <ol className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.keyword}>
                <Link
                  href={`/trends/${encodeURIComponent(item.keyword)}`}
                  className="group flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--brand)]/30 hover:shadow-[0_12px_30px_rgba(16,24,40,0.08)]"
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
      ) : null}
    </div>
  );
}
