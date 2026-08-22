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
  discoverLiveKeywords: vi.fn(),
}));

import { getAuthContext } from "@/lib/auth";
import { checkNaverRateLimit } from "@/lib/quota";
import { getPlan } from "@/lib/plans";
import { discoverLiveKeywords } from "@/lib/providers/keyword-data";
import { GET } from "./route";

function discoverRequest(q: string) {
  return new NextRequest(`http://localhost/api/discover?q=${encodeURIComponent(q)}`);
}

describe("GET /api/discover — rate limiting", () => {
  beforeEach(() => {
    vi.mocked(getAuthContext).mockResolvedValue({
      userId: "user_1",
      email: "a@b.com",
      plan: getPlan("free"),
      user: {
        id: 1,
        plan: "free",
        clerkId: "user_1",
        email: "a@b.com",
        aiUsedMonth: 0,
        googleUsedMonth: 0,
      },
      authEnabled: true,
    });
  });

  it("returns results when under the rate limit", async () => {
    vi.mocked(checkNaverRateLimit).mockResolvedValue({ ok: true });
    vi.mocked(discoverLiveKeywords).mockResolvedValue([
      {
        keyword: "마케팅 전략",
        monthlyVolume: 1200,
        opportunityScore: 0,
        competition: "적당",
        source: "serp",
      },
    ]);

    const response = await GET(discoverRequest("마케팅"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.seed).toBe("마케팅");
    expect(vi.mocked(checkNaverRateLimit)).toHaveBeenCalledWith("user_1", getPlan("free"));
  });

  it("returns 429 when the rate limit is exceeded", async () => {
    vi.mocked(checkNaverRateLimit).mockResolvedValue({
      ok: false,
      error: "분당 분석 한도(4회)를 초과했습니다. 무료 플랜을 업그레이드하세요.",
    });

    const response = await GET(discoverRequest("마케팅"));
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toContain("한도");
  });
});
