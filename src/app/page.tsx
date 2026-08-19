import Link from "next/link";
import { ArrowRight, ChartLine, Layers3, Sparkles } from "lucide-react";
import { KeywordSearchForm } from "@/components/keyword-search-form";
import { RealtimeTrends } from "@/components/realtime-trends";
import { getRealtimeTrends } from "@/lib/keyword-engine";

export default function HomePage() {
  const trends = getRealtimeTrends();

  return (
    <>
      <section className="relative overflow-hidden hero-grid">
        <div className="animate-drift pointer-events-none absolute -right-16 top-10 h-64 w-64 rounded-full bg-[var(--brand)]/15 blur-3xl" />
        <div className="animate-drift pointer-events-none absolute -left-10 bottom-8 h-52 w-52 rounded-full bg-[var(--accent)]/15 blur-3xl" />

        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-center px-5 py-16 md:py-20">
          <p className="animate-rise mb-3 font-[family-name:var(--font-display)] text-5xl font-extrabold tracking-tighter text-[var(--ink)] md:mb-4 md:text-7xl">
            Keyword<span className="-ml-[0.02em] text-[var(--brand)]">On</span>
          </p>
          <h1 className="animate-rise-delay max-w-3xl text-2xl font-semibold leading-[1.28] tracking-tight text-[var(--ink)] md:text-4xl">
            키워드 검색량부터 기회지수까지,
            <br className="hidden md:block" />
            한 번에 분석하는 인텔리전스
          </h1>
          <p className="animate-rise-delay mt-5 max-w-2xl text-base leading-relaxed text-[var(--muted)] md:mt-6 md:text-lg">
            SEO, 콘텐츠 마케팅, 경쟁 분석을 하나의 플로우로. 네이버·구글 키워드를
            바로 조회하세요.
          </p>

          <div className="animate-rise-delay mt-10 max-w-2xl">
            <KeywordSearchForm size="hero" />
          </div>

          <div className="animate-rise-delay mt-8 flex flex-wrap gap-3">
            <Link
              href="/bulk"
              className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--ink)] ring-1 ring-black/8 transition hover:bg-white"
            >
              대량 키워드 조회
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-[var(--ink)] ring-1 ring-black/8 transition hover:bg-white"
            >
              키워드 발굴
              <Sparkles className="h-4 w-4" />
            </Link>
            <Link
              href="/copilot"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand)]"
            >
              Copilot AI
              <Sparkles className="h-4 w-4" />
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              플랜 보기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <RealtimeTrends items={trends} updatedAt={new Date().toISOString()} />

      <section className="border-t border-[var(--line)] bg-[var(--surface)]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-16 md:grid-cols-3">
          {[
            {
              icon: ChartLine,
              title: "검색량 · 추이 · CPC",
              body: "월간 검색량, PC/Mobile 비중, 광고 단가와 경쟁도를 한 화면에서 확인합니다.",
            },
            {
              icon: Sparkles,
              title: "기회지수",
              body: "검색량 대비 경쟁 강도를 점수화해, 지금 공략할 키워드를 빠르게 고릅니다.",
            },
            {
              icon: Layers3,
              title: "연관어 · 대량 조회",
              body: "SERP/내부 연관어 확장과 최대 50개 키워드 일괄 비교로 리서치 속도를 높입니다.",
            },
          ].map((feature) => (
            <article key={feature.title}>
              <feature.icon className="mb-4 h-6 w-6 text-[var(--brand)]" />
              <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
                {feature.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}