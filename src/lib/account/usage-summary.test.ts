import { describe, expect, it } from "vitest";
import { buildUsageSummary } from "./usage-summary";

describe("buildUsageSummary", () => {
  it("computes remaining and percent safely when limit is 0", () => {
    const s = buildUsageSummary({
      planName: "비회원",
      aiUsedMonth: 0,
      aiMonthly: 0,
      googleUsedMonth: 0,
      googleMonthly: 0,
    });
    expect(s.aiRemaining).toBe(0);
    expect(s.aiPercent).toBe(100);
    expect(s.exhausted).toBe(true);
  });

  it("reports remaining for normal plans", () => {
    const s = buildUsageSummary({
      planName: "베이직",
      aiUsedMonth: 40,
      aiMonthly: 100,
      googleUsedMonth: 1,
      googleMonthly: 10,
    });
    expect(s.aiRemaining).toBe(60);
    expect(s.aiPercent).toBe(40);
    expect(s.exhausted).toBe(false);
  });
});
