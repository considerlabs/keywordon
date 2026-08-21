"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { QuotaBanner } from "@/components/quota-banner";
import { ShortformExportActions } from "@/components/shortform/export-actions";
import type { ShortformScript } from "@/lib/shortform/types";

type Project = {
  id: number;
  title: string;
  sourceUrl: string | null;
  script: ShortformScript | null;
  status: string;
  meta: Record<string, unknown> | null;
};

type EditorStatus = "loading" | "ready" | "login" | "plan" | "error" | "quota" | "generating";

type ShortformEditorProps = {
  projectId: number;
};

const emptyScript: ShortformScript = {
  hook: "",
  scenes: [{ label: "씬 1", narration: "", subtitle: "", visual: "" }],
  fullNarration: "",
  cta: "",
};

export function ShortformEditor({ projectId }: ShortformEditorProps) {
  const [status, setStatus] = useState<EditorStatus>("loading");
  const [message, setMessage] = useState("");
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState("");
  const [script, setScript] = useState<ShortformScript>(emptyScript);
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setMessage("");
    try {
      const response = await fetch(`/api/shortform/${projectId}`);
      if (response.status === 401) {
        setStatus("login");
        return;
      }
      if (response.status === 403) {
        setStatus("plan");
        return;
      }
      if (response.status === 404) {
        setStatus("error");
        setMessage("프로젝트를 찾을 수 없습니다.");
        return;
      }
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setStatus("error");
        setMessage(data.error ?? "프로젝트를 불러오지 못했습니다.");
        return;
      }
      const data = (await response.json()) as { project: Project };
      setProject(data.project);
      setTitle(data.project.title);
      if (data.project.script) {
        setScript(data.project.script);
      }
      setStatus("ready");
    } catch {
      setStatus("error");
      setMessage("네트워크 오류로 프로젝트를 불러오지 못했습니다.");
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateScript() {
    setStatus("generating");
    setMessage("");
    try {
      const response = await fetch(`/api/shortform/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        project?: Project;
        script?: ShortformScript;
      };
      if (response.status === 429) {
        setStatus("quota");
        setMessage(data.error ?? "월간 한도를 초과했습니다.");
        return;
      }
      if (!response.ok) {
        setStatus("ready");
        setMessage(data.error ?? "대본 생성에 실패했습니다.");
        return;
      }
      if (data.project) setProject(data.project);
      if (data.script) setScript(data.script);
      setMonthlyUsed((used) => used + 1);
      setStatus("ready");
      setMessage("대본이 생성되었습니다. 훅·씬·나레이션을 편집한 뒤 내보내세요.");
    } catch {
      setStatus("ready");
      setMessage("네트워크 오류로 대본을 생성하지 못했습니다.");
    }
  }

  async function saveScript() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/shortform/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, script, status: "ready" }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        project?: Project;
      };
      if (!response.ok) {
        setMessage(data.error ?? "저장하지 못했습니다.");
        return;
      }
      if (data.project) setProject(data.project);
      setMessage("대본을 저장했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function updateScene(index: number, field: keyof ShortformScript["scenes"][0], value: string) {
    setScript((current) => ({
      ...current,
      scenes: current.scenes.map((scene, i) =>
        i === index ? { ...scene, [field]: value } : scene,
      ),
    }));
  }

  function addScene() {
    setScript((current) => ({
      ...current,
      scenes: [
        ...current.scenes,
        {
          label: `씬 ${current.scenes.length + 1}`,
          narration: "",
          subtitle: "",
          visual: "",
        },
      ],
    }));
  }

  const quotaUsage = {
    aiUsed: monthlyUsed,
    aiLimit: monthlyLimit || 1,
    aiRemaining: Math.max(0, (monthlyLimit || 1) - monthlyUsed),
    aiPercent: monthlyLimit > 0 ? Math.round((monthlyUsed / monthlyLimit) * 100) : 100,
    aiIncluded: monthlyLimit > 0,
  };

  const hasScript = Boolean(script.hook.trim() || script.scenes.some((s) => s.narration.trim()));

  return (
    <div className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-6">
        <Link href="/shortform" className="text-sm font-semibold text-[var(--brand)] hover:underline">
          ← 숏폼 허브
        </Link>
      </div>

      {status === "loading" ? <p className="text-[var(--muted)]">불러오는 중…</p> : null}
      {status === "generating" ? (
        <p className="text-[var(--muted)]">AI가 대본을 생성하는 중… (훅·씬·나레이션)</p>
      ) : null}

      {status === "login" ? (
        <EmptyState
          title="로그인이 필요합니다"
          description="숏폼 프로젝트는 로그인 후 이용할 수 있습니다."
          action={{ href: "/sign-in", label: "로그인" }}
        />
      ) : null}

      {status === "plan" ? <PlanGate featureLabel="숏폼 대본" planName="베이직" /> : null}

      {status === "quota" ? (
        <QuotaBanner usage={quotaUsage} href="/account/usage" />
      ) : null}

      {status === "error" ? (
        <EmptyState
          title="프로젝트를 열 수 없습니다"
          description={message}
          action={{ href: "/shortform", label: "허브로 돌아가기" }}
        />
      ) : null}

      {status === "ready" || status === "quota" || status === "generating" ? (
        <>
          {message ? <p className="mb-4 text-sm text-[var(--muted)]">{message}</p> : null}

          <header className="mb-6">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              className="w-full border-0 border-b border-[var(--line)] bg-transparent pb-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
            />
            {project?.sourceUrl ? (
              <p className="mt-2 truncate text-sm text-[var(--muted)]">원본: {project.sourceUrl}</p>
            ) : null}
          </header>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void generateScript()}
              disabled={status === "generating"}
              className="rounded-[var(--radius-cta)] bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-ink)] disabled:opacity-50"
            >
              {hasScript ? "대본 다시 생성" : "대본 생성"}
            </button>
            <button
              type="button"
              onClick={() => void saveScript()}
              disabled={busy}
              className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:border-[var(--brand)] disabled:opacity-50"
            >
              {busy ? "저장 중…" : "저장"}
            </button>
          </div>

          <section className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">훅</h2>
            <textarea
              value={script.hook}
              onChange={(e) => setScript((s) => ({ ...s, hook: e.target.value }))}
              rows={2}
              placeholder="첫 1~3초용 문장"
              className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </section>

          <section className="mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
                씬
              </h2>
              <button
                type="button"
                onClick={addScene}
                className="text-sm font-semibold text-[var(--brand)] hover:underline"
              >
                + 씬 추가
              </button>
            </div>
            {script.scenes.map((scene, index) => (
              <article
                key={`scene-${index}`}
                className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4"
              >
                <input
                  value={scene.label}
                  onChange={(e) => updateScene(index, "label", e.target.value)}
                  className="mb-3 w-full border-0 border-b border-[var(--line)] bg-transparent pb-1 text-sm font-semibold text-[var(--ink)] focus:border-[var(--brand)] focus:outline-none"
                />
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">나레이션</label>
                <textarea
                  value={scene.narration}
                  onChange={(e) => updateScene(index, "narration", e.target.value)}
                  rows={2}
                  className="mb-3 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                />
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">자막</label>
                <textarea
                  value={scene.subtitle}
                  onChange={(e) => updateScene(index, "subtitle", e.target.value)}
                  rows={2}
                  className="mb-3 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                />
                <label className="mb-1 block text-xs font-semibold text-[var(--muted)]">화면 연출</label>
                <textarea
                  value={scene.visual}
                  onChange={(e) => updateScene(index, "visual", e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
                />
              </article>
            ))}
          </section>

          <section className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">
              전체 나레이션
            </h2>
            <textarea
              value={script.fullNarration}
              onChange={(e) => setScript((s) => ({ ...s, fullNarration: e.target.value }))}
              rows={4}
              className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </section>

          <section className="mb-6 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--brand)]">CTA</h2>
            <textarea
              value={script.cta}
              onChange={(e) => setScript((s) => ({ ...s, cta: e.target.value }))}
              rows={2}
              placeholder="저장·댓글·프로필 이동 등"
              className="mt-2 w-full rounded-lg border border-[var(--line)] px-3 py-2 text-sm"
            />
          </section>

          {hasScript ? (
            <ShortformExportActions title={title || "숏폼 대본"} script={script} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
