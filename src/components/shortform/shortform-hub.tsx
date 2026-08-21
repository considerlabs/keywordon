"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { QuotaBanner } from "@/components/quota-banner";
import { ImportPostsModal } from "@/components/shortform/import-posts-modal";
import { useExamplePlaceholder } from "@/lib/use-example-placeholder";

type Project = {
  id: number;
  title: string;
  sourceUrl: string | null;
  status: string;
  updatedAt: string;
};

type PopularItem = {
  id: string;
  title: string;
  platform: string;
  views: string;
};

type HubStatus = "loading" | "ready" | "login" | "plan" | "error" | "quota";

export function ShortformHub() {
  const router = useRouter();
  const [status, setStatus] = useState<HubStatus>("loading");
  const [message, setMessage] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [popular, setPopular] = useState<PopularItem[]>([]);
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [title, setTitle] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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
        popular: PopularItem[];
        monthlyUsed: number;
        monthlyLimit: number;
      };
      setProjects(data.projects);
      setPopular(data.popular);
      setMonthlyUsed(data.monthlyUsed);
      setMonthlyLimit(data.monthlyLimit);
      setStatus(data.monthlyLimit <= 0 ? "plan" : "ready");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 목록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createProject(input: {
    title?: string;
    sourceUrl?: string;
    sourceText?: string;
  }) {
    setBusy(true);
    setMessage("");
    try {
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
        return;
      }
      if (!response.ok) {
        setMessage(data.error ?? "프로젝트를 만들지 못했습니다.");
        return;
      }
      if (data.project) {
        router.push(`/shortform/${data.project.id}`);
      }
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void createProject({
      title: title.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      sourceText: sourceText.trim() || undefined,
    });
  }

  const quotaUsage = {
    aiUsed: monthlyUsed,
    aiLimit: monthlyLimit,
    aiRemaining: Math.max(0, monthlyLimit - monthlyUsed),
    aiPercent: monthlyLimit > 0 ? Math.round((monthlyUsed / monthlyLimit) * 100) : 100,
    aiIncluded: monthlyLimit > 0,
  };

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          New · 숏폼
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--ink)]">
          블로그 글 → 숏폼 대본
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          URL 또는 내 글을 불러와 훅·씬·나레이션 대본을 만들고 CapCut/Canva로 내보내세요.
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

      {status === "plan" ? (
        <PlanGate featureLabel="숏폼 대본" planName="베이직" />
      ) : null}

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
          {message ? <p className="mb-4 text-sm text-[var(--muted)]">{message}</p> : null}

          <section className="mb-8 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-6">
            <h2 className="text-lg font-bold text-[var(--ink)]">새 프로젝트</h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-4">
              <div>
                <label htmlFor="sf-title" className="mb-1 block text-sm font-semibold text-[var(--ink)]">
                  프로젝트 제목 (선택)
                </label>
                <input
                  id="sf-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder={titleExample.placeholder}
                  onFocus={titleExample.onFocus}
                  onBlur={titleExample.onBlur}
                  className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="sf-url" className="mb-1 block text-sm font-semibold text-[var(--ink)]">
                  블로그 URL
                </label>
                <input
                  id="sf-url"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder={urlExample.placeholder}
                  onFocus={urlExample.onFocus}
                  onBlur={urlExample.onBlur}
                  className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                />
                <p className="mt-1 text-xs text-[var(--muted)]">
                  네이버 블로그·티스토리 https URL만 지원합니다.
                </p>
              </div>
              <div>
                <label htmlFor="sf-text" className="mb-1 block text-sm font-semibold text-[var(--ink)]">
                  또는 본문 붙여넣기
                </label>
                <textarea
                  id="sf-text"
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value)}
                  rows={4}
                  placeholder={textExample.placeholder}
                  onFocus={textExample.onFocus}
                  onBlur={textExample.onBlur}
                  className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy || (!sourceUrl.trim() && !sourceText.trim())}
                  className="rounded-[var(--radius-cta)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "만드는 중…" : "프로젝트 만들기"}
                </button>
                <button
                  type="button"
                  onClick={() => setImportOpen(true)}
                  className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)]"
                >
                  내 글 불러오기
                </button>
              </div>
            </form>
            <p className="mt-3 text-xs text-[var(--muted)]">
              이번 달 대본 생성 {monthlyUsed}/{monthlyLimit}회 사용
            </p>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">인기 숏폼 TOP</h2>
            <p className="mb-4 text-sm text-[var(--muted)]">큐레이션 목업 — 추후 실데이터로 대체됩니다.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {popular.map((item) => (
                <article
                  key={item.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
                >
                  <p className="text-xs font-semibold text-[var(--brand)]">{item.platform}</p>
                  <h3 className="mt-1 font-semibold text-[var(--ink)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted)]">조회 {item.views}</p>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">내 프로젝트</h2>
            {projects.length === 0 ? (
              <EmptyState
                title="프로젝트가 없습니다"
                description="URL 또는 본문으로 첫 숏폼 대본 프로젝트를 만들어 보세요."
              />
            ) : (
              <ul className="space-y-2">
                {projects.map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/shortform/${project.id}`}
                      className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--brand)]"
                    >
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{project.title}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {project.status === "ready"
                            ? "대본 준비됨"
                            : project.status === "exported"
                              ? "내보내기 완료"
                              : "초안"}
                        </p>
                      </div>
                      <span className="text-sm text-[var(--brand)]">열기 →</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
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
