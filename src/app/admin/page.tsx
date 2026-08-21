"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Overview = {
  totalUsers: number;
  planDistribution: Record<string, number>;
  settingsConfigured: number;
  settingsTotal: number;
  missingCritical: string[];
  naverConfigured: boolean;
  geminiConfigured: boolean;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/overview");
        const json = (await res.json()) as Overview & { error?: string };
        if (!res.ok) {
          setError(json.error ?? "대시보드를 불러오지 못했습니다.");
          return;
        }
        setData(json);
      } catch {
        setError("네트워크 오류");
      }
    })();
  }, []);

  if (error) {
    return <p className="text-rose-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-[var(--muted)]">불러오는 중…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">대시보드</h1>
        <p className="mt-2 text-[var(--muted)]">회원·설정 상태를 한눈에 확인합니다.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "회원 수", value: data.totalUsers },
          {
            label: "설정 충족",
            value: `${data.settingsConfigured}/${data.settingsTotal}`,
          },
          { label: "네이버 API", value: data.naverConfigured ? "설정됨" : "미설정" },
          { label: "Gemini", value: data.geminiConfigured ? "설정됨" : "미설정" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-[var(--panel)] p-5 ring-1 ring-black/5">
            <p className="text-sm text-[var(--muted)]">{card.label}</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-[var(--panel)] p-5 ring-1 ring-black/5">
        <h2 className="font-semibold">플랜 분포</h2>
        <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
          {Object.entries(data.planDistribution).length === 0 ? (
            <li>아직 회원이 없습니다.</li>
          ) : (
            Object.entries(data.planDistribution).map(([plan, total]) => (
              <li key={plan}>
                {plan}: {total}
              </li>
            ))
          )}
        </ul>
      </section>

      {data.missingCritical.length > 0 ? (
        <section className="rounded-2xl bg-amber-50 p-5 ring-1 ring-amber-100">
          <h2 className="font-semibold text-amber-950">누락된 중요 설정</h2>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
            {data.missingCritical.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
          <Link
            href="/admin/settings"
            className="mt-3 inline-block text-sm font-semibold text-[var(--brand)]"
          >
            설정으로 이동
          </Link>
        </section>
      ) : null}
    </div>
  );
}
