"use client";

import { FormEvent, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { QuotaBanner } from "@/components/quota-banner";
import { ExportActions } from "@/components/write/export-actions";

type ToolMode = "title" | "script" | "sns";
type ToolStatus = "idle" | "streaming" | "done" | "error" | "quota" | "login" | "plan";

const TOOL_MODES: Record<
  ToolMode,
  { label: string; description: string; postType: string; intent: string; emphasis: string; charCount: number }
> = {
  title: {
    label: "제목",
    description: "검색 의도와 클릭을 고려한 제목 아이디어를 만듭니다.",
    postType: "info",
    intent: "블로그 제목 아이디어",
    emphasis: "제목만 10개 제안하세요. 핵심 키워드는 앞부분에 자연스럽게 배치하고, 각 제목은 50자 이내로 작성하세요.",
    charCount: 500,
  },
  script: {
    label: "스크립트",
    description: "짧은 영상에 바로 쓸 수 있는 흐름과 대사를 만듭니다.",
    postType: "promo",
    intent: "짧은 영상 스크립트",
    emphasis: "숏폼 영상용 스크립트로 작성하세요. 강한 도입, 핵심 내용, 행동 유도로 나누고 장면 또는 자막 힌트를 함께 제안하세요.",
    charCount: 1000,
  },
  sns: {
    label: "SNS",
    description: "채널에 맞게 다듬은 SNS 게시물 문구를 만듭니다.",
    postType: "promo",
    intent: "SNS 게시물",
    emphasis: "SNS 게시물로 작성하세요. 첫 문장은 시선을 끌게 쓰고, 짧은 문단과 적절한 해시태그를 포함하세요.",
    charCount: 500,
  },
};

const quotaUsage = {
  aiUsed: 1,
  aiLimit: 1,
  aiRemaining: 0,
  aiPercent: 100,
  aiIncluded: true,
};

export function WriteToolHub() {
  const [mode, setMode] = useState<ToolMode>("title");
  const [keyword, setKeyword] = useState("");
  const [brief, setBrief] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<ToolStatus>("idle");
  const [message, setMessage] = useState("");
  const activeTool = TOOL_MODES[mode];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!keyword.trim()) return;

    setStatus("streaming");
    setDraft("");
    setMessage("");

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: [keyword],
          postType: activeTool.postType,
          intent: activeTool.intent,
          charCount: activeTool.charCount,
          tone: "전문적이면서 친근한",
          emphasis: [activeTool.emphasis, brief.trim()].filter(Boolean).join("\n\n"),
          flags: { useLatestSearch: true, hashtags: mode === "sns", seoInsights: mode === "title" },
          usePersona: false,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        setMessage(payload.error ?? "AI 생성에 실패했습니다.");
        setStatus(response.status === 429 ? "quota" : response.status === 401 ? "login" : response.status === 403 ? "plan" : "error");
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("응답을 읽을 수 없습니다.");

      const decoder = new TextDecoder();
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setDraft(text);
      }
      text += decoder.decode();

      if (!text.trim()) throw new Error("생성된 내용이 없습니다. 다시 시도해 주세요.");
      setDraft(text);
      setStatus("done");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI 생성에 실패했습니다.");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">Write tools</p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          빠르게 만드는 글쓰기 도구
        </h1>
        <p className="mt-2 text-[var(--muted)]">키워드와 간단한 요청만 입력하면 필요한 형식으로 바로 생성합니다.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={submit} className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6">
          <div className="flex gap-2 border-b border-[var(--line)] pb-4">
            {(Object.keys(TOOL_MODES) as ToolMode[]).map((toolMode) => (
              <button
                key={toolMode}
                type="button"
                onClick={() => setMode(toolMode)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === toolMode
                    ? "bg-[var(--brand)] text-white"
                    : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)]"
                }`}
              >
                {TOOL_MODES[toolMode].label}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">{activeTool.label} 만들기</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{activeTool.description}</p>
            </div>

            <label className="block text-sm font-semibold text-[var(--ink)]">
              핵심 키워드
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                required
                placeholder="예: 제주도 가족 여행"
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
              />
            </label>

            <label className="block text-sm font-semibold text-[var(--ink)]">
              간단한 요청 <span className="font-normal text-[var(--muted)]">(선택)</span>
              <textarea
                value={brief}
                onChange={(event) => setBrief(event.target.value)}
                maxLength={300}
                rows={4}
                placeholder="대상, 꼭 담고 싶은 내용, 분위기를 적어 주세요"
                className="mt-2 w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
              />
            </label>

            <button
              type="submit"
              disabled={status === "streaming" || !keyword.trim()}
              className="w-full rounded-[var(--radius-cta)] bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "streaming" ? "생성하고 있어요..." : `${activeTool.label} 생성하기`}
            </button>
          </div>
        </form>

        <section className="space-y-4">
          {status === "login" ? (
            <EmptyState
              title="로그인이 필요합니다"
              description={message || "글쓰기 AI를 사용하려면 로그인해 주세요."}
              action={{ href: "/sign-in?redirect_url=%2Fwrite%2Ftools", label: "로그인하기" }}
            />
          ) : null}
          {status === "plan" ? <PlanGate featureLabel="글쓰기 AI" planName="베이직" /> : null}
          {status === "quota" ? (
            <div className="space-y-2">
              {message ? <p className="text-sm text-[var(--accent)]">{message}</p> : null}
              <QuotaBanner usage={quotaUsage} href="/account/usage" />
            </div>
          ) : null}

          <div className="min-h-80 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5">
            <p className="text-sm font-semibold text-[var(--ink)]">{activeTool.label} 결과</p>
            {status === "idle" ? <p className="mt-4 text-sm leading-6 text-[var(--muted)]">키워드를 입력하고 생성하기를 눌러 주세요.</p> : null}
            {status === "streaming" && !draft ? <p className="mt-4 text-sm text-[var(--muted)]">결과를 준비하고 있어요...</p> : null}
            {status === "error" ? <p className="mt-4 text-sm text-[var(--accent)]">{message}</p> : null}
            {draft ? <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--ink)]">{draft}</div> : null}
            {status === "done" ? <ExportActions draft={draft} title={`${keyword} ${activeTool.label}`} /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
