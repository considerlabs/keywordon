import { describe, expect, it } from "vitest";
import { emptyKeywordAnalysis } from "./keyword-engine";

describe("emptyKeywordAnalysis", () => {
  it("does not invent volumes, demographics, or CPC", () => {
    const data = emptyKeywordAnalysis("제주여행");
    expect(data.monthlyVolume).toBe(0);
    expect(data.cpc).toBe(0);
    expect(data.opportunityScore).toBe(0);
    expect(data.genderRatio).toEqual({ male: 0, female: 0 });
    expect(data.monthlyTrend).toEqual([]);
    expect(data.relatedSerp).toEqual([]);
  });
});
