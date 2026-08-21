"use client";

import { ExportActions } from "@/components/write/export-actions";

type Draft = {
  id: number;
  title: string;
  content: string;
  status: "draft" | "ready" | "exported";
};

type PublishColumnProps = {
  drafts: Draft[];
  busy: boolean;
  onMarkExported: (draftId: number) => void;
};

export function PublishColumn({ drafts, busy, onMarkExported }: PublishColumnProps) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--ink)]">
        3. 발행
      </h2>
      <p className="mb-3 text-xs text-[var(--muted)]">
        복사 · MD · 네이버 붙여넣기만 지원합니다. 자동 발행은 없습니다.
      </p>
      <label className="mb-4 flex cursor-not-allowed items-center gap-2 text-xs text-[var(--muted)] opacity-70">
        <input type="checkbox" disabled className="rounded border-[var(--line)]" />
        알림톡 알림 (준비 중)
      </label>
      <ul className="space-y-4">
        {drafts.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-sm text-[var(--muted)]">
            준비된 초안이 여기로 모입니다.
          </li>
        ) : (
          drafts.map((draft) => (
            <li
              key={draft.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3"
            >
              <p className="text-sm font-semibold text-[var(--ink)]">{draft.title || "제목 없음"}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase text-[var(--muted)]">
                {draft.status === "exported" ? "발행 표시됨" : "내보내기 가능"}
              </p>
              <ExportActions draft={draft.content} title={draft.title} />
              {draft.status !== "exported" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onMarkExported(draft.id)}
                  className="mt-3 w-full rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] disabled:opacity-50"
                >
                  발행 완료로 표시
                </button>
              ) : null}
              <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted)]">
                Tip: KeywordOn Chrome 확장으로 붙여넣기를 더 빠르게 할 수 있습니다.
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
