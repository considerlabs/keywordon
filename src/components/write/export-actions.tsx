"use client";

import { useState } from "react";

type ExportActionsProps = {
  draft: string;
  title: string;
};

export function ExportActions({ draft, title }: ExportActionsProps) {
  const [message, setMessage] = useState("");
  const isDisabled = !draft.trim();

  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setMessage("초안을 복사했습니다.");
    } catch {
      setMessage("복사하지 못했습니다. 초안을 직접 선택해 복사해 주세요.");
    }
  }

  function downloadMarkdown() {
    const filename = (title.trim() || "keywordon-draft")
      .replace(/[\\/:*?"<>|]/g, "-")
      .slice(0, 80);
    const blob = new Blob([draft], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Markdown 파일을 다운로드했습니다.");
  }

  async function openNaverBlog() {
    await copyDraft();
    window.open("https://blog.naver.com/", "_blank", "noopener,noreferrer");
    setMessage("초안을 복사한 뒤 네이버 글쓰기 창에 붙여넣으세요.");
  }

  return (
    <div className="mt-5 border-t border-[var(--line)] pt-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyDraft()}
          disabled={isDisabled}
          className="rounded-full bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          복사
        </button>
        <button
          type="button"
          onClick={downloadMarkdown}
          disabled={isDisabled}
          className="rounded-full border border-[var(--line)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          MD 다운로드
        </button>
        <button
          type="button"
          onClick={() => void openNaverBlog()}
          disabled={isDisabled}
          className="rounded-full border border-[var(--line)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          네이버 블로그에 붙여넣기
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
