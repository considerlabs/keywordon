import { and, eq, gte, sql } from "drizzle-orm";
import { db, hasDatabase } from "./db/index";
import { usageEvents } from "./db/schema";
import { getPlan, type PlanDefinition, type PlanId } from "./plans";
import type { KeywordAnalysis, RelatedKeyword } from "./keyword-engine";
import type { AnalysisViewModel } from "./types";

const minuteBuckets = new Map<string, { count: number; resetAt: number }>();

function actorKey(actorId: string) {
  return `naver:${actorId}`;
}

/** Prefer DB-backed RPM when Neon is available so multi-instance deploys share the counter. */
export async function checkNaverRateLimit(actorId: string, plan: PlanDefinition) {
  if (plan.unrestricted) return { ok: true as const };
  const limit = plan.limits.naverPerMinute;
  const now = Date.now();
  const windowStart = new Date(now - 60_000);

  if (hasDatabase && db) {
    try {
      await db.insert(usageEvents).values({
        userId: null,
        action: "naver_rpm",
        meta: { actor: actorId },
      });

      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(usageEvents)
        .where(
          and(
            eq(usageEvents.action, "naver_rpm"),
            gte(usageEvents.createdAt, windowStart),
            sql`${usageEvents.meta}->>'actor' = ${actorId}`,
          ),
        );

      const count = Number(rows[0]?.count ?? 0);
      if (count > limit) {
        return {
          ok: false as const,
          error: `분당 분석 한도(${limit}회)를 초과했습니다. ${plan.name} 플랜을 업그레이드하세요.`,
        };
      }
      return { ok: true as const };
    } catch (error) {
      console.error("DB rate limit failed, falling back to memory", error);
    }
  }

  const key = actorKey(actorId);
  const bucket = minuteBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    minuteBuckets.set(key, { count: 1, resetAt: now + 60_000 });
    return { ok: true as const };
  }
  if (bucket.count >= limit) {
    return {
      ok: false as const,
      error: `분당 분석 한도(${limit}회)를 초과했습니다. ${plan.name} 플랜을 업그레이드하세요.`,
    };
  }
  bucket.count += 1;
  return { ok: true as const };
}

export function applyPlanLimits(
  data: KeywordAnalysis,
  plan: PlanDefinition,
): AnalysisViewModel {
  if (plan.unrestricted) {
    return {
      ...data,
      locked: {
        opportunityScore: false,
        issueInfo: false,
        cpc: false,
        contentVolume: false,
      },
      planName: plan.name,
    };
  }
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

export function applyDiscoverLimits(
  items: RelatedKeyword[],
  plan: PlanDefinition,
): Array<Omit<RelatedKeyword, "opportunityScore"> & { opportunityScore: number | null }> {
  if (plan.unrestricted) {
    return items.map((item) => ({ ...item, opportunityScore: item.opportunityScore }));
  }
  const capped = items.slice(
    0,
    Math.max(plan.limits.relatedInternal, plan.limits.relatedSerp, 10),
  );
  return capped.map((item) => ({
    ...item,
    opportunityScore: plan.limits.opportunityScore ? item.opportunityScore : null,
  }));
}

export function assertBulkAllowed(count: number, plan: PlanDefinition) {
  if (plan.unrestricted) return { ok: true as const };
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
  if (plan.unrestricted) return { ok: true as const };
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
