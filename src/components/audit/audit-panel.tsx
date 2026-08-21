"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PlanGate } from "@/components/plan-gate";
import { QuotaBanner } from "@/components/quota-banner";
import type { PostAuditReport } from "@/lib/audit/types";
import { useExamplePlaceholder } from "@/lib/use-example-placeholder";

type AuditStatus = "idle" | "analyzing" | "done" | "error" | "quota" | "login" | "plan";

export function AuditPanel() {
  const [postUrl, setPostUrl] = useState("");
  const [targetKeyword, setTargetKeyword] = useState("");
  const [status, setStatus] = useState<AuditStatus>("idle");
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<PostAuditReport | null>(null);
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const urlExample = useExamplePlaceholder("예: https://blog.naver.com/your-id/223456789012");
  const keywordExample = useExamplePlaceholder("예: 캠핑 용품 (선택)");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("analyzing");
    setMessage("");
    setReport(null);

    try {
      const response = await fetch("/api/audit/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postUrl, targetKeyword: targetKeyword || undefined }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        report?: PostAuditReport;
        monthlyUsed?: number;
        monthlyLimit?: number;
      };

      if (!response.ok) {
        setMessage(payload.error ?? "진단에 실패했습니다.");
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

      setReport(payload.report ?? null);
      if (typeof payload.monthlyUsed === "number") setMonthlyUsed(payload.monthlyUsed);
      if (typeof payload.monthlyLimit === "number") setMonthlyLimit(payload.monthlyLimit);
      setStatus("done");
    } catch {
      setMessage("네트워크 오류로 진단을 실행하지 못했습니다.");
      setStatus("error");
    }
  }

  if (status === "login") {
    return (
      <EmptyState
        title="로그인이 필요합니다"
        description="게시글 SEO 진단은 로그인 후 이용할 수 있습니다."
        action={{ label: "로그인", href: "/sign-in" }}
      />
    );
  }

  if (status === "plan") {
    return (
      <PlanGate featureLabel="게시글 진단" planName="비회원" />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Post Audit
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold">게시글 진단</h1>
        <p className="mt-2 text-[var(--muted)]">
          네이버 블로그·티스토리 게시글 URL로 SEO 요소와 개선 우선순위를 진단합니다.
        </p>
      </div>

      <form onSubmit={submit} className="mb-6 space-y-3">
        <input
          value={postUrl}
          onChange={(e) => setPostUrl(e.target.value)}
          placeholder={urlExample.placeholder}
          onFocus={urlExample.onFocus}
          onBlur={urlExample.onBlur}
          className="w-full rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
        />
        <input
          value={targetKeyword}
          onChange={(e) => setTargetKeyword(e.target.value)}
          placeholder={keywordExample.placeholder}
          onFocus={keywordExample.onFocus}
          onBlur={keywordExample.onBlur}
          className="w-full rounded-2xl bg-[var(--panel)] px-4 py-3 ring-1 ring-black/5"
        />
        <button
          type="submit"
          disabled={status === "analyzing"}
          className="rounded-[var(--radius-cta)] bg-[var(--brand)] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {status === "analyzing" ? "진단 중..." : "진단하기"}
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

      {message && status === "error" ? (
        <p className="mb-4 text-sm text-rose-600">{message}</p>
      ) : null}

      {monthlyLimit > 0 ? (
        <p className="mb-4 text-sm text-[var(--muted)]">
          이번 달 진단 {monthlyUsed}/{monthlyLimit}회 사용
        </p>
      ) : null}

      {report ? (
        <div className="space-y-6">
          <section className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
            <p className="text-sm text-[var(--muted)]">{report.postUrl}</p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-bold">
              종합 {report.overallScore}점
            </h2>
            {report.targetKeyword ? (
              <p className="mt-1 text-sm text-[var(--muted)]">타겟 키워드: {report.targetKeyword}</p>
            ) : null}
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report.scores.map((item) => (
                <div key={item.label} className="rounded-2xl bg-[var(--canvas)] p-4">
                  <p className="text-sm text-[var(--muted)]">{item.label}</p>
                  <p className="mt-1 text-xl font-bold">
                    {item.score}
                    <span className="text-sm font-normal text-[var(--muted)]">/{item.maxScore}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.summary}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
              <h3 className="mb-4 font-bold">강점</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                {report.strengths.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
              <h3 className="mb-4 font-bold">개선 제안</h3>
              <ul className="space-y-2 text-sm text-[var(--muted)]">
                {report.improvements.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-3xl bg-[var(--panel)] p-6 ring-1 ring-black/5">
            <h3 className="mb-4 font-bold">SEO 체크리스트</h3>
            <ul className="space-y-3">
              {report.seoChecklist.map((item) => (
                <li key={item.item} className="flex items-start gap-3 text-sm">
                  <span
                    className={
                      item.passed
                        ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                        : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                    }
                  >
                    {item.passed ? "통과" : "개선"}
                  </span>
                  <span>
                    {item.item}
                    {item.note ? (
                      <span className="block text-[var(--muted)]">{item.note}</span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <p className="text-sm text-[var(--muted)]">
            글쓰기 AI에서 페르소나를 적용해 톤을 맞춰 보세요.{" "}
            <Link href="/write" className="text-[var(--brand)] underline">
              글쓰기 AI로 이동
            </Link>
          </p>
        </div>
      ) : status === "idle" ? (
        <EmptyState
          title="게시글 URL을 입력하세요"
          description="허용된 호스트: blog.naver.com, m.blog.naver.com, *.tistory.com (https만)"
        />
      ) : null}
    </div>
  );
}
