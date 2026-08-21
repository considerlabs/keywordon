"use client";

import { useMemo, useState } from "react";
import { estimateAdpostRevenue } from "@/lib/calculator/adpost";
import { formatCurrency, formatNumber } from "@/lib/utils";

export function CalculatorPanel() {
  const [monthlyViews, setMonthlyViews] = useState(30000);
  const [ctrPercent, setCtrPercent] = useState(1.2);
  const [cpc, setCpc] = useState(120);

  const estimate = useMemo(
    () => estimateAdpostRevenue({ monthlyViews, ctrPercent, cpc }),
    [monthlyViews, ctrPercent, cpc],
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          AdPost Calculator
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          애드포스트 수익 계산기
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          월간 조회수, CTR, CPC를 입력하면 예상 월 수익을 추정합니다. 결과는 예시 계수 기반 추정치입니다.
        </p>
      </div>

      <form className="space-y-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6">
        <label className="block">
          <span className="text-sm font-medium text-[var(--ink)]">월간 조회수 (노출)</span>
          <input
            type="number"
            min={0}
            step={100}
            value={monthlyViews}
            onChange={(event) => setMonthlyViews(Number(event.target.value) || 0)}
            className="mt-2 w-full rounded-xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
          />
        </label>

        <label className="block">
          <span className="flex justify-between text-sm font-medium text-[var(--ink)]">
            <span>CTR (클릭률, %)</span>
            <span className="text-[var(--brand)]">{ctrPercent.toFixed(1)}%</span>
          </span>
          <input
            type="range"
            min={0.1}
            max={10}
            step={0.1}
            value={ctrPercent}
            onChange={(event) => setCtrPercent(Number(event.target.value))}
            className="mt-3 w-full accent-[var(--brand)]"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-[var(--ink)]">CPC (클릭당 단가, 원)</span>
          <input
            type="number"
            min={0}
            step={10}
            value={cpc}
            onChange={(event) => setCpc(Number(event.target.value) || 0)}
            className="mt-2 w-full rounded-xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
          />
        </label>
      </form>

      <section className="mt-6 rounded-2xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
        <p className="text-sm text-[var(--muted)]">예상 월 수익</p>
        <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold text-[var(--brand-ink)]">
          {formatCurrency(estimate.monthlyRevenue)}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--muted)]">예상 클릭 수</dt>
            <dd className="font-semibold text-[var(--ink)]">{formatNumber(estimate.estimatedClicks)}회</dd>
          </div>
          <div>
            <dt className="text-[var(--muted)]">입력 CTR</dt>
            <dd className="font-semibold text-[var(--ink)]">{estimate.ctrPercent.toFixed(1)}%</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
          본 계산기는 실제 네이버 애드포스트 정산과 다를 수 있는 추정치입니다. 카테고리·계절·콘텐츠 품질에 따라
          결과가 달라질 수 있습니다.
        </p>
      </section>
    </div>
  );
}
