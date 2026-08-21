import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tryConsumeAiUsage: vi.fn(),
  fetchAllowedUrl: vi.fn(),
  callGemini: vi.fn(),
  countPostAuditsThisMonth: vi.fn(),
  insertPostAudit: vi.fn(),
  logPostAuditEvent: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn().mockResolvedValue({
    userId: "clerk_1",
    user: { id: 1 },
    plan: { limits: { aiMonthly: 10, postAuditMonthly: 5, blogAnalysis: true } },
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

vi.mock("@/lib/gemini", () => ({
  callGemini: mocks.callGemini,
}));

vi.mock("@/lib/audit/repository", () => ({
  countPostAuditsThisMonth: mocks.countPostAuditsThisMonth,
  insertPostAudit: mocks.insertPostAudit,
  logPostAuditEvent: mocks.logPostAuditEvent,
}));

import { POST } from "./route";

describe("POST /api/audit/post", () => {
  beforeEach(() => {
    mocks.tryConsumeAiUsage.mockReset();
    mocks.tryConsumeAiUsage.mockResolvedValue({ ok: true });
    mocks.fetchAllowedUrl.mockReset();
    mocks.callGemini.mockReset();
    mocks.countPostAuditsThisMonth.mockReset();
    mocks.countPostAuditsThisMonth.mockResolvedValue(0);
    mocks.insertPostAudit.mockReset();
    mocks.logPostAuditEvent.mockReset();
  });

  it("rejects missing URL before consuming AI usage", async () => {
    const response = await POST(
      new Request("https://keywordon.test/api/audit/post", {
        method: "POST",
        body: JSON.stringify({}),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.fetchAllowedUrl).not.toHaveBeenCalled();
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
  });

  it("rejects SSRF-blocked URL before consuming AI usage", async () => {
    const { SsrfError } = await import("@/lib/ssrf");
    mocks.fetchAllowedUrl.mockRejectedValue(new SsrfError("허용되지 않는 호스트"));

    const response = await POST(
      new Request("https://keywordon.test/api/audit/post", {
        method: "POST",
        body: JSON.stringify({ postUrl: "https://evil.com/post" }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
    expect(mocks.callGemini).not.toHaveBeenCalled();
  });

  it("rejects empty content before consuming AI usage", async () => {
    mocks.fetchAllowedUrl.mockResolvedValue({
      url: new URL("https://blog.naver.com/example/1"),
      text: "   ",
    });

    const response = await POST(
      new Request("https://keywordon.test/api/audit/post", {
        method: "POST",
        body: JSON.stringify({ postUrl: "https://blog.naver.com/example/1" }),
      }) as Parameters<typeof POST>[0],
    );

    expect(response.status).toBe(400);
    expect(mocks.tryConsumeAiUsage).not.toHaveBeenCalled();
  });
});
