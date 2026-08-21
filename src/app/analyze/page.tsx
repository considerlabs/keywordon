import { AnalysisDashboard, type AnalysisViewModel } from "@/components/analysis-dashboard";
import { CreatorSubnav } from "@/components/creator-subnav";
import { KeywordSearchForm } from "@/components/keyword-search-form";
import { getAuthContext } from "@/lib/auth";
import { applyPlanLimits, checkNaverRateLimit } from "@/lib/quota";
import { tryConsumeGoogleUsage } from "@/lib/db/users";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";
import type { Engine } from "@/lib/keyword-engine";

interface AnalyzePageProps {
  searchParams: Promise<{ q?: string; engine?: string }>;
}

export default async function AnalyzePage({ searchParams }: AnalyzePageProps) {
  const params = await searchParams;
  const keyword = params.q?.trim() ?? "";
  const engine: Engine = params.engine === "google" ? "google" : "naver";
  const authContext = await getAuthContext();

  let data: AnalysisViewModel | null = null;
  let error = "";

  if (keyword) {
    if (engine === "google") {
      if (!authContext.userId) {
        error = "구글 키워드 분석은 로그인 후 베이직 이상 플랜에서 이용할 수 있습니다.";
      } else {
        const consumed = await tryConsumeGoogleUsage(
          authContext.userId,
          authContext.plan.limits.googleMonthly,
        );
        if (!consumed.ok) {
          error =
            authContext.plan.limits.googleMonthly <= 0
              ? "구글 키워드 분석은 베이직 이상 플랜에서 이용할 수 있습니다."
              : `이번 달 구글 분석 한도(${authContext.plan.limits.googleMonthly}회)를 모두 사용했습니다.`;
        } else {
          const resolved = await resolveKeywordAnalysis(keyword, engine);
          data = {
            ...applyPlanLimits(resolved.data, authContext.plan),
            dataSource: resolved.source,
          };
        }
      }
    } else {
      const rate = await checkNaverRateLimit(authContext.userId ?? "guest-page", authContext.plan);
      if (!rate.ok) {
        error = rate.error;
      } else {
        const resolved = await resolveKeywordAnalysis(keyword, engine);
        data = {
          ...applyPlanLimits(resolved.data, authContext.plan),
          dataSource: resolved.source,
        };
      }
    }
  }

  return (
    <>
      <CreatorSubnav />
      <div className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          Keyword Analysis
        </p>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--ink)]">
          키워드 분석
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          검색량, 콘텐츠 발행량, CPC, 기회지수, 연관 검색어를 한 번에 확인하세요.
        </p>
        <div className="mt-6">
          <KeywordSearchForm
            initialKeyword={keyword}
            initialEngine={engine}
            size="compact"
          />
        </div>
      </div>

      {error ? (
        <div className="mb-6 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {data ? (
        <AnalysisDashboard data={data} />
      ) : !error ? (
        <div className="rounded-3xl bg-[var(--panel)] px-6 py-16 text-center ring-1 ring-black/5">
          <p className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--ink)]">
            키워드를 입력해 분석을 시작하세요
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            예: 캠핑 용품, 다이어트 식단, 카페 창업
          </p>
        </div>
      ) : null}
      </div>
    </>
  );
}
