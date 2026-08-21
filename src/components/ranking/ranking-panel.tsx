"use client";

import { FormEvent, useMemo, useState } from "react";
import {
  buildBlogRanking,
  getDefaultRankingKeyword,
  getRankingCategories,
  type BlogRankingEntry,
} from "@/lib/ranking/simulate";
import { formatNumber } from "@/lib/utils";

const CHANGE_LABEL: Record<BlogRankingEntry["change"], string> = {
  up: "상승",
  down: "하락",
  same: "유지",
  new: "신규",
};

export function RankingPanel() {
  const [keyword, setKeyword] = useState(getDefaultRankingKeyword());
  const [category, setCategory] = useState("");
  const [platform, setPlatform] = useState<"all" | "naver" | "tistory">("all");
  const [entries, setEntries] = useState<BlogRankingEntry[]>(() =>
    buildBlogRanking({ keyword: getDefaultRankingKeyword() }),
  );

  const categories = useMemo(() => getRankingCategories(), []);

  function submit(event: FormEvent) {
    event.preventDefault();
    setEntries(
      buildBlogRanking({
        keyword,
        category: category || undefined,
        platform,
        topN: 20,
      }),
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Blog Ranking
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">블로그 순위</h1>
        <p className="mt-2 text-[var(--muted)]">
          키워드별 블로그 노출 순위를 확인합니다. 초기 데이터는 시뮬레이션 기반이며 점진적으로 실데이터와 병행됩니다.
        </p>
      </div>

      <form onSubmit={submit} className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5 sm:col-span-2"
          placeholder="키워드"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
        >
          <option value="">전체 카테고리</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as typeof platform)}
          className="rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
        >
          <option value="all">전체 플랫폼</option>
          <option value="naver">네이버</option>
          <option value="tistory">티스토리</option>
        </select>
        <button
          type="submit"
          className="rounded-[var(--radius-cta)] bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white sm:col-span-2 lg:col-span-1"
        >
          순위 조회
        </button>
      </form>

      <div className="overflow-x-auto rounded-3xl bg-[var(--panel)] ring-1 ring-black/5">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-medium">순위</th>
              <th className="px-4 py-3 font-medium">블로그</th>
              <th className="px-4 py-3 font-medium">포스팅</th>
              <th className="px-4 py-3 font-medium">플랫폼</th>
              <th className="px-4 py-3 font-medium">추정 조회</th>
              <th className="px-4 py-3 font-medium">키워드 일치</th>
              <th className="px-4 py-3 font-medium">변동</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`${entry.rank}-${entry.blogUrl}`} className="border-b border-[var(--line)] last:border-0">
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
                <td className="max-w-xs truncate px-4 py-3 text-[var(--muted)]">{entry.postTitle}</td>
                <td className="px-4 py-3">{entry.platform === "naver" ? "네이버" : "티스토리"}</td>
                <td className="px-4 py-3">{formatNumber(entry.estimatedViews)}</td>
                <td className="px-4 py-3">{entry.keywordMatch}%</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      entry.change === "up"
                        ? "text-emerald-700"
                        : entry.change === "down"
                          ? "text-rose-600"
                          : "text-[var(--muted)]"
                    }
                  >
                    {CHANGE_LABEL[entry.change]} {entry.delta > 0 ? entry.delta : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
