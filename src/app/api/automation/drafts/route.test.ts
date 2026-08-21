import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tryConsumeAiUsage: vi.fn(),
  getIdeaForUser: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn().mockResolvedValue({
    userId: "clerk_1",
    user: { id: 1 },
    plan: { limits: { aiMonthly: 10 } },
  }),
}));

vi.mock("@/lib/db/users", () => ({
  tryConsumeAiUsage: mocks.tryConsumeAiUsage,
}));

vi.mock("@/lib/quota", () => ({
  assertFeature: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock("@/lib/automation/repository", () => ({
  getIdeaForUser: mocks.getIdeaForUser,
  insertDraft: vi.fn(),
  listDrafts: vi.fn(),
  logAutomationDraftEvent: vi.fn(),
  updateDraftForUser: vi.fn(),
}));

import { POST } from "./route";

describe("POST /api/automation/drafts", () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key";
    mocks.tryConsumeAiUsage.mockReset();
    mocks.tryConsumeAiUsage.mockResolvedValue({ ok: true });
    mocks.getIdeaForUser.mockReset();
  });

  it("rejects missing ideaId before consuming AI usage", async () => {
    const response = await POST(
      new Request("https://keywordon.test/api/automation/drafts", {
        method: "POST",
        body: JSON.stringify({}),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
    expect(mocks.getIdeaForUser).not.toHaveBeenCalled();
  });
});
