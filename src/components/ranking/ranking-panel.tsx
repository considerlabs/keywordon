"use client";

import { FormEvent, useEffect, useState } from "react";
import { getDefaultRankingKeyword } from "@/lib/ranking/simulate";
import type { BlogRankingEntry } from "@/lib/ranking/types";
import { useExamplePlaceholder } from "@/lib/use-example-placeholder";

export function RankingPanel() {
  const defaultKeyword = getDefaultRankingKeyword();
  const [keyword, setKeyword] = useState("");
  const [platform, setPlatform] = useState<"all" | "naver" | "tistory">("naver");
  const [entries, setEntries] = useState<BlogRankingEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const example = useExamplePlaceholder(`예: ${defaultKeyword}`);

  async function load(q: string, selectedPlatform: typeof platform) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        keyword: q,
        platform: selectedPlatform,
        topN: "20",
      });
      const response = await fetch(`/api/ranking?${params}`);
      const payload = (await response.json()) as {
        error?: string;
        entries?: BlogRankingEntry[];
        totalCount?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "순위 조회에 실패했습니다.");
      }
      setEntries(payload.entries ?? []);
      setTotalCount(payload.totalCount ?? 0);
    } catch (err) {
      setEntries([]);
      setTotalCount(0);
      setError(err instanceof Error ? err.message : "순위 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(defaultKeyword, "naver");
    // initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const q = keyword.trim() || defaultKeyword;
    void load(q, platform);
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Blog Ranking
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">블로그 순위</h1>
        <p className="mt-2 text-[var(--muted)]">
          네이버 블로그 검색(관련도순) 상위 노출 글을 실시간으로 확인합니다.
        </p>
      </div>

      <form onSubmit={submit} className="mb-6 flex flex-col gap-3 sm:flex-row">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={example.placeholder}
          onFocus={example.onFocus}
          onBlur={example.onBlur}
          className="flex-1 rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as typeof platform)}
          className="rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5 sm:w-44"
        >
          <option value="naver">네이버</option>
          <option value="all">네이버 (전체)</option>
          <option value="tistory">티스토리 (준비 중)</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded-[var(--radius-cta)] bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "조회 중..." : "순위 조회"}
        </button>
      </form>

      {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
      {totalCount > 0 ? (
        <p className="mb-3 text-sm text-[var(--muted)]">
          네이버 검색 약 {totalCount.toLocaleString("ko-KR")}건 중 상위 {entries.length}건
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-3xl bg-[var(--panel)] ring-1 ring-black/5">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">순위</th>
              <th className="px-4 py-3 font-medium">블로그</th>
              <th className="px-4 py-3 font-medium">포스팅</th>
              <th className="px-4 py-3 font-medium">플랫폼</th>
              <th className="px-4 py-3 font-medium">발행일</th>
              <th className="px-4 py-3 font-medium">키워드 일치</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={`${entry.rank}-${entry.postUrl ?? entry.blogUrl}`}
                className="border-b border-[var(--line)] last:border-0"
              >
                <td className="px-4 py-3 font-bold">{entry.rank}</td>
                <td className="px-4 py-3">
                  <a
                    href={entry.blogUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-[var(--brand-ink)] hover:underline"
                  >
                    {entry.blogName}
                  </a>
                </td>
                <td className="max-w-md px-4 py-3 text-[var(--muted)]">
                  {entry.postUrl ? (
                    <a
                      href={entry.postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {entry.postTitle}
                    </a>
                  ) : (
                    entry.postTitle
                  )}
                </td>
                <td className="px-4 py-3">{entry.platform === "naver" ? "네이버" : "티스토리"}</td>
                <td className="px-4 py-3">{entry.publishedAt ?? "—"}</td>
                <td className="px-4 py-3">{entry.keywordMatch}%</td>
              </tr>
            ))}
            {!loading && entries.length === 0 && !error ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                  키워드를 입력하고 순위를 조회하세요.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
