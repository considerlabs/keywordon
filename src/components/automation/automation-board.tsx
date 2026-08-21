"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { QuotaBanner } from "@/components/quota-banner";
import { IdeaColumn } from "@/components/automation/idea-column";
import { DraftColumn } from "@/components/automation/draft-column";
import { PublishColumn } from "@/components/automation/publish-column";

type Idea = {
  id: number;
  title: string;
  keyword: string | null;
  source: string;
  monthlyVolume: number | null;
};

type Suggestion = {
  id: string;
  title: string;
  keyword: string;
  monthlyVolume?: number;
};

type Draft = {
  id: number;
  ideaId: number | null;
  title: string;
  content: string;
  status: "draft" | "ready" | "exported";
  exportedAt: string | null;
};

type BoardStatus = "loading" | "ready" | "login" | "plan" | "error" | "quota";

export function AutomationBoard() {
  const [status, setStatus] = useState<BoardStatus>("loading");
  const [message, setMessage] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [dailyUsed, setDailyUsed] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(0);
  const [generatingIdeaId, setGeneratingIdeaId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setMessage("");
    try {
      const [ideasRes, draftsRes] = await Promise.all([
        fetch("/api/automation/ideas"),
        fetch("/api/automation/drafts"),
      ]);

      if (ideasRes.status === 401 || draftsRes.status === 401) {
        setStatus("login");
        return;
      }
      if (ideasRes.status === 403 || draftsRes.status === 403) {
        setStatus("plan");
        return;
      }

      if (!ideasRes.ok) {
        const data = (await ideasRes.json().catch(() => ({}))) as { error?: string };
        setStatus("error");
        setMessage(data.error ?? "글감을 불러오지 못했습니다.");
        return;
      }
      if (!draftsRes.ok) {
        const data = (await draftsRes.json().catch(() => ({}))) as { error?: string };
        setStatus("error");
        setMessage(data.error ?? "초안을 불러오지 못했습니다.");
        return;
      }

      const ideasJson = (await ideasRes.json()) as {
        ideas: Idea[];
        suggestions: Suggestion[];
        dailyUsed: number;
        dailyLimit: number;
      };
      const draftsJson = (await draftsRes.json()) as { drafts: Draft[] };

      setIdeas(ideasJson.ideas);
      setSuggestions(ideasJson.suggestions);
      setDailyUsed(ideasJson.dailyUsed);
      setDailyLimit(ideasJson.dailyLimit);
      setDrafts(draftsJson.drafts);
      setStatus("ready");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 보드를 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    // Mount fetch for kanban board.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function addIdea(input: {
    title: string;
    keyword?: string;
    source?: string;
    monthlyVolume?: number;
  }) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/automation/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        idea?: Idea;
      };
      if (response.status === 429) {
        setStatus("quota");
        setMessage(data.error ?? "일일 글감 한도를 초과했습니다.");
        return;
      }
      if (!response.ok) {
        setMessage(data.error ?? "글감을 추가하지 못했습니다.");
        return;
      }
      if (data.idea) {
        setIdeas((current) => [data.idea!, ...current]);
        setDailyUsed((used) => used + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  async function generateDraft(ideaId: number) {
    setGeneratingIdeaId(ideaId);
    setMessage("");
    try {
      const response = await fetch("/api/automation/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        draft?: Draft;
      };
      if (response.status === 429) {
        setStatus("quota");
        setMessage(data.error ?? "AI 월간 한도를 초과했습니다.");
        return;
      }
      if (!response.ok) {
        setMessage(data.error ?? "초안 생성에 실패했습니다.");
        return;
      }
      if (data.draft) {
        setDrafts((current) => [data.draft!, ...current]);
        setMessage("초안이 준비되었습니다. 발행 열에서 내보내세요.");
      }
    } finally {
      setGeneratingIdeaId(null);
    }
  }

  async function markExported(draftId: number) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/automation/drafts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draftId, status: "exported" }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        draft?: Draft;
      };
      if (!response.ok) {
        setMessage(data.error ?? "상태를 변경하지 못했습니다.");
        return;
      }
      if (data.draft) {
        setDrafts((current) =>
          current.map((item) => (item.id === data.draft!.id ? data.draft! : item)),
        );
        setMessage("발행 완료로 표시했습니다.");
      }
    } finally {
      setBusy(false);
    }
  }

  function onManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const keyword = String(form.get("keyword") ?? "").trim();
    if (!title) return;
    void addIdea({ title, keyword: keyword || title, source: "manual" });
    event.currentTarget.reset();
  }

  const activeDrafts = drafts.filter((d) => d.status === "draft" || d.status === "ready");
  const publishDrafts = drafts.filter((d) => d.status === "ready" || d.status === "exported");

  const quotaUsage = {
    aiUsed: dailyUsed,
    aiLimit: Math.max(dailyLimit, 1),
    aiRemaining: Math.max(0, dailyLimit - dailyUsed),
    aiPercent: dailyLimit > 0 ? Math.round((dailyUsed / dailyLimit) * 100) : 100,
    aiIncluded: dailyLimit > 0,
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          AI 자동화
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
          글감 → 초안 → 발행
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          네이버 디렉터리 인기 글을 바탕으로 오늘의 글감을 고르고, AI 초안 후 복사·MD·네이버로 반자동 발행하세요.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <Link
            href="/audit"
            className="rounded-full border border-[var(--line)] px-3.5 py-2 font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
          >
            게시글 진단
          </Link>
          <Link
            href="/shortform"
            className="rounded-full border border-[var(--line)] px-3.5 py-2 font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
          >
            숏폼 대본
          </Link>
          <span className="rounded-full border border-dashed border-[var(--line)] px-3.5 py-2 text-[var(--muted)]">
            Chrome 확장으로 발행 보조 (설치 안내는 계정 설정에서)
          </span>
        </div>
      </header>

      {status === "loading" ? (
        <p className="text-[var(--muted)]">보드를 불러오는 중…</p>
      ) : null}

      {status === "login" ? (
        <EmptyState
          title="로그인이 필요합니다"
          description="AI 자동화 칸반은 로그인 후 이용할 수 있습니다."
          action={{ href: "/sign-in", label: "로그인" }}
        />
      ) : null}

      {status === "plan" ? <PlanGate featureLabel="AI 자동화" planName="베이직" /> : null}

      {status === "quota" ? (
        <QuotaBanner usage={quotaUsage} href="/account/usage" />
      ) : null}

      {status === "error" ? (
        <EmptyState
          title="보드를 열 수 없습니다"
          description={message || "잠시 후 다시 시도해 주세요."}
          action={{ href: "/automation", label: "다시 시도" }}
        />
      ) : null}

      {status === "ready" || status === "quota" ? (
        <>
          {message ? <p className="mb-4 text-sm text-[var(--muted)]">{message}</p> : null}
          <div className="grid gap-4 md:grid-cols-3">
            <IdeaColumn
              ideas={ideas}
              suggestions={suggestions}
              dailyUsed={dailyUsed}
              dailyLimit={dailyLimit}
              busy={busy}
              generatingIdeaId={generatingIdeaId}
              onManualSubmit={onManualSubmit}
              onAddSuggestion={(item) =>
                void addIdea({
                  title: item.title,
                  keyword: item.keyword,
                  source: "suggestion",
                  monthlyVolume: item.monthlyVolume,
                })
              }
              onGenerate={(id) => void generateDraft(id)}
            />
            <DraftColumn drafts={activeDrafts} generatingIdeaId={generatingIdeaId} />
            <PublishColumn
              drafts={publishDrafts}
              busy={busy}
              onMarkExported={(id) => void markExported(id)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
