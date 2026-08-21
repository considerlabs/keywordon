"use client";

type Draft = {
  id: number;
  title: string;
  content: string;
  status: "draft" | "ready" | "exported";
};

type DraftColumnProps = {
  drafts: Draft[];
  generatingIdeaId: number | null;
};

export function DraftColumn({ drafts, generatingIdeaId }: DraftColumnProps) {
  return (
    <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--ink)]">
        2. AI 초안
      </h2>
      {generatingIdeaId != null ? (
        <p className="mb-3 animate-pulse text-xs text-[var(--brand)]">초안을 작성하는 중…</p>
      ) : null}
      <ul className="space-y-3">
        {drafts.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-sm text-[var(--muted)]">
            글감에서 「초안 생성」을 누르면 여기에 나타납니다.
          </li>
        ) : (
          drafts.map((draft) => (
            <li
              key={draft.id}
              className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 transition duration-300 ease-out"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--ink)]">{draft.title || "제목 없음"}</p>
                <span className="rounded-full bg-[var(--canvas)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
                  {draft.status}
                </span>
              </div>
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[var(--muted)]">
                {draft.content.slice(0, 600)}
                {draft.content.length > 600 ? "…" : ""}
              </p>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
