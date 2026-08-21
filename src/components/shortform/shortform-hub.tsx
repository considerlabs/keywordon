"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { QuotaBanner } from "@/components/quota-banner";
import { ImportPostsModal } from "@/components/shortform/import-posts-modal";
import { ShortformExportActions } from "@/components/shortform/export-actions";
import type { PopularShortformItem } from "@/lib/shortform/types";
import type { ShortformScript } from "@/lib/shortform/types";
import { useExamplePlaceholder } from "@/lib/use-example-placeholder";

type Project = {
  id: number;
  title: string;
  sourceUrl: string | null;
  status: string;
  updatedAt: string;
  script: ShortformScript | null;
};

type HubStatus = "loading" | "ready" | "login" | "plan" | "error" | "quota";
type TabId = "source" | "scripts" | "export";

const TABS: { id: TabId; label: string }[] = [
  { id: "source", label: "소스" },
  { id: "scripts", label: "대본" },
  { id: "export", label: "내보내기" },
];

export function ShortformHub() {
  const [status, setStatus] = useState<HubStatus>("loading");
  const [message, setMessage] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [popular, setPopular] = useState<PopularShortformItem[]>([]);
  const [popularSource, setPopularSource] = useState<"live" | "curated">("curated");
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [title, setTitle] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("source");
  const titleExample = useExamplePlaceholder("예: 보험 영업 KPI 3가지");
  const urlExample = useExamplePlaceholder(
    "예: https://blog.naver.com/your-id/223… 또는 https://myblog.tistory.com/…",
  );
  const textExample = useExamplePlaceholder("블로그 본문을 붙여넣으세요…");

  const load = useCallback(async () => {
    setMessage("");
    try {
      const response = await fetch("/api/shortform");
      if (response.status === 401) {
        setStatus("login");
        return;
      }
      if (response.status === 403) {
        setStatus("plan");
        return;
      }
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setStatus("error");
        setMessage(data.error ?? "프로젝트를 불러오지 못했습니다.");
        return;
      }
      const data = (await response.json()) as {
        projects: Project[];
        popular: PopularShortformItem[];
        popularSource?: "live" | "curated";
        monthlyUsed: number;
        monthlyLimit: number;
      };
      setProjects(data.projects);
      setPopular(data.popular);
      setPopularSource(data.popularSource ?? "curated");
      setMonthlyUsed(data.monthlyUsed);
      setMonthlyLimit(data.monthlyLimit);
      setStatus(data.monthlyLimit <= 0 ? "plan" : "ready");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 목록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    // Mount fetch for shortform list.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  async function createProject(input: {
    title?: string;
    sourceUrl?: string;
    sourceText?: string;
  }): Promise<Project | null> {
    const response = await fetch("/api/shortform", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      project?: Project;
    };
    if (response.status === 429) {
      setStatus("quota");
      setMessage(data.error ?? "월간 한도를 초과했습니다.");
      return null;
    }
    if (!response.ok) {
      setMessage(data.error ?? "프로젝트를 만들지 못했습니다.");
      return null;
    }
    return data.project ?? null;
  }

  async function generateForProject(projectId: number): Promise<Project | null> {
    const response = await fetch(`/api/shortform/${projectId}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      project?: Project;
    };
    if (response.status === 429) {
      setStatus("quota");
      setMessage(data.error ?? "월간 한도를 초과했습니다.");
      return null;
    }
    if (!response.ok) {
      setMessage(data.error ?? "대본 생성에 실패했습니다.");
      return null;
    }
    if (data.project) {
      setMonthlyUsed((used) => used + 1);
      return data.project;
    }
    return null;
  }

  async function createAndGenerate(input: {
    title?: string;
    sourceUrl?: string;
    sourceText?: string;
    busyKey?: string;
  }) {
    setBusy(true);
    setGeneratingId(input.busyKey ?? "manual");
    setMessage("");
    try {
      const project = await createProject({
        title: input.title,
        sourceUrl: input.sourceUrl,
        sourceText: input.sourceText,
      });
      if (!project) return;
      const generated = await generateForProject(project.id);
      if (!generated) {
        setProjects((current) => [project, ...current.filter((p) => p.id !== project.id)]);
        setTab("scripts");
        setMessage("프로젝트는 만들어졌습니다. 대본 탭에서 다시 생성해 보세요.");
        return;
      }
      setProjects((current) => [generated, ...current.filter((p) => p.id !== generated.id)]);
      setMessage("대본이 준비되었습니다.");
      setTab("scripts");
    } finally {
      setBusy(false);
      setGeneratingId(null);
    }
  }

  async function markExported(projectId: number) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/shortform/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "exported" }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        project?: Project;
      };
      if (!response.ok) {
        setMessage(data.error ?? "상태를 변경하지 못했습니다.");
        return;
      }
      if (data.project) {
        setProjects((current) =>
          current.map((item) => (item.id === data.project!.id ? { ...item, ...data.project! } : item)),
        );
        setMessage("내보내기 완료로 표시했습니다.");
      }
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createAndGenerate({
      title: title.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      sourceText: sourceText.trim() || undefined,
      busyKey: "manual",
    });
  }

  const scriptProjects = projects.filter(
    (p) => p.script && (p.status === "ready" || p.status === "draft" || p.status === "exported"),
  );
  const exportProjects = projects.filter(
    (p) => p.script && (p.status === "ready" || p.status === "exported"),
  );

  const tabCounts: Record<TabId, number> = {
    source: popular.length,
    scripts: scriptProjects.length,
    export: exportProjects.length,
  };

  const quotaUsage = {
    aiUsed: monthlyUsed,
    aiLimit: monthlyLimit,
    aiRemaining: Math.max(0, monthlyLimit - monthlyUsed),
    aiPercent: monthlyLimit > 0 ? Math.round((monthlyUsed / monthlyLimit) * 100) : 100,
    aiIncluded: monthlyLimit > 0,
  };

  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          숏폼
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
          소스 → 대본 → 내보내기
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          블로그 URL·본문으로 훅·씬·나레이션 대본을 만들고 CapCut/Canva로 내보내세요.
        </p>
      </header>

      {status === "loading" ? <p className="text-[var(--muted)]">불러오는 중…</p> : null}

      {status === "login" ? (
        <EmptyState
          title="로그인이 필요합니다"
          description="숏폼 대본은 로그인 후 이용할 수 있습니다."
          action={{ href: "/sign-in", label: "로그인" }}
        />
      ) : null}

      {status === "plan" ? <PlanGate featureLabel="숏폼 대본" planName="베이직" /> : null}

      {status === "quota" ? (
        <QuotaBanner usage={quotaUsage} href="/account/usage" />
      ) : null}

      {status === "error" ? (
        <EmptyState
          title="목록을 열 수 없습니다"
          description={message || "잠시 후 다시 시도해 주세요."}
          action={{ href: "/shortform", label: "다시 시도" }}
        />
      ) : null}

      {status === "ready" || status === "quota" ? (
        <>
          <div
            role="tablist"
            aria-label="숏폼 단계"
            className="mb-5 flex gap-1 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-1"
          >
            {TABS.map((item) => {
              const selected = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(item.id)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    selected
                      ? "bg-[var(--brand)] text-white"
                      : "text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  {item.label}
                  <span className={`ml-1.5 tabular-nums ${selected ? "text-white/80" : ""}`}>
                    {tabCounts[item.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {message ? <p className="mb-4 text-sm text-[var(--muted)]">{message}</p> : null}

          {tab === "source" ? (
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <div className="mb-4 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-bold text-[var(--ink)]">소스 입력</h2>
                <span className="text-xs text-[var(--muted)]">
                  이번 달 {monthlyUsed}/{monthlyLimit}
                </span>
              </div>

              <form onSubmit={onSubmit} className="mb-6 space-y-3">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder={titleExample.placeholder}
                  onFocus={titleExample.onFocus}
                  onBlur={titleExample.onBlur}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                />
                <input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={urlExample.placeholder}
                  onFocus={urlExample.onFocus}
                  onBlur={urlExample.onBlur}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                />
                <textarea
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={4}
                  placeholder={textExample.placeholder}
                  onFocus={textExample.onFocus}
                  onBlur={textExample.onBlur}
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--brand)]"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={busy || (!sourceUrl.trim() && !sourceText.trim())}
                    className="rounded-[var(--radius-cta)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:opacity-50"
                  >
                    {generatingId === "manual" ? "대본 생성 중…" : "대본 생성"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportOpen(true)}
                    disabled={busy}
                    className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] disabled:opacity-50"
                  >
                    내 글 불러오기
                  </button>
                </div>
              </form>

              <div>
                <p className="mb-2 text-xs font-semibold text-[var(--muted)]">
                  오늘의 추천 ({popularSource === "live" ? "네이버 디렉터리 실시간" : "큐레이션"})
                </p>
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {popular.map((item) => {
                    const loading = generatingId === item.id;
                    return (
                      <li
                        key={item.id}
                        className="flex items-start justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--ink)]">{item.title}</p>
                          <p className="text-xs text-[var(--muted)]">
                            {item.keyword ?? item.platform}
                            {item.views ? ` · ${item.views}` : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            void createAndGenerate({
                              title: item.title,
                              sourceUrl: item.sourceUrl,
                              sourceText: item.sourceUrl
                                ? undefined
                                : [item.title, item.keyword, item.brief].filter(Boolean).join("\n"),
                              busyKey: item.id,
                            })
                          }
                          className="shrink-0 rounded-full bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:opacity-50"
                        >
                          {loading ? "생성 중…" : "대본 생성"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ) : null}

          {tab === "scripts" ? (
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="mb-4 text-sm font-bold text-[var(--ink)]">AI 대본</h2>
              {busy && generatingId ? (
                <p className="mb-3 animate-pulse text-xs text-[var(--brand)]">대본을 작성하는 중…</p>
              ) : null}
              <ul className="space-y-3">
                {scriptProjects.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-8 text-center">
                    <p className="text-sm text-[var(--muted)]">소스 탭에서 대본을 만들어 보세요.</p>
                    <button
                      type="button"
                      onClick={() => setTab("source")}
                      className="mt-3 text-sm font-semibold text-[var(--brand)]"
                    >
                      소스로 이동
                    </button>
                  </li>
                ) : (
                  scriptProjects.map((project) => (
                    <li
                      key={project.id}
                      className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--ink)]">{project.title}</p>
                        <span className="rounded-full bg-[var(--canvas)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--muted)]">
                          {project.status}
                        </span>
                      </div>
                      {project.script?.hook ? (
                        <p className="mb-3 text-xs leading-relaxed text-[var(--muted)]">
                          훅: {project.script.hook.slice(0, 160)}
                          {project.script.hook.length > 160 ? "…" : ""}
                        </p>
                      ) : null}
                      <Link
                        href={`/shortform/${project.id}`}
                        className="text-sm font-semibold text-[var(--brand)] hover:underline"
                      >
                        편집하기 →
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ) : null}

          {tab === "export" ? (
            <section className="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-5">
              <h2 className="mb-2 text-sm font-bold text-[var(--ink)]">내보내기</h2>
              <p className="mb-4 text-xs text-[var(--muted)]">
                CapCut · Canva 텍스트만 지원합니다. 서버 영상 렌더는 없습니다.
              </p>
              <ul className="space-y-4">
                {exportProjects.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-[var(--line)] px-3 py-8 text-center">
                    <p className="text-sm text-[var(--muted)]">대본 탭에서 글을 확인하세요.</p>
                    <button
                      type="button"
                      onClick={() => setTab("scripts")}
                      className="mt-3 text-sm font-semibold text-[var(--brand)]"
                    >
                      대본으로 이동
                    </button>
                  </li>
                ) : (
                  exportProjects.map((project) =>
                    project.script ? (
                      <li
                        key={project.id}
                        className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3"
                      >
                        <p className="text-sm font-semibold text-[var(--ink)]">{project.title}</p>
                        <p className="mt-1 text-[10px] font-semibold uppercase text-[var(--muted)]">
                          {project.status === "exported" ? "내보내기 표시됨" : "내보내기 가능"}
                        </p>
                        <ShortformExportActions title={project.title} script={project.script} />
                        {project.status !== "exported" ? (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void markExported(project.id)}
                            className="mt-3 w-full rounded-full border border-[var(--line)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] disabled:opacity-50"
                          >
                            내보내기 완료로 표시
                          </button>
                        ) : null}
                      </li>
                    ) : null,
                  )
                )}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <ImportPostsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSelect={(draft) => {
          setTitle(draft.title);
          setSourceText(draft.content);
          setSourceUrl("");
        }}
      />
    </div>
  );
}
