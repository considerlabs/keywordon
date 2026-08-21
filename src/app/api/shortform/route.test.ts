import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insertProject: vi.fn(),
  listProjects: vi.fn(),
  countShortformGenerationsThisMonth: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn().mockResolvedValue({
    userId: "clerk_1",
    user: { id: 1 },
    plan: { limits: { shortformMonthly: 5 } },
  }),
}));

vi.mock("@/lib/quota", () => ({
  assertFeature: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock("@/lib/shortform/repository", () => ({
  insertProject: mocks.insertProject,
  listProjects: mocks.listProjects,
  countShortformGenerationsThisMonth: mocks.countShortformGenerationsThisMonth,
}));

import { POST } from "./route";

describe("POST /api/shortform", () => {
  beforeEach(() => {
    mocks.insertProject.mockReset();
    mocks.listProjects.mockReset();
  });

  it("rejects empty body before DB insert", async () => {
    const response = await POST(
      new Request("https://keywordon.test/api/shortform", {
        method: "POST",
        body: JSON.stringify({}),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.insertProject).not.toHaveBeenCalled();
  });

  it("rejects disallowed URL before DB insert", async () => {
    const response = await POST(
      new Request("https://keywordon.test/api/shortform", {
        method: "POST",
        body: JSON.stringify({ title: "테스트", sourceUrl: "https://evil.com/post" }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.insertProject).not.toHaveBeenCalled();
  });
});
