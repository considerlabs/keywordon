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

describe("POST /api/write/image", () => {
  beforeEach(() => {
    mocks.tryConsumeAiUsage.mockReset();
    mocks.tryConsumeAiUsage.mockResolvedValue({ ok: true });
  });

  it("rejects a missing topic before consuming AI usage", async () => {
    const response = await POST(
      new Request("https://keywordon.test/api/write/image", {
        method: "POST",
        body: JSON.stringify({ topic: "   " }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
  });
});
