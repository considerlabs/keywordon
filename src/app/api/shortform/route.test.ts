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

vi.mock("@/lib/automation/live-suggestions", () => ({
  buildLiveSuggestions: vi.fn().mockResolvedValue({
    suggestions: [
      {
        id: "live-blogger-123",
        title: "실시간 추천 글",
        keyword: "실시간 추천",
      },
    ],
    source: "live",
  }),
}));

import { GET, POST } from "./route";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";

describe("GET /api/shortform", () => {
  it("returns 401 for guests before plan checks", async () => {
    vi.mocked(getAuthContext).mockResolvedValueOnce({
      userId: null,
      user: null,
      email: null,
      authEnabled: true,
      plan: { limits: { shortformMonthly: 0, copilot: false } },
    } as Awaited<ReturnType<typeof getAuthContext>>);
    vi.mocked(assertFeature).mockClear();

    const response = await GET();
    expect(response.status).toBe(401);
    expect(assertFeature).not.toHaveBeenCalled();
  });

  it("returns live popular sources with blog URLs", async () => {
    mocks.listProjects.mockResolvedValueOnce([]);
    mocks.countShortformGenerationsThisMonth.mockResolvedValueOnce(0);

    const response = await GET();
    expect(response.status).toBe(200);
    const data = (await response.json()) as {
      popular: Array<{ id: string; sourceUrl?: string }>;
      popularSource: string;
    };
    expect(data.popularSource).toBe("live");
    expect(data.popular[0]?.sourceUrl).toBe("https://blog.naver.com/blogger/123");
  });
});

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
