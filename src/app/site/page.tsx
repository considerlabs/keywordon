"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { formatNumber } from "@/lib/utils";

interface SiteReport {
  domain: string;
  summary: string;
  metrics: {
    organicKeywords: number;
    indexedPages: number;
    referringDomains: number;
    healthScore: number;
    mobileFriendly: boolean;
    https: boolean;
  };
  topKeywords: { keyword: string; clicks: number; impressions: number; position: number }[];
  issues: string[];
}

export default function SitePage() {
  const [domain, setDomain] = useState("example.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<SiteReport | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "진단 실패");
      setReport(payload as SiteReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "진단 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Site Diagnosis
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">내 사이트 진단</h1>
        <p className="mt-2 text-[var(--muted)]">
          도메인 기준 유입 키워드·인덱스·백링크 건강도를 진단합니다. 베이직 이상 필요.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="flex-1 rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
          placeholder="example.com"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-[var(--radius-cta)] bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white"
        >
          {loading ? "진단 중..." : "진단하기"}
        </button>
      </form>

      {error ? (
        <p className="mb-4 text-sm text-rose-600">
          {error}{" "}
          <Link href="/shop" className="underline">
            플랜 업그레이드
          </Link>
        </p>
      ) : null}

      {report ? (
        <div className="space-y-6">
          <section className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold">
              {report.domain}
            </h2>
            <p className="mt-2 text-[var(--muted)]">{report.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                ["건강도", report.metrics.healthScore],
                ["유입 키워드", formatNumber(report.metrics.organicKeywords)],
                ["인덱스", formatNumber(report.metrics.indexedPages)],
                ["참조 도메인", formatNumber(report.metrics.referringDomains)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl bg-[var(--canvas)] p-4">
                  <p className="text-sm text-[var(--muted)]">{label}</p>
                  <p className="mt-1 text-xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
              <h3 className="mb-4 font-bold">상위 유입 키워드</h3>
              <div className="overflow-hidden rounded-2xl ring-1 ring-black/5">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--canvas)] text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2 text-left">키워드</th>
                      <th className="px-3 py-2 text-left">클릭</th>
                      <th className="px-3 py-2 text-left">순위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.topKeywords.map((item) => (
                      <tr key={item.keyword} className="border-t border-black/5">
                        <td className="px-3 py-2">{item.keyword}</td>
                        <td className="px-3 py-2">{item.clicks}</td>
                        <td className="px-3 py-2">{item.position}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
              <h3 className="mb-4 font-bold">이슈</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                {report.issues.length
                  ? report.issues.map((item) => <li key={item}>· {item}</li>)
                  : <li>· 특이 이슈가 감지되지 않았습니다.</li>}
              </ul>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}