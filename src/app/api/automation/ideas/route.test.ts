import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insertIdea: vi.fn(),
  countIdeasCreatedOn: vi.fn(),
  listIdeas: vi.fn(),
  assertFeature: vi.fn(),
  getAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthContext: mocks.getAuthContext,
}));

vi.mock("@/lib/quota", () => ({
  assertFeature: mocks.assertFeature,
}));

vi.mock("@/lib/automation/repository", () => ({
  insertIdea: mocks.insertIdea,
  countIdeasCreatedOn: mocks.countIdeasCreatedOn,
  listIdeas: mocks.listIdeas,
}));

import { POST } from "./route";

describe("POST /api/automation/ideas", () => {
  beforeEach(() => {
    mocks.getAuthContext.mockResolvedValue({
      userId: "clerk_1",
      user: { id: 1 },
      plan: { limits: { automationIdeasDaily: 3 } },
    });
    mocks.assertFeature.mockReturnValue({ ok: true });
    mocks.insertIdea.mockReset();
    mocks.countIdeasCreatedOn.mockReset();
    mocks.countIdeasCreatedOn.mockResolvedValue(0);
  });

  it("returns 401 for guests before plan checks", async () => {
    mocks.getAuthContext.mockResolvedValue({
      userId: null,
      user: null,
      plan: { limits: { automationIdeasDaily: 0, copilot: false } },
    });

    const response = await POST(
      new Request("https://keywordon.test/api/automation/ideas", {
        method: "POST",
        body: JSON.stringify({ title: "새 글감" }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(401);
    expect(mocks.assertFeature).not.toHaveBeenCalled();
    expect(mocks.insertIdea).not.toHaveBeenCalled();
  });

  it("rejects empty title before insert", async () => {
    const response = await POST(
      new Request("https://keywordon.test/api/automation/ideas", {
        method: "POST",
        body: JSON.stringify({ title: "   " }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.insertIdea).not.toHaveBeenCalled();
  });

  it("returns 429 when daily limit is reached", async () => {
    mocks.countIdeasCreatedOn.mockResolvedValue(3);

    const response = await POST(
      new Request("https://keywordon.test/api/automation/ideas", {
        method: "POST",
        body: JSON.stringify({ title: "새 글감", keyword: "키워드" }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(429);
    expect(mocks.insertIdea).not.toHaveBeenCalled();
  });
});
