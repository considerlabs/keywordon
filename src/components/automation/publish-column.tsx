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
  onGoDrafts: () => void;
};

export function PublishColumn({ drafts, busy, onMarkExported, onGoDrafts }: PublishColumnProps) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
      <h2 className="mb-2 text-sm font-bold text-[var(--ink)]">발행</h2>
      <p className="mb-4 text-xs text-[var(--muted)]">
        복사 · MD · 네이버 붙여넣기만 지원합니다. 자동 발행은 없습니다.
      </p>
      <ul className="space-y-4">
        {drafts.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-8 text-center">
            <p className="text-sm text-[var(--muted)]">초안 탭에서 글을 확인하세요.</p>
            <button
              type="button"
              onClick={onGoDrafts}
              className="mt-3 text-sm font-semibold text-[var(--brand)]"
            >
              초안으로 이동
            </button>
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
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
