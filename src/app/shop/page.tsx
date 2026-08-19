"use client";

import { useState } from "react";
import { PLANS, PAID_PLANS, type PlanId } from "@/lib/plans";
import { formatNumber } from "@/lib/utils";

export default function ShopPage() {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);
  const [message, setMessage] = useState("");

  async function checkout(planId: PlanId) {
    setLoadingPlan(planId);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "결제 세션 생성 실패");
      }
      if (payload.url) {
        window.location.href = payload.url as string;
        return;
      }
      throw new Error("결제 URL이 없습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "결제에 실패했습니다.");
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Membership
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          KeywordOn 플랜
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          무료로 시작하고, 필요에 따라 베이직·슈퍼·엔터프라이즈로 확장하세요.
        </p>
      </div>

      <div className="mb-8 flex gap-2">
        {(["monthly", "yearly"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setInterval(value)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              interval === value
                ? "bg-[var(--ink)] text-white"
                : "bg-white text-[var(--muted)] ring-1 ring-black/8"
            }`}
          >
            {value === "monthly" ? "월간" : "연간"}
          </button>
        ))}
      </div>

      {message ? (
        <p className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-100">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {PAID_PLANS.map((id) => {
          const plan = PLANS[id];
          const price =
            interval === "monthly" ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
          return (
            <article
              key={id}
              className="flex flex-col rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5"
            >
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)]">
                {plan.name}
              </h2>
              <p className="mt-2 text-sm text-[var(--muted)]">{plan.description}</p>
              <p className="mt-5 font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--brand-ink)]">
                {formatNumber(price)}
                <span className="text-base font-medium text-[var(--muted)]">원/월</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-[var(--ink)]">
                {plan.highlights.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => checkout(id)}
                disabled={loadingPlan === id}
                className="mt-auto rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:opacity-60"
              >
                {loadingPlan === id ? "이동 중..." : "구독하기"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="mt-10 overflow-x-auto rounded-3xl bg-[var(--panel)] ring-1 ring-black/5">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--canvas)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">기능</th>
              {(["guest", "free", "basic", "super", "enterprise"] as PlanId[]).map((id) => (
                <th key={id} className="px-4 py-3">
                  {PLANS[id].name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["월 가격", (p: PlanId) => `${PLANS[p].priceMonthly.toLocaleString("ko-KR")}원`],
              ["네이버 분석/분", (p: PlanId) => `${PLANS[p].limits.naverPerMinute}회`],
              ["구글 분석/월", (p: PlanId) => (PLANS[p].limits.googleMonthly || "-")],
              ["대량 조회", (p: PlanId) => (PLANS[p].limits.bulkMax || "-")],
              ["기회지수", (p: PlanId) => (PLANS[p].limits.opportunityScore ? "제공" : "-")],
              ["Copilot AI", (p: PlanId) => (PLANS[p].limits.copilot ? `${PLANS[p].limits.aiMonthly}회` : "-")],
              ["사이트 진단", (p: PlanId) => (PLANS[p].limits.siteDiagnosis || "-")],
            ].map(([label, render]) => (
              <tr key={String(label)} className="border-t border-black/5">
                <td className="px-4 py-3 font-medium">{label as string}</td>
                {(["guest", "free", "basic", "super", "enterprise"] as PlanId[]).map((id) => (
                  <td key={id} className="px-4 py-3 text-[var(--muted)]">
                    {(render as (p: PlanId) => string | number)(id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}