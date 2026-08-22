import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  getAuthContext: vi.fn(),
}));
vi.mock("@/lib/quota", async () => {
  const actual = await vi.importActual<typeof import("@/lib/quota")>("@/lib/quota");
  return {
    ...actual,
    checkNaverRateLimit: vi.fn(),
  };
});
vi.mock("@/lib/providers/keyword-data", () => ({
  resolveBulk: vi.fn(),
}));

import { getAuthContext } from "@/lib/auth";
import { checkNaverRateLimit } from "@/lib/quota";
import { getPlan } from "@/lib/plans";
import { resolveBulk } from "@/lib/providers/keyword-data";
import { POST } from "./route";

function bulkRequest(keywords: string[], engine = "naver") {
  return new NextRequest("http://localhost/api/bulk", {
    method: "POST",
    body: JSON.stringify({ keywords, engine }),
    headers: { "content-type": "application/json" },
  });
}

describe("POST /api/bulk — Naver RPM accounting", () => {
  beforeEach(() => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "user_1",
      email: "a@b.com",
      plan: getPlan("enterprise"),
      user: {
        id: 1,
        plan: "enterprise",
        clerkId: "user_1",
        email: "a@b.com",
        aiUsedMonth: 0,
        googleUsedMonth: 0,
      },
      authEnabled: true,
    });
  });

  it("calls checkNaverRateLimit once per unique keyword, not once per request", async () => {
    vi.mocked(checkNaverRateLimit).mockResolvedValue({ ok: true });
    vi.mocked(resolveBulk).mockResolvedValue({ results: [], source: "live" });

    const response = await POST(bulkRequest(["김치찌개", "된장찌개", "된장찌개", "순두부찌개"]));

    expect(response.status).toBe(200);
    expect(vi.mocked(checkNaverRateLimit)).toHaveBeenCalledTimes(3);
  });

  it("rejects with 429 as soon as any per-keyword rate check fails", async () => {
    vi.mocked(checkNaverRateLimit)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: false,
        error: "분당 분석 한도(40회)를 초과했습니다. 엔터프라이즈 플랜을 업그레이드하세요.",
      });

    const response = await POST(bulkRequest(["김치찌개", "된장찌개", "순두부찌개"]));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain("한도");
    expect(vi.mocked(checkNaverRateLimit)).toHaveBeenCalledTimes(2);
  });
});
