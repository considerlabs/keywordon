"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import type { Engine, KeywordAnalysis } from "@/lib/keyword-engine";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function BulkPage() {
  const [text, setText] = useState("캠핑 용품\n다이어트 식단\n카페 창업\n노트북 추천");
  const [engine, setEngine] = useState<Engine>("naver");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<KeywordAnalysis[]>([]);
  const [error, setError] = useState("");

  const count = useMemo(
    () =>
      text
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean).length,
    [text],
  );

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const keywords = text
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, engine }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "대량 조회에 실패했습니다.");
      }
      setResults(payload.results as KeywordAnalysis[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "대량 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  function downloadCsv() {
    const rows = [
      ["키워드", "엔진", "월간검색량", "PC", "Mobile", "CPC", "광고경쟁", "기회지수", "이슈성"],
      ...results.map((item) => [
        item.keyword,
        item.engine,
        item.monthlyVolume,
        item.pcVolume,
        item.mobileVolume,
        item.cpc,
        item.adCompetition,
        item.opportunityScore,
        item.issueLevel,
      ]),
    ];
    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "keywordon-bulk.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Bulk Lookup
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          대량 키워드 조회
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          줄바꿈 또는 쉼표로 구분된 키워드를 최대 50개까지 한 번에 비교합니다.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mb-8 rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5"
      >
        <div className="mb-4 flex gap-2">
          {(["naver", "google"] as Engine[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setEngine(value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                engine === value
                  ? "bg-[var(--ink)] text-white"
                  : "bg-[var(--canvas)] text-[var(--muted)]"
              }`}
            >
              {value === "naver" ? "네이버" : "구글"}
            </button>
          ))}
          <span className="ml-auto self-center text-sm text-[var(--muted)]">
            {count}개 입력됨
          </span>
        </div>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={8}
          className="w-full rounded-2xl border-0 bg-[var(--canvas)] p-4 text-[15px] outline-none ring-1 ring-black/5 focus:ring-[var(--brand)]"
          placeholder={"키워드를 한 줄에 하나씩 입력하세요\n예) 캠핑 용품"}
        />
        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={loading || count === 0}
            className="rounded-full bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:opacity-50"
          >
            {loading ? "분석 중..." : "대량 분석하기"}
          </button>
          {results.length > 0 ? (
            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              CSV 다운로드
            </button>
          ) : null}
        </div>
      </form>

      {results.length > 0 ? (
        <div className="overflow-hidden rounded-3xl bg-[var(--panel)] ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[var(--canvas)] text-[var(--muted)]">
                <tr>
                  <th className="px-4 py-3 font-medium">키워드</th>
                  <th className="px-4 py-3 font-medium">월간 검색량</th>
                  <th className="px-4 py-3 font-medium">CPC</th>
                  <th className="px-4 py-3 font-medium">광고경쟁</th>
                  <th className="px-4 py-3 font-medium">기회지수</th>
                  <th className="px-4 py-3 font-medium">이슈성</th>
                </tr>
              </thead>
              <tbody>
                {results.map((item) => (
                  <tr key={item.keyword} className="border-t border-black/5">
                    <td className="px-4 py-3">
                      <Link
                        href={`/analyze?q=${encodeURIComponent(item.keyword)}&engine=${item.engine}`}
                        className="font-semibold text-[var(--ink)] hover:text-[var(--brand)]"
                      >
                        {item.keyword}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatNumber(item.monthlyVolume)}</td>
                    <td className="px-4 py-3">{formatCurrency(item.cpc)}</td>
                    <td className="px-4 py-3">{item.adCompetition}</td>
                    <td className="px-4 py-3 font-semibold text-[var(--brand-ink)]">
                      {item.opportunityScore}
                    </td>
                    <td className="px-4 py-3">{item.issueLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}