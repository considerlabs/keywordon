"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { QuotaBanner } from "@/components/quota-banner";
import { PERSONA_STEPS } from "@/lib/persona/types";

type PersonaPayload = {
  id: number;
  status: string;
  progressStep: number;
  totalSteps?: number;
  steps?: { index: number; label: string; done: boolean; active: boolean }[];
  blogUrl: string | null;
  tone: Record<string, string> | null;
  structure: Record<string, string> | null;
  audience: { primary: string; interests: string[]; readingLevel: string } | null;
  avoid: { phrases: string[]; tones: string[] } | null;
  summary: string | null;
  errorMessage: string | null;
};

type PersonaStatus = "loading" | "idle" | "analyzing" | "done" | "failed" | "error" | "quota" | "login" | "plan";

export function PersonaPanel() {
  const [blogUrl, setBlogUrl] = useState("");
  const [postsText, setPostsText] = useState("");
  const [persona, setPersona] = useState<PersonaPayload | null>(null);
  const [status, setStatus] = useState<PersonaStatus>("loading");
  const [message, setMessage] = useState("");
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [busy, setBusy] = useState(false);

  const loadPersona = useCallback(async () => {
    try {
      const response = await fetch("/api/persona");
      if (response.status === 401) {
        setStatus("login");
        return;
      }
      if (response.status === 403) {
        setStatus("plan");
        return;
      }
      if (!response.ok) {
        setStatus("error");
        setMessage("페르소나 정보를 불러오지 못했습니다.");
        return;
      }
      const data = (await response.json()) as {
        persona: PersonaPayload | null;
        monthlyUsed: number;
        monthlyLimit: number;
      };
      setPersona(data.persona);
      setMonthlyUsed(data.monthlyUsed);
      setMonthlyLimit(data.monthlyLimit);
      if (data.persona?.status === "analyzing") {
        setStatus("analyzing");
      } else if (data.persona?.status === "done") {
        setStatus("done");
      } else if (data.persona?.status === "failed") {
        setStatus("failed");
      } else {
        setStatus("idle");
      }
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void loadPersona();
  }, [loadPersona]);

  useEffect(() => {
    if (status !== "analyzing") return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/persona/status");
        if (!response.ok) return;
        const data = (await response.json()) as { persona: PersonaPayload | null };
        if (!data.persona) return;
        setPersona(data.persona);
        if (data.persona.status === "done") {
          setStatus("done");
        } else if (data.persona.status === "failed") {
          setStatus("failed");
          setMessage(data.persona.errorMessage ?? "분석에 실패했습니다.");
        }
      } catch {
        /* ignore poll errors */
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [status]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const posts = postsText
      .split(/\n---+\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/persona/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blogUrl: blogUrl.trim() || undefined,
          posts: posts.length > 0 ? posts : undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        progressStep?: number;
        monthlyUsed?: number;
        monthlyLimit?: number;
      };

      if (!response.ok) {
        setMessage(payload.error ?? "분석을 시작하지 못했습니다.");
        setStatus(
          response.status === 429
            ? "quota"
            : response.status === 401
              ? "login"
              : response.status === 403
                ? "plan"
                : "error",
        );
        return;
      }

      if (typeof payload.monthlyUsed === "number") setMonthlyUsed(payload.monthlyUsed);
      if (typeof payload.monthlyLimit === "number") setMonthlyLimit(payload.monthlyLimit);
      setStatus("analyzing");
      void loadPersona();
    } catch {
      setMessage("네트워크 오류로 분석을 시작하지 못했습니다.");
      setStatus("error");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-6xl px-5 py-10 text-[var(--muted)]">불러오는 중...</div>
    );
  }

  if (status === "login") {
    return (
      <EmptyState
        title="로그인이 필요합니다"
        description="내 스타일(페르소나) 학습은 로그인 후 이용할 수 있습니다."
        action={{ label: "로그인", href: "/sign-in" }}
      />
    );
  }

  if (status === "plan") {
    return (
      <PlanGate featureLabel="페르소나" planName="비회원" />
    );
  }

  const steps =
    persona?.steps ??
    PERSONA_STEPS.map((label, index) => ({
      index: index + 1,
      label,
      done: (persona?.progressStep ?? 0) > index,
      active: persona?.status === "analyzing" && persona?.progressStep === index,
    }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Persona
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">페르소나</h1>
        <p className="mt-2 text-[var(--muted)]">
          블로그 URL 또는 글 본문으로 나만의 문체·구조·독자층을 학습해 글쓰기 AI에 주입합니다.
        </p>
      </div>

      {monthlyLimit > 0 ? (
        <p className="mb-4 text-sm text-[var(--muted)]">
          이번 달 분석 {monthlyUsed}/{monthlyLimit}회 사용
        </p>
      ) : null}

      <form onSubmit={submit} className="mb-8 space-y-3">
        <input
          value={blogUrl}
          onChange={(e) => setBlogUrl(e.target.value)}
          className="w-full rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
          placeholder="블로그 URL (선택, 네이버/티스토리 https)"
        />
        <textarea
          value={postsText}
          onChange={(e) => setPostsText(e.target.value)}
          rows={6}
          className="w-full rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
          placeholder="글 본문을 붙여넣기 (여러 글은 --- 로 구분)"
        />
        <button
          type="submit"
          disabled={busy || status === "analyzing"}
          className="rounded-full bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {status === "analyzing" ? "분석 중..." : busy ? "시작 중..." : "페르소나 학습 시작"}
        </button>
      </form>

      {status === "quota" ? (
        <>
          {message ? <p className="mb-4 text-sm text-rose-600">{message}</p> : null}
          <QuotaBanner
            usage={{ aiUsed: 1, aiLimit: 1, aiRemaining: 0, aiPercent: 100, aiIncluded: true }}
          />
        </>
      ) : null}

      {message && (status === "error" || status === "failed") ? (
        <p className="mb-4 text-sm text-rose-600">{message}</p>
      ) : null}

      {(status === "analyzing" || persona?.status === "analyzing") && (
        <section className="mb-8 rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
          <h2 className="mb-4 font-bold">분석 진행 ({persona?.progressStep ?? 0}/5)</h2>
          <ol className="space-y-3">
            {steps.map((step) => (
              <li
                key={step.label}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm ${
                  step.active
                    ? "bg-[var(--brand-soft)] text-[var(--brand-ink)]"
                    : step.done
                      ? "bg-[var(--canvas)] text-[var(--ink)]"
                      : "text-[var(--muted)]"
                }`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    step.done
                      ? "bg-[var(--brand)] text-white"
                      : step.active
                        ? "bg-[var(--brand)] text-white"
                        : "bg-[var(--line)]"
                  }`}
                >
                  {step.index}
                </span>
                <span>{step.label}</span>
                {step.active ? (
                  <span className="ml-auto text-xs text-[var(--muted)]">진행 중</span>
                ) : step.done ? (
                  <span className="ml-auto text-xs text-emerald-700">완료</span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      )}

      {persona?.status === "done" && persona.tone ? (
        <div className="space-y-6">
          {persona.summary ? (
            <section className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
              <h3 className="mb-2 font-bold">요약</h3>
              <p className="text-sm text-[var(--muted)]">{persona.summary}</p>
            </section>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
              <h3 className="mb-4 font-bold">문체</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-[var(--muted)]">스타일</dt>
                  <dd>{persona.tone.style}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">어휘</dt>
                  <dd>{persona.tone.vocabulary}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">문장 길이</dt>
                  <dd>{persona.tone.sentenceLength}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
              <h3 className="mb-4 font-bold">독자층</h3>
              {persona.audience ? (
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-[var(--muted)]">주요 독자</dt>
                    <dd>{persona.audience.primary}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">관심사</dt>
                    <dd>{persona.audience.interests.join(", ")}</dd>
                  </div>
                </dl>
              ) : null}
            </div>
          </section>

          {persona.avoid ? (
            <section className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
              <h3 className="mb-4 font-bold">피해야 할 표현</h3>
              <p className="text-sm text-[var(--muted)]">{persona.avoid.phrases.join(" · ")}</p>
            </section>
          ) : null}
        </div>
      ) : status === "idle" && !persona ? (
        <EmptyState
          title="페르소나를 학습해 보세요"
          description="블로그 URL 또는 2~3개의 대표 글을 입력하면 글쓰기 AI에 문체가 반영됩니다."
        />
      ) : null}
    </div>
  );
}
