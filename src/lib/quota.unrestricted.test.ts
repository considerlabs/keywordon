import { describe, expect, it } from "vitest";
import { assertBulkAllowed, assertFeature, applyDiscoverLimits, applyPlanLimits } from "./quota";
import { superAdminPlan } from "./plans";

describe("superAdminPlan", () => {
  const plan = superAdminPlan();

  it("unlocks every gated feature", () => {
    expect(assertFeature(plan, "trendAccess", "급상승 트렌드").ok).toBe(true);
    expect(assertFeature(plan, "copilot", "Copilot").ok).toBe(true);
    expect(assertFeature(plan, "siteDiagnosis", "사이트 진단").ok).toBe(true);
    expect(assertBulkAllowed(500, plan).ok).toBe(true);
  });

  it("does not lock analysis fields", () => {
    const limited = applyPlanLimits(
      {
        keyword: "테스트",
        engine: "naver",
        analyzedAt: new Date().toISOString(),
        monthlyVolume: 1,
        pcVolume: 1,
        mobileVolume: 0,
        volumeChangeRate: 0,
        cpc: 0,
        adCompetition: "없음",
        opportunityScore: 0,
        issueLevel: "없음",
        issueScore: 0,
        category: "미분류",
        subcategory: "미분류",
        content: {
          totalDocs: 0,
          blogMonthly: 0,
          blogTotal: 0,
          cafeMonthly: 0,
          cafeTotal: 0,
          kinMonthly: 0,
          kinTotal: 0,
        },
        genderRatio: { male: 0, female: 0 },
        ageDistribution: [],
        deviceRatio: { pc: 0, mobile: 0 },
        monthlyTrend: [],
        relatedInternal: [],
        relatedSerp: [],
        smartBlockKeywords: [],
        nextKeywords: [],
        summary: "",
      },
      plan,
    );
    expect(limited.locked?.cpc).toBe(false);
    expect(limited.planName).toBe("슈퍼관리자");
  });

  it("does not hide discover opportunity scores", () => {
    const items = applyDiscoverLimits(
      [
        {
          keyword: "테스트",
          monthlyVolume: 10,
          opportunityScore: 0,
          competition: "없음",
          source: "serp",
        },
      ],
      plan,
    );
    expect(items).toHaveLength(1);
  });
});
