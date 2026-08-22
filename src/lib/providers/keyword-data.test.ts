import { describe, expect, it } from "vitest";
import { analysisFromNaverList } from "./keyword-data";

describe("analysisFromNaverList", () => {
  it("uses SearchAd volumes and never fills demographics, CPC, or opportunity", () => {
    const data = analysisFromNaverList("제주여행", [
      {
        relKeyword: "제주여행",
        monthlyPcQcCnt: "1200",
        monthlyMobileQcCnt: "8800",
        compIdx: "중간",
      },
      {
        relKeyword: "제주렌트카",
        monthlyPcQcCnt: "100",
        monthlyMobileQcCnt: "400",
        compIdx: "낮음",
      },
    ]);

    expect(data?.monthlyVolume).toBe(10000);
    expect(data?.pcVolume).toBe(1200);
    expect(data?.mobileVolume).toBe(8800);
    expect(data?.adCompetition).toBe("혼잡");
    expect(data?.cpc).toBe(0);
    expect(data?.opportunityScore).toBe(0);
    expect(data?.genderRatio).toEqual({ male: 0, female: 0 });
    expect(data?.monthlyTrend).toEqual([]);
    expect(data?.relatedSerp[0]?.keyword).toBe("제주렌트카");
    expect(data?.relatedSerp[0]?.opportunityScore).toBe(0);
    expect(data?.summary).not.toMatch(/추정/);
  });
});
