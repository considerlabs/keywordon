import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tryConsumeAiUsage: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn().mockResolvedValue({
    userId: "user_1",
    user: { id: "user_1" },
    plan: { limits: { aiMonthly: 10 } },
  }),
}));

vi.mock("@/lib/db/users", () => ({
  tryConsumeAiUsage: mocks.tryConsumeAiUsage,
}));

vi.mock("@/lib/quota", () => ({
  assertFeature: vi.fn().mockReturnValue({ ok: true }),
}));

import { POST } from "./route";

describe("POST /api/copilot", () => {
  beforeEach(() => {
    mocks.tryConsumeAiUsage.mockReset();
    mocks.tryConsumeAiUsage.mockResolvedValue({ ok: true });
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
  });

  it("rejects blank normalized keywords before consuming AI usage", async () => {
    process.env.GEMINI_API_KEY = "test-key";

    const response = await POST(
      new Request("https://keywordon.test/api/copilot", {
        method: "POST",
        body: JSON.stringify({ keywords: ["  ", "\n"] }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
  });

  it("rejects a missing Gemini key before consuming AI usage", async () => {
    const response = await POST(
      new Request("https://keywordon.test/api/copilot", {
        method: "POST",
        body: JSON.stringify({ keyword: "캠핑" }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(503);
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
  });
});
