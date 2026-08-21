import { describe, expect, it } from "vitest";
import { estimateAdpostRevenue } from "./adpost";

describe("estimateAdpostRevenue", () => {
  it("computes monthly revenue from views, CTR, and CPC", () => {
    const result = estimateAdpostRevenue({
      monthlyViews: 10000,
      ctrPercent: 2,
      cpc: 100,
    });

    expect(result.estimatedClicks).toBe(200);
    expect(result.monthlyRevenue).toBe(20000);
  });

  it("clamps negative inputs to zero and caps CTR at 100", () => {
    const result = estimateAdpostRevenue({
      monthlyViews: -100,
      ctrPercent: 150,
      cpc: -50,
    });

    expect(result.monthlyViews).toBe(0);
    expect(result.ctrPercent).toBe(100);
    expect(result.cpc).toBe(0);
    expect(result.monthlyRevenue).toBe(0);
  });
});
