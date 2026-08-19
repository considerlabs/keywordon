"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export default function CopilotPage() {
  const [keyword, setKeyword] = useState("캠핑 용품");
  const [tone, setTone] = useState("전문적이면서 친근한");
  const [intent, setIntent] = useState("블로그 포스팅");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOutput("");

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, tone, intent }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        if (contentType.includes("application/json")) {
          const payload = (await response.json()) as {
            error?: string;
            model?: string;
          };
          throw new Error(
            payload.model
              ? `${payload.error ?? "AI 생성 실패"} (model: ${payload.model})`
              : (payload.error ?? "AI 생성에 실패했습니다."),
          );
        }
        throw new Error("AI 생성에 실패했습니다.");
      }

      // Non-stream plain text or streamed chunks
      const reader = response.body?.getReader();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다.");
      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setOutput(text);
      }

      if (!text.trim()) {
        throw new Error("생성된 내용이 없습니다. 다시 시도해 주세요.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Copilot AI
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          AI 글쓰기 어시스턴트
        </h1>
      <p className="mt-2 text-[var(--muted)]">
        키워드 분석 결과를 반영해 블로그·랜딩 초안을 생성합니다. Gemini 3.6 Flash 사용.
        Google AI Studio의 <code className="text-[var(--ink)]">AIza...</code> API 키가
        서버에 등록되어 있어야 합니다.
      </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="mb-6 grid gap-3 rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5 md:grid-cols-3"
      >
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="rounded-2xl bg-[var(--canvas)] px-4 py-3 outline-none ring-1 ring-black/5"
          placeholder="키워드"
        />
        <input
          value={intent}
          onChange={(e) => setIntent(e.target.value)}
          className="rounded-2xl bg-[var(--canvas)] px-4 py-3 outline-none ring-1 ring-black/5"
          placeholder="의도 (블로그/랜딩)"
        />
        <input
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="rounded-2xl bg-[var(--canvas)] px-4 py-3 outline-none ring-1 ring-black/5"
          placeholder="톤"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white md:col-span-3"
        >
          {loading ? "생성 중..." : "초안 생성하기"}
        </button>
      </form>

      {error ? (
        <div className="mb-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}{" "}
          <Link href="/shop" className="underline">
            플랜 보기
          </Link>
        </div>
      ) : null}

      <div className="min-h-80 whitespace-pre-wrap rounded-3xl bg-[var(--panel)] p-6 text-[15px] leading-relaxed text-[var(--ink)] ring-1 ring-black/5">
        {output || "생성된 글이 여기에 표시됩니다."}
      </div>
    </div>
  );
}