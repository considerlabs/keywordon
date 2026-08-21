import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tryConsumeAiUsage: vi.fn(),
  getProjectForUser: vi.fn(),
  countShortformGenerationsThisMonth: vi.fn(),
  updateProjectForUser: vi.fn(),
  logShortformGenerateEvent: vi.fn(),
  fetchAllowedUrl: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn().mockResolvedValue({
    userId: "clerk_1",
    user: { id: 1 },
    plan: { limits: { aiMonthly: 10, shortformMonthly: 5 } },
  }),
}));

vi.mock("@/lib/db/users", () => ({
  tryConsumeAiUsage: mocks.tryConsumeAiUsage,
}));

vi.mock("@/lib/quota", () => ({
  assertFeature: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock("@/lib/shortform/repository", () => ({
  getProjectForUser: mocks.getProjectForUser,
  countShortformGenerationsThisMonth: mocks.countShortformGenerationsThisMonth,
  updateProjectForUser: mocks.updateProjectForUser,
  logShortformGenerateEvent: mocks.logShortformGenerateEvent,
}));

vi.mock("@/lib/ssrf", () => ({
  fetchAllowedUrl: mocks.fetchAllowedUrl,
  SsrfError: class SsrfError extends Error {},
}));

vi.mock("@/lib/write/persona", () => ({
  getActivePersona: vi.fn().mockResolvedValue(null),
}));

import { POST } from "./route";

describe("POST /api/shortform/[id]/generate", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    mocks.tryConsumeAiUsage.mockReset();
    mocks.tryConsumeAiUsage.mockResolvedValue({ ok: true });
    mocks.getProjectForUser.mockReset();
    mocks.countShortformGenerationsThisMonth.mockReset();
    mocks.countShortformGenerationsThisMonth.mockResolvedValue(0);
    mocks.fetchAllowedUrl.mockReset();
    mocks.updateProjectForUser.mockReset();
    mocks.logShortformGenerateEvent.mockReset();
  });

  it("rejects missing source before consuming AI usage", async () => {
    mocks.getProjectForUser.mockResolvedValue({
      id: 1,
      title: "테스트",
      sourceUrl: null,
      meta: {},
    });

    const response = await POST(
      new Request("https://keywordon.test/api/shortform/1/generate", {
        method: "POST",
        body: JSON.stringify({}),
      }) as Parameters<typeof POST>[0],
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
    expect(mocks.countShortformGenerationsThisMonth).not.toHaveBeenCalled();
  });

  it("rejects invalid project id before DB lookup", async () => {
    const response = await POST(
      new Request("https://keywordon.test/api/shortform/x/generate", {
        method: "POST",
        body: JSON.stringify({ sourceText: "본문" }),
      }) as Parameters<typeof POST>[0],
      { params: Promise.resolve({ id: "x" }) },
    );

    expect(response.status).toBe(400);
    expect(mocks.getProjectForUser).not.toHaveBeenCalled();
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
  });
});
