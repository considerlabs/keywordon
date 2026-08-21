"use client";

import { FormEvent, useState } from "react";
import { ExportActions } from "@/components/write/export-actions";

export function ImageForm() {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("깔끔하고 현대적인");
  const [brief, setBrief] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setBrief("");

    try {
      const response = await fetch("/api/write/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, style }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "이미지 브리프 생성에 실패했습니다.");
      }

      const text = await response.text();
      if (!text.trim()) throw new Error("생성된 이미지 브리프가 없습니다. 다시 시도해 주세요.");
      setBrief(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "이미지 브리프 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Image Brief
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          이미지 브리프 만들기
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          이미지 생성 프롬프트·알트 텍스트를 만듭니다. 이미지 파일 자체는 생성하지 않습니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={submit}
          className="space-y-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6"
        >
          <label className="block text-sm font-semibold text-[var(--ink)]">
            이미지 주제
            <textarea
              required
              maxLength={200}
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="예: 주말 아침, 햇살이 드는 거실에서 커피를 마시는 장면"
              className="mt-2 min-h-28 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
            />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink)]">
            스타일 <span className="font-normal text-[var(--muted)]">(선택)</span>
            <input
              maxLength={80}
              value={style}
              onChange={(event) => setStyle(event.target.value)}
              placeholder="예: 따뜻한 필름 사진, 미니멀 일러스트"
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-[var(--radius-cta)] bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "이미지 브리프를 만들고 있어요..." : "이미지 브리프 생성하기"}
          </button>
        </form>

        <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-sm font-semibold text-[var(--ink)]">이미지 브리프</p>
          {error ? <p className="mt-4 text-sm text-[var(--accent)]">{error}</p> : null}
          {!brief && !error && !loading ? (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              주제와 원하는 스타일을 입력하면 구도, 색상, 캡션, 알트 텍스트와 생성 프롬프트를
              제안합니다.
            </p>
          ) : null}
          {loading ? <p className="mt-4 text-sm text-[var(--muted)]">브리프를 준비하고 있어요...</p> : null}
          {brief ? <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--ink)]">{brief}</div> : null}
          {brief ? <ExportActions draft={brief} title={`${topic || "image-brief"} 이미지 브리프`} /> : null}
        </section>
      </div>
    </main>
  );
}
