"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import type { RelatedKeyword } from "@/lib/keyword-engine";
import { formatNumber } from "@/lib/utils";

export default function DiscoverPage() {
  const [seed, setSeed] = useState("마케팅");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<RelatedKeyword[]>([]);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/discover?q=${encodeURIComponent(seed.trim())}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "발굴에 실패했습니다.");
      }
      setItems(payload.items as RelatedKeyword[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "발굴에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Keyword Discover
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          키워드 발굴
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          시드 키워드를 기준으로 기회지수가 높은 확장 키워드를 찾아줍니다.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mb-8 flex flex-col gap-3 rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5 sm:flex-row"
      >
        <input
          value={seed}
          onChange={(event) => setSeed(event.target.value)}
          className="flex-1 rounded-2xl bg-[var(--canvas)] px-4 py-3 outline-none ring-1 ring-black/5 focus:ring-[var(--brand)]"
          placeholder="시드 키워드"
        />
        <button
          type="submit"
          disabled={loading || !seed.trim()}
          className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "발굴 중..." : "키워드 발굴"}
        </button>
      </form>

      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}

      {items.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={`${item.source}-${item.keyword}`}
              href={`/analyze?q=${encodeURIComponent(item.keyword)}&engine=naver`}
              className="rounded-2xl bg-[var(--panel)] p-5 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(15,40,50,0.1)]"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--brand-ink)]">
                  {item.source === "internal" ? "KeywordOn" : "SERP"}
                </span>
                <span className="text-xs font-semibold text-[var(--muted)]">
                  기회 {item.opportunityScore}
                </span>
              </div>
              <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
                {item.keyword}
              </p>
              <p className="mt-2 text-sm text-[var(--muted)]">
                월간 {formatNumber(item.monthlyVolume)} · {item.competition}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl bg-[var(--panel)] px-6 py-16 text-center ring-1 ring-black/5">
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
            시드 키워드로 발굴을 시작해 보세요
          </p>
        </div>
      )}
    </div>
  );
}