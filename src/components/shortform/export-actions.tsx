"use client";

import { useState } from "react";
import type { ShortformScript } from "@/lib/shortform/types";
import { formatCanvaExport, formatCapCutExport } from "@/lib/shortform/prompt";

type ShortformExportActionsProps = {
  title: string;
  script: ShortformScript;
};

export function ShortformExportActions({ title, script }: ShortformExportActionsProps) {
  const [message, setMessage] = useState("");
  const capcut = formatCapCutExport(title, script);
  const canva = formatCanvaExport(title, script);
  const plain = [script.hook, ...script.scenes.map((s) => s.narration), script.fullNarration]
    .filter(Boolean)
    .join("\n\n");

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} 형식을 복사했습니다.`);
    } catch {
      setMessage("복사하지 못했습니다. 텍스트를 직접 선택해 복사해 주세요.");
    }
  }

  function download(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`${filename} 파일을 다운로드했습니다.`);
  }

  return (
    <div className="mt-6 border-t border-[var(--line)] pt-4">
      <p className="mb-3 text-sm font-semibold text-[var(--ink)]">내보내기</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copyText(capcut, "CapCut")}
          className="rounded-full bg-[var(--brand)] px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)]"
        >
          CapCut 복사
        </button>
        <button
          type="button"
          onClick={() => void copyText(canva, "Canva")}
          className="rounded-full border border-[var(--line)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
        >
          Canva 복사
        </button>
        <button
          type="button"
          onClick={() => void copyText(plain, "전체")}
          className="rounded-full border border-[var(--line)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
        >
          전체 복사
        </button>
        <button
          type="button"
          onClick={() =>
            download(
              `${title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60)}-capcut.txt`,
              capcut,
            )
          }
          className="rounded-full border border-[var(--line)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
        >
          CapCut 다운로드
        </button>
      </div>
      {message ? <p className="mt-3 text-sm text-[var(--muted)]">{message}</p> : null}
    </div>
  );
}
