import { describe, expect, it } from "vitest";
import { assertShortformMonthlyLimit } from "./monthly";

describe("assertShortformMonthlyLimit", () => {
  it("allows when under limit", () => {
    expect(assertShortformMonthlyLimit(2, 5)).toEqual({ ok: true });
  });

  it("rejects at limit", () => {
    const result = assertShortformMonthlyLimit(5, 5);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/5회/);
    }
  });

  it("rejects zero limit plans", () => {
    const result = assertShortformMonthlyLimit(0, 0);
    expect(result.ok).toBe(false);
  });
});
