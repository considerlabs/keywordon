"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { buildSparklinePolyline, type SparklinePoint } from "@/lib/trends/sparkline";
import { formatNumber } from "@/lib/utils";

type DetailStatus = "loading" | "ready" | "empty" | "plan" | "login" | "error";

type TrendDetailPayload = {
  keyword: string;
  monthlyVolume: number;
  category: string;
  subcategory: string;
  sparkline: SparklinePoint[];
  hasHistory: boolean;
};

function Sparkline({ points }: { points: SparklinePoint[] }) {
  const width = 320;
  const height = 80;
  const polyline = buildSparklinePolyline(points, width, height);

  if (points.length < 2) {
    return (
      <p className="text-sm text-[var(--muted)]">
        순위 추이 데이터가 아직 충분하지 않습니다. 시간이 지나면 그래프가 표시됩니다.
      </p>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-20 w-full max-w-md text-[var(--brand)]"
      role="img"
      aria-label="키워드 순위 추이"
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={polyline}
      />
    </svg>
  );
}

export function TrendDetailPanel({ keyword }: { keyword: string }) {
  const [status, setStatus] = useState<DetailStatus>("loading");
  const [detail, setDetail] = useState<TrendDetailPayload | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(`/api/trends/${encodeURIComponent(keyword)}`);
        const payload = (await response.json().catch(() => ({}))) as TrendDetailPayload & {
          error?: string;
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
          setMessage(payload.error ?? "키워드 상세를 불러오지 못했습니다.");
          setStatus("error");
          return;
        }

        setDetail(payload);
        setStatus(payload.hasHistory ? "ready" : "empty");
      } catch {
        if (!cancelled) {
          setMessage("네트워크 오류로 상세 정보를 불러오지 못했습니다.");
          setStatus("error");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [keyword]);

  if (status === "login") {
    return (
      <EmptyState
        title="로그인이 필요합니다"
        description="급상승 트렌드 상세는 무료 회원 이상에서 이용할 수 있습니다."
        action={{ label: "로그인", href: `/sign-in?redirect_url=/trends/${encodeURIComponent(keyword)}` }}
      />
    );
  }

  if (status === "plan") {
    return <PlanGate featureLabel="급상승 트렌드" planName="비회원" />;
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-6">
        <Link href="/trends" className="text-sm font-semibold text-[var(--brand)]">
          ← 트렌드 목록
        </Link>
      </div>

      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Keyword Trend
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          {keyword}
        </h1>
        {detail ? (
          <p className="mt-2 text-[var(--muted)]">
            {detail.category} · {detail.subcategory} · 월간 검색량 약 {formatNumber(detail.monthlyVolume)}회
          </p>
        ) : null}
      </div>

      {status === "loading" ? (
        <p className="text-sm text-[var(--muted)]">상세 정보를 불러오는 중…</p>
      ) : null}

      {status === "error" ? (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
          {message}
        </p>
      ) : null}

      {status === "empty" ? (
        <EmptyState
          title="순위 추이 수집 중"
          description="수집 시작 후 며칠이 지나면 이 키워드의 순위 변화를 스파크라인으로 확인할 수 있습니다."
          action={{ href: `/analyze?q=${encodeURIComponent(keyword)}`, label: "키워드 분석하기" }}
        />
      ) : null}

      {detail && (status === "ready" || status === "empty") ? (
        <section className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
            순위 추이 (최근 7일)
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">숫자가 작을수록 상위 순위입니다.</p>
          <div className="mt-4">
            <Sparkline points={detail.sparkline} />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/analyze?q=${encodeURIComponent(keyword)}&engine=naver`}
              className="inline-flex rounded-full bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
            >
              키워드 분석
            </Link>
            <Link
              href={`/write?keyword=${encodeURIComponent(keyword)}`}
              className="inline-flex rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand)]"
            >
              글쓰기 AI
            </Link>
            <Link
              href="/automation"
              className="inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--ink)] ring-1 ring-black/8"
            >
              AI 자동화
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
