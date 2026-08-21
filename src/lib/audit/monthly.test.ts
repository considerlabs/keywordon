import { describe, expect, it } from "vitest";
import { assertPostAuditMonthlyLimit } from "./monthly";

describe("assertPostAuditMonthlyLimit", () => {
  it("allows when under limit", () => {
    expect(assertPostAuditMonthlyLimit(2, 5)).toEqual({ ok: true });
  });

  it("rejects at limit", () => {
    const result = assertPostAuditMonthlyLimit(5, 5);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/5회/);
    }
  });

  it("rejects zero limit plans", () => {
    const result = assertPostAuditMonthlyLimit(0, 0);
    expect(result.ok).toBe(false);
  });
});
