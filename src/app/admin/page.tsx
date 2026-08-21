"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  FilePenLine,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

type Overview = {
  totalUsers: number;
  planDistribution: Record<string, number>;
  settingsConfigured: number;
  settingsTotal: number;
  missingCritical: string[];
  naverConfigured: boolean;
  geminiConfigured: boolean;
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/overview");
        const json = (await res.json()) as Overview & { error?: string };
        if (!res.ok) {
          setError(json.error ?? "대시보드를 불러오지 못했습니다.");
          return;
        }
        setData(json);
      } catch {
        setError("네트워크 오류");
      }
    })();
  }, []);

  if (error) {
    return <p className="text-rose-700">{error}</p>;
  }
  if (!data) {
    return <p className="text-[var(--muted)]">불러오는 중…</p>;
  }

  const cards = [
    {
      label: "회원",
      value: String(data.totalUsers),
      hint: "등록된 사용자",
      href: "/admin/users",
      icon: <Users className="h-4 w-4 text-[var(--brand)]" />,
    },
    {
      label: "설정 충족",
      value: `${data.settingsConfigured}/${data.settingsTotal}`,
      hint: "API·시크릿 구성",
      href: "/admin/settings",
      icon: <Settings2 className="h-4 w-4 text-[var(--brand)]" />,
    },
    {
      label: "네이버 API",
      value: data.naverConfigured ? "ON" : "OFF",
      hint: data.naverConfigured ? "실검색량 연동" : "시뮬 모드",
      href: "/admin/settings",
      icon: <Search className="h-4 w-4 text-[var(--brand)]" />,
    },
    {
      label: "Gemini",
      value: data.geminiConfigured ? "ON" : "OFF",
      hint: data.geminiConfigured ? "AI 글쓰기 준비됨" : "키 필요",
      href: "/admin/settings",
      icon: <Sparkles className="h-4 w-4 text-[var(--brand)]" />,
    },
  ];

  const planEntries = Object.entries(data.planDistribution);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-extrabold tracking-tight">
            대시보드
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            회원·설정부터 분석·글쓰기 워크플로까지 한눈에 확인합니다.
          </p>
        </div>
        <Link
          href="/analyze"
          className="inline-flex h-9 items-center rounded-lg bg-[var(--brand)] px-3.5 text-sm font-semibold text-white shadow-[0_14px_28px_-16px_rgba(26,79,224,0.75)] hover:bg-[var(--brand-ink)]"
        >
          키워드부터 시작
        </Link>
      </div>

      <section className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ink)]">추천 워크플로</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            키워드 분석 → Copilot/글쓰기 → 자동화 → 숏폼
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/analyze"
            className="inline-flex h-9 items-center rounded-lg bg-[var(--brand)] px-3.5 text-sm font-semibold text-white hover:bg-[var(--brand-ink)]"
          >
            키워드부터 시작
          </Link>
          <Link
            href="/write"
            className="inline-flex h-9 items-center rounded-lg border border-[var(--line)] bg-white px-3.5 text-sm font-semibold text-[var(--ink)] hover:border-[var(--brand)]/40"
          >
            Copilot 바로가기
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl border border-[var(--line)] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-[var(--brand)]/40"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-[var(--muted)]">{card.label}</p>
              {card.icon}
            </div>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight text-[var(--brand)]">
              {card.value}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{card.hint}</p>
            <span className="mt-3 inline-block text-xs font-semibold text-[var(--brand)]">
              자세히
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">플랜 분포</h2>
              <p className="text-xs text-[var(--muted)]">회원 플랜별 현황입니다.</p>
            </div>
            <Link href="/admin/users" className="text-sm font-medium text-[var(--brand)]">
              전체 보기
            </Link>
          </div>
          {planEntries.length === 0 ? (
            <p className="rounded-lg bg-[var(--canvas)] px-3 py-6 text-center text-sm text-[var(--muted)]">
              아직 회원이 없습니다. 가입 후 플랜을 관리해 보세요.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)]/70">
              {planEntries.map(([plan, total]) => (
                <li key={plan} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium">{plan}</span>
                  <span className="rounded-md bg-[var(--brand-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-ink)]">
                    {total}명
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-[var(--line)] bg-[var(--brand)] p-5 text-white shadow-[0_14px_28px_-16px_rgba(26,79,224,0.55)]">
          <div className="flex items-center gap-2">
            <FilePenLine className="h-4 w-4" />
            <p className="text-sm font-semibold">추천 시작점</p>
          </div>
          <p className="mt-3 font-[family-name:var(--font-display)] text-3xl font-extrabold">
            {data.missingCritical.length}
          </p>
          <p className="mt-1 text-sm text-white/80">누락된 중요 설정</p>
          <Link
            href="/admin/settings"
            className="mt-5 inline-flex h-9 items-center rounded-lg bg-white px-3.5 text-sm font-semibold text-[var(--brand)]"
          >
            파이프라인 점검
          </Link>
        </section>
      </div>

      {data.missingCritical.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-amber-700" />
            <h2 className="text-sm font-semibold text-amber-950">누락된 중요 설정</h2>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-amber-900">
            {data.missingCritical.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
