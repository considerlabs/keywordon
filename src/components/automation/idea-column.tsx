"use client";

import type { FormEvent } from "react";

type Idea = {
  id: number;
  title: string;
  keyword: string | null;
  source: string;
  monthlyVolume: number | null;
};

type Suggestion = {
  id: string;
  title: string;
  keyword: string;
  monthlyVolume?: number;
};

type IdeaColumnProps = {
  ideas: Idea[];
  suggestions: Suggestion[];
  dailyUsed: number;
  dailyLimit: number;
  busy: boolean;
  generatingIdeaId: number | null;
  onManualSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onAddSuggestion: (item: Suggestion) => void;
  onGenerate: (ideaId: number) => void;
};

export function IdeaColumn({
  ideas,
  suggestions,
  dailyUsed,
  dailyLimit,
  busy,
  generatingIdeaId,
  onManualSubmit,
  onAddSuggestion,
  onGenerate,
}: IdeaColumnProps) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--ink)]">1. 글감</h2>
        <span className="text-xs text-[var(--muted)]">
          오늘 {dailyUsed}/{dailyLimit}
        </span>
      </div>

      <form onSubmit={onManualSubmit} className="mb-4 space-y-2">
        <input
          name="title"
          required
          maxLength={200}
          placeholder="글감 제목"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]"
        />
        <input
          name="keyword"
          maxLength={200}
          placeholder="키워드 (선택)"
          className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:opacity-50"
        >
          직접 추가
        </button>
      </form>

      <div className="mb-4">
        <p className="mb-2 text-xs font-semibold text-[var(--muted)]">오늘의 추천</p>
        <ul className="max-h-40 space-y-2 overflow-y-auto">
          {suggestions.slice(0, 8).map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2"
            >
              <div>
                <p className="text-sm font-medium text-[var(--ink)]">{item.title}</p>
                <p className="text-xs text-[var(--muted)]">{item.keyword}</p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAddSuggestion(item)}
                className="shrink-0 text-xs font-semibold text-[var(--brand)]"
              >
                추가
              </button>
            </li>
          ))}
        </ul>
      </div>

      <ul className="space-y-2">
        {ideas.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-sm text-[var(--muted)]">
            글감을 추가하면 여기에 표시됩니다.
          </li>
        ) : (
          ideas.map((idea) => (
            <li
              key={idea.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3"
            >
              <p className="text-sm font-semibold text-[var(--ink)]">{idea.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {idea.keyword ?? "키워드 없음"}
                {idea.monthlyVolume != null ? ` · 월 ${idea.monthlyVolume.toLocaleString()}` : ""}
              </p>
              <button
                type="button"
                disabled={generatingIdeaId === idea.id}
                onClick={() => onGenerate(idea.id)}
                className="mt-3 w-full rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] disabled:opacity-50"
              >
                {generatingIdeaId === idea.id ? "초안 생성 중…" : "초안 생성"}
              </button>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
