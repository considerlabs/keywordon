"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";

type DraftPreview = {
  id: number;
  title: string;
  content: string;
  status: string;
};

type ImportPostsModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (draft: { title: string; content: string }) => void;
};

export function ImportPostsModal({ open, onClose, onSelect }: ImportPostsModalProps) {
  const [drafts, setDrafts] = useState<DraftPreview[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    setStatus("loading");
    setMessage("");
    void (async () => {
      try {
        const response = await fetch("/api/automation/drafts");
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          setStatus("error");
          setMessage(data.error ?? "초안 목록을 불러오지 못했습니다.");
          return;
        }
        const data = (await response.json()) as { drafts: DraftPreview[] };
        setDrafts(data.drafts.filter((d) => d.content.trim()).slice(0, 20));
        setStatus("idle");
      } catch {
        setStatus("error");
        setMessage("네트워크 오류로 초안을 불러오지 못했습니다.");
      }
    })();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-posts-title"
    >
      <div className="max-h-[80vh] w-full max-w-lg overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-lg">
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
          <h2 id="import-posts-title" className="text-lg font-bold text-[var(--ink)]">
            내 글 불러오기
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-[var(--muted)] hover:bg-[var(--bg)]"
          >
            닫기
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
          {status === "loading" ? (
            <p className="text-sm text-[var(--muted)]">AI 자동화 초안을 불러오는 중…</p>
          ) : null}
          {status === "error" ? (
            <p className="text-sm text-[var(--muted)]">{message}</p>
          ) : null}
          {status === "idle" && drafts.length === 0 ? (
            <EmptyState
              title="불러올 초안이 없습니다"
              description="AI 자동화에서 초안을 만든 뒤 다시 시도해 주세요."
              action={{ href: "/automation", label: "AI 자동화로 이동" }}
            />
          ) : null}
          <ul className="space-y-2">
            {drafts.map((draft) => (
              <li key={draft.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect({ title: draft.title, content: draft.content });
                    onClose();
                  }}
                  className="w-full rounded-lg border border-[var(--line)] px-4 py-3 text-left transition hover:border-[var(--brand)]"
                >
                  <p className="font-semibold text-[var(--ink)]">{draft.title || "제목 없음"}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--muted)]">
                    {draft.content.slice(0, 120)}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-[var(--line)] px-5 py-3 text-right">
          <Link
            href="/automation"
            className="text-sm font-semibold text-[var(--brand)] hover:underline"
          >
            AI 자동화에서 더 만들기
          </Link>
        </div>
      </div>
    </div>
  );
}
