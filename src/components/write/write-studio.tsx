"use client";

import { FormEvent, useMemo, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { QuotaBanner } from "@/components/quota-banner";
import { ExportActions } from "@/components/write/export-actions";
import { TrendTopics } from "@/components/write/trend-topics";
import { CHAR_COUNTS, POST_TYPES, TONE_PRESETS, type WritePromptFlags } from "@/lib/write/types";

type StudioStatus = "idle" | "streaming" | "done" | "error" | "quota" | "login" | "plan";

const quotaUsage = {
  aiUsed: 1,
  aiLimit: 1,
  aiRemaining: 0,
  aiPercent: 100,
  aiIncluded: true,
};

export function WriteStudio() {
  const [postType, setPostType] = useState<(typeof POST_TYPES)[number]["id"]>("travel");
  const [title, setTitle] = useState("");
  const [keywordText, setKeywordText] = useState("");
  const [trendTopics, setTrendTopics] = useState<string[]>([]);
  const [charCount, setCharCount] = useState<(typeof CHAR_COUNTS)[number]>(1000);
  const [tone, setTone] = useState<(typeof TONE_PRESETS)[number]>("자동 설정");
  const [emphasis, setEmphasis] = useState("");
  const [flags, setFlags] = useState<WritePromptFlags>({
    useLatestSearch: true,
    hashtags: true,
    seoInsights: false,
  });
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<StudioStatus>("idle");
  const [message, setMessage] = useState("");

  const keywords = useMemo(
    () =>
      keywordText
        .split(/[,|\n]/)
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .slice(0, 5),
    [keywordText],
  );

  function pickTopic(topic: string) {
    setTitle(topic);
    setKeywordText((current) => {
      const currentKeywords = current
        .split(/[,|\n]/)
        .map((keyword) => keyword.trim())
        .filter(Boolean);
      return [...new Set([topic, ...currentKeywords])].slice(0, 5).join(", ");
    });
  }

  function useFirstTrend() {
    const firstTrend = trendTopics[0];
    if (firstTrend) pickTopic(firstTrend);
  }

  function toggleFlag(flag: keyof WritePromptFlags) {
    setFlags((current) => ({ ...current, [flag]: !current[flag] }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("streaming");
    setMessage("");
    setDraft("");

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords,
          title,
          postType,
          charCount,
          tone,
          emphasis,
          flags,
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
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "AI 생성에 실패했습니다.");
      setStatus("error");
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Write Studio
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          검색 의도를 담은 블로그 초안
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          글의 목적과 키워드를 정하면 바로 편집 가능한 초안을 만듭니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form
          onSubmit={submit}
          className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 sm:p-6"
        >
          <div className="space-y-5">
            <label className="block text-sm font-semibold text-[var(--ink)]">
              글 유형
              <select
                value={postType}
                onChange={(event) => setPostType(event.target.value as typeof postType)}
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--brand)]"
              >
                {POST_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-semibold text-[var(--ink)]">
              제목
              <span className="float-right font-normal text-[var(--muted)]">{title.length}/50</span>
              <input
                value={title}
                maxLength={50}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="예: 여름 휴가를 더 알차게 보내는 방법"
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
              />
            </label>

            <div>
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="write-keywords" className="text-sm font-semibold text-[var(--ink)]">
                  핵심 키워드 <span className="font-normal text-[var(--muted)]">(최대 5개)</span>
                </label>
                <button
                  type="button"
                  onClick={useFirstTrend}
                  disabled={!trendTopics.length}
                  className="text-sm font-semibold text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  자동입력
                </button>
              </div>
              <input
                id="write-keywords"
                value={keywordText}
                onChange={(event) => setKeywordText(event.target.value)}
                placeholder="키워드를 쉼표로 구분해 입력하세요"
                className="mt-2 w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
              />
              {keywords.length ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {keywords.map((keyword) => (
                    <span key={keyword} className="rounded-full bg-[var(--brand-soft)] px-2.5 py-1 text-xs text-[var(--brand-ink)]">
                      {keyword}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <details className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
              <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">고급 설정</summary>
              <div className="mt-5 space-y-5">
                <fieldset>
                  <legend className="text-sm font-semibold text-[var(--ink)]">분량</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CHAR_COUNTS.map((count) => (
                      <label key={count} className="cursor-pointer">
                        <input
                          type="radio"
                          name="charCount"
                          value={count}
                          checked={charCount === count}
                          onChange={() => setCharCount(count)}
                          className="sr-only"
                        />
                        <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm ${charCount === count ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]" : "border-[var(--line)] text-[var(--muted)]"}`}>
                          {count.toLocaleString()}자
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="text-sm font-semibold text-[var(--ink)]">말투</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {TONE_PRESETS.map((preset) => (
                      <label key={preset} className="cursor-pointer">
                        <input
                          type="radio"
                          name="tone"
                          value={preset}
                          checked={tone === preset}
                          onChange={() => setTone(preset)}
                          className="sr-only"
                        />
                        <span className={`inline-flex rounded-full border px-3 py-1.5 text-sm ${tone === preset ? "border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--brand-ink)]" : "border-[var(--line)] text-[var(--muted)]"}`}>
                          {preset}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <label className="block text-sm font-semibold text-[var(--ink)]">
                  꼭 담을 내용
                  <span className="float-right font-normal text-[var(--muted)]">{emphasis.length}/300</span>
                  <textarea
                    value={emphasis}
                    maxLength={300}
                    onChange={(event) => setEmphasis(event.target.value)}
                    rows={3}
                    placeholder="강조할 경험, 정보, 표현을 적어 주세요"
                    className="mt-2 w-full resize-y rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--brand)]"
                  />
                </label>

                <div className="space-y-2">
                  {[
                    ["useLatestSearch", "최신 검색 흐름 반영"],
                    ["hashtags", "해시태그 제안"],
                    ["seoInsights", "SEO 포인트 포함"],
                  ].map(([flag, label]) => (
                    <label key={flag} className="flex cursor-pointer items-center gap-2 text-sm text-[var(--ink)]">
                      <input
                        type="checkbox"
                        checked={flags[flag as keyof WritePromptFlags]}
                        onChange={() => toggleFlag(flag as keyof WritePromptFlags)}
                        className="accent-[var(--brand)]"
                      />
                      {label}
                    </label>
                  ))}
                  <label className="flex cursor-not-allowed items-center gap-2 text-sm text-[var(--muted)]">
                    <input type="checkbox" disabled />
                    페르소나 사용 <span className="text-xs">페르소나는 곧 연결됩니다</span>
                  </label>
                </div>
              </div>
            </details>

            <button
              type="submit"
              disabled={status === "streaming" || keywords.length === 0}
              className="w-full rounded-full bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "streaming" ? "초안을 작성하고 있어요..." : "초안 생성하기"}
            </button>
          </div>
        </form>

        <section className="space-y-4">
          <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--brand-soft)] p-4 text-sm leading-6 text-[var(--ink)]">
            생성 결과는 초안입니다. 브랜드 정보와 사실관계를 확인한 뒤 발행하세요.
          </div>
          <TrendTopics onPick={pickTopic} onTopicsChange={setTrendTopics} />

          {status === "login" ? (
            <EmptyState
              title="로그인이 필요합니다"
              description={message || "글쓰기 AI를 사용하려면 로그인해 주세요."}
              action={{ href: "/sign-in?redirect_url=%2Fwrite", label: "로그인하기" }}
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
            <p className="text-sm font-semibold text-[var(--ink)]">초안 미리보기</p>
            {status === "error" ? <p className="mt-4 text-sm text-[var(--accent)]">{message}</p> : null}
            {status === "idle" ? (
              <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
                키워드와 글 유형을 설정한 뒤 초안 생성하기를 눌러 주세요.
              </p>
            ) : null}
            {status === "streaming" && !draft ? (
              <p className="mt-4 text-sm text-[var(--muted)]">초안을 준비하고 있어요...</p>
            ) : null}
            {draft ? <div className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[var(--ink)]">{draft}</div> : null}
            {status === "done" ? <ExportActions draft={draft} title={title} /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
