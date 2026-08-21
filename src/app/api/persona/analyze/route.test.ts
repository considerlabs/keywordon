import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tryConsumeAiUsage: vi.fn(),
  fetchAllowedUrl: vi.fn(),
  countPersonaAnalyzesThisMonth: vi.fn(),
  upsertPersonaForAnalysis: vi.fn(),
  logPersonaAnalyzeEvent: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn().mockResolvedValue({
    userId: "clerk_1",
    user: { id: 1 },
    plan: { limits: { aiMonthly: 10, personaMonthly: 4, blogAnalysis: true } },
  }),
}));

vi.mock("@/lib/db/users", () => ({
  tryConsumeAiUsage: mocks.tryConsumeAiUsage,
}));

vi.mock("@/lib/quota", () => ({
  assertFeature: vi.fn().mockReturnValue({ ok: true }),
}));

vi.mock("@/lib/ssrf", () => ({
  fetchAllowedUrl: mocks.fetchAllowedUrl,
  SsrfError: class SsrfError extends Error {},
}));

vi.mock("@/lib/persona/repository", () => ({
  countPersonaAnalyzesThisMonth: mocks.countPersonaAnalyzesThisMonth,
  upsertPersonaForAnalysis: mocks.upsertPersonaForAnalysis,
  logPersonaAnalyzeEvent: mocks.logPersonaAnalyzeEvent,
}));

import { POST } from "./route";

describe("POST /api/persona/analyze", () => {
  beforeEach(() => {
    mocks.tryConsumeAiUsage.mockReset();
    mocks.tryConsumeAiUsage.mockResolvedValue({ ok: true });
    mocks.fetchAllowedUrl.mockReset();
    mocks.countPersonaAnalyzesThisMonth.mockReset();
    mocks.countPersonaAnalyzesThisMonth.mockResolvedValue(0);
    mocks.upsertPersonaForAnalysis.mockReset();
    mocks.logPersonaAnalyzeEvent.mockReset();
  });

  it("rejects empty source before consuming AI usage", async () => {
    const response = await POST(
      new Request("https://keywordon.test/api/persona/analyze", {
        method: "POST",
        body: JSON.stringify({}),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
    expect(mocks.upsertPersonaForAnalysis).not.toHaveBeenCalled();
  });

  it("rejects SSRF URL before consuming AI usage", async () => {
    const { SsrfError } = await import("@/lib/ssrf");
    mocks.fetchAllowedUrl.mockRejectedValue(new SsrfError("허용되지 않음"));

    const response = await POST(
      new Request("https://keywordon.test/api/persona/analyze", {
        method: "POST",
        body: JSON.stringify({ blogUrl: "https://127.0.0.1/" }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
  });

  it("starts analysis after validation and quota", async () => {
    mocks.upsertPersonaForAnalysis.mockResolvedValue({
      id: 1,
      status: "analyzing",
      progressStep: 0,
    });

    const response = await POST(
      new Request("https://keywordon.test/api/persona/analyze", {
        method: "POST",
        body: JSON.stringify({ posts: ["첫 번째 샘플 글 본문입니다."] }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(200);
    expect(mocks.tryConsumeAiUsage).toHaveBeenCalled();
    expect(mocks.upsertPersonaForAnalysis).toHaveBeenCalled();
  });
});
