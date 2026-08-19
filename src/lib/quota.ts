import { getPlan, type PlanDefinition, type PlanId } from "./plans";
import type { KeywordAnalysis } from "./keyword-engine";
import type { AnalysisViewModel } from "./types";

const minuteBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkNaverRateLimit(actorId: string, plan: PlanDefinition) {
  const key = `naver:${actorId}`;
  const now = Date.now();
  const bucket = minuteBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    minuteBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return { ok: true as const };
  }
  if (bucket.count >= plan.limits.naverPerMinute) {
    return {
      ok: false as const,
      error: `분당 분석 한도(${plan.limits.naverPerMinute}회)를 초과했습니다. ${plan.name} 플랜을 업그레이드하세요.`,
    };
  }
  bucket.count += 1;
  return { ok: true as const };
}

export function applyPlanLimits(
  data: KeywordAnalysis,
  plan: PlanDefinition,
): AnalysisViewModel {
  return {
    ...data,
    relatedInternal: data.relatedInternal.slice(0, plan.limits.relatedInternal),
    relatedSerp: data.relatedSerp.slice(0, plan.limits.relatedSerp),
    opportunityScore: plan.limits.opportunityScore ? data.opportunityScore : null,
    issueLevel: plan.limits.issueInfo ? data.issueLevel : null,
    issueScore: plan.limits.issueInfo ? data.issueScore : null,
    cpc: plan.limits.cpc ? data.cpc : null,
    adCompetition: plan.limits.cpc ? data.adCompetition : null,
    content: plan.limits.contentVolume ? data.content : null,
    locked: {
      opportunityScore: !plan.limits.opportunityScore,
      issueInfo: !plan.limits.issueInfo,
      cpc: !plan.limits.cpc,
      contentVolume: !plan.limits.contentVolume,
    },
    planName: plan.name,
  };
}

export function assertBulkAllowed(count: number, plan: PlanDefinition) {
  if (plan.limits.bulkMax <= 0) {
    return { ok: false as const, error: "대량 조회는 회원 전용입니다. 로그인해 주세요." };
  }
  if (count > plan.limits.bulkMax) {
    return {
      ok: false as const,
      error: `${plan.name} 플랜은 최대 ${plan.limits.bulkMax}개까지 조회할 수 있습니다.`,
    };
  }
  return { ok: true as const };
}

export function assertFeature(
  plan: PlanDefinition,
  feature: keyof PlanDefinition["limits"],
  label: string,
) {
  const value = plan.limits[feature];
  const allowed = typeof value === "boolean" ? value : Number(value) > 0;
  if (!allowed) {
    return {
      ok: false as const,
      error: `${label}은(는) ${plan.name} 플랜에서 사용할 수 없습니다. 업그레이드가 필요합니다.`,
    };
  }
  return { ok: true as const };
}

export type { PlanId };
export { getPlan };