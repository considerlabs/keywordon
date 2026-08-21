"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CreatorSubnav } from "@/components/creator-subnav";
import { formatNumber } from "@/lib/utils";

interface BlogReport {
  url: string;
  platform: string;
  summary: string;
  metrics: {
    postCount: number;
    monthlyPosts: number;
    estimatedMonthlyVisitors: number;
    indexScore: number;
    keywordScore: number;
    consistencyScore: number;
    overallScore: number;
  };
  topPosts: { title: string; views: number; publishedAt: string }[];
  recommendations: string[];
}

export default function BlogPage() {
  const [url, setUrl] = useState("https://blog.naver.com/example");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<BlogReport | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/blog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "분석 실패");
      setReport(payload as BlogReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : "분석 실패");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <CreatorSubnav />
      <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Blog Analysis
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">블로그 분석</h1>
        <p className="mt-2 text-[var(--muted)]">
          네이버 블로그·티스토리 URL로 발행 리듬, 키워드 지수, 개선 포인트를 확인합니다.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
          placeholder="블로그 URL"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white"
        >
          {loading ? "분석 중..." : "분석하기"}
        </button>
      </form>

      {error ? (
        <p className="mb-4 text-sm text-rose-600">
          {error}{" "}
          <Link href="/sign-up" className="underline">
            가입하기
          </Link>
        </p>
      ) : null}

      {report ? (
        <div className="space-y-6">
          <section className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
            <p className="text-sm text-[var(--muted)]">{report.platform}</p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">
              종합 {report.metrics.overallScore}점
            </h2>
            <p className="mt-2 text-[var(--muted)]">{report.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["발행 글", report.metrics.postCount],
                ["월 발행", report.metrics.monthlyPosts],
                ["추정 방문자", formatNumber(report.metrics.estimatedMonthlyVisitors)],
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
              <h3 className="mb-4 font-bold">인기 포스팅</h3>
              <ul className="space-y-3">
                {report.topPosts.map((post) => (
                  <li key={post.title} className="flex justify-between gap-3 text-sm">
                    <span>{post.title}</span>
                    <span className="text-[var(--muted)]">{formatNumber(post.views)}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
              <h3 className="mb-4 font-bold">개선 제안</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                {report.recommendations.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      ) : null}
      </div>
    </>
  );
}