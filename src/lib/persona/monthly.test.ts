import { describe, expect, it } from "vitest";
import { assertPersonaMonthlyLimit } from "./monthly";

describe("assertPersonaMonthlyLimit", () => {
  it("allows when under limit", () => {
    expect(assertPersonaMonthlyLimit(1, 4)).toEqual({ ok: true });
  });

  it("rejects at limit", () => {
    const result = assertPersonaMonthlyLimit(8, 8);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/8회/);
    }
  });

  it("rejects guest zero limit", () => {
    expect(assertPersonaMonthlyLimit(0, 0).ok).toBe(false);
  });
});
