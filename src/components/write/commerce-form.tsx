"use client";

import { FormEvent, useState } from "react";
import { ExportActions } from "@/components/write/export-actions";

export function CommerceForm() {
  const [productUrl, setProductUrl] = useState("");
  const [productName, setProductName] = useState("");
  const [tone, setTone] = useState("친근하고 신뢰감 있는");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setDraft("");

    try {
      const response = await fetch("/api/write/commerce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productUrl, productName, tone }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "AI 생성에 실패했습니다.");
      }

      const text = await response.text();
      if (!text.trim()) throw new Error("생성된 내용이 없습니다. 다시 시도해 주세요.");
      setDraft(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Commerce Write
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          상품 소개 글쓰기
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          상품 링크와 이름을 바탕으로 자연스러운 홍보용 블로그 초안을 만듭니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={submit}
          className="space-y-5 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6"
        >
          <label className="block text-sm font-semibold text-[var(--ink)]">
            상품 링크
            <input
              required
              type="url"
              value={productUrl}
              onChange={(event) => setProductUrl(event.target.value)}
              placeholder="https://example.com/product"
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
            />
            <span className="mt-1.5 block text-xs font-normal text-[var(--muted)]">
              HTTPS 링크만 사용할 수 있으며, 페이지 내용을 직접 조회하지 않습니다.
            </span>
          </label>

          <label className="block text-sm font-semibold text-[var(--ink)]">
            상품명 <span className="font-normal text-[var(--muted)]">(선택)</span>
            <input
              value={productName}
              maxLength={120}
              onChange={(event) => setProductName(event.target.value)}
              placeholder="예: 접이식 캠핑 체어"
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
            />
          </label>

          <label className="block text-sm font-semibold text-[var(--ink)]">
            말투
            <select
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--brand)]"
            >
              <option>친근하고 신뢰감 있는</option>
              <option>담백하고 정보 중심의</option>
              <option>발랄하고 생동감 있는</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "초안을 작성하고 있어요..." : "상품 소개 글 생성하기"}
          </button>
        </form>

        <section className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
          <p className="text-sm font-semibold text-[var(--ink)]">초안 미리보기</p>
          {error ? <p className="mt-4 text-sm text-[var(--accent)]">{error}</p> : null}
          {!draft && !error && !loading ? (
            <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
              상품 링크를 입력한 뒤 생성하기를 눌러 주세요.
            </p>
          ) : null}
          {loading ? <p className="mt-4 text-sm text-[var(--muted)]">초안을 준비하고 있어요...</p> : null}
          {draft ? <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--ink)]">{draft}</div> : null}
          {draft ? <ExportActions draft={draft} title={productName || "상품 소개"} /> : null}
        </section>
      </div>
    </main>
  );
}
