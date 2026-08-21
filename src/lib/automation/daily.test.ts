import { describe, expect, it } from "vitest";
import { assertIdeasDailyLimit, dayKey } from "./daily";

describe("dayKey", () => {
  it("formats UTC YYYY-MM-DD", () => {
    expect(dayKey(new Date("2026-08-21T15:00:00.000Z"))).toBe("2026-08-21");
  });
});

describe("assertIdeasDailyLimit", () => {
  it("rejects when used >= limit", () => {
    expect(assertIdeasDailyLimit(3, 3).ok).toBe(false);
    expect(assertIdeasDailyLimit(2, 3).ok).toBe(true);
  });

  it("rejects when limit is 0", () => {
    expect(assertIdeasDailyLimit(0, 0).ok).toBe(false);
  });
});
