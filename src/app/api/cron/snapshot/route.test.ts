import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/index", () => ({
  db: { insert: vi.fn() },
  hasDatabase: true,
}));
vi.mock("@/lib/keyword-engine", () => ({
  getRealtimeTrends: vi.fn(),
}));

import { db } from "@/lib/db/index";
import { keywordSnapshots } from "@/lib/db/schema";
import { getRealtimeTrends } from "@/lib/keyword-engine";
import { POST } from "./route";

function cronRequest(headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/cron/snapshot", {
    method: "POST",
    headers,
  });
}

describe("POST /api/cron/snapshot", () => {
  const insertValues = vi.fn();
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "test-secret";
    vi.mocked(db!.insert).mockReturnValue({ values: insertValues } as never);
    insertValues.mockResolvedValue(undefined);
    vi.mocked(getRealtimeTrends).mockReturnValue([
      { rank: 1, keyword: "부동산 정책", change: "up", delta: 3 },
      { rank: 2, keyword: "여름 휴가 추천", change: "new", delta: 1 },
    ]);
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 503 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await POST(cronRequest({ authorization: "Bearer whatever" }));
    expect(response.status).toBe(503);
  });

  it("returns 401 when the bearer token does not match", async () => {
    const response = await POST(cronRequest({ authorization: "Bearer wrong-secret" }));
    expect(response.status).toBe(401);
    expect(db!.insert).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET header does not match", async () => {
    const response = await POST(cronRequest({ CRON_SECRET: "wrong-secret" }));
    expect(response.status).toBe(401);
    expect(db!.insert).not.toHaveBeenCalled();
  });

  it("inserts one snapshot row per trend item on a valid bearer request", async () => {
    const response = await POST(cronRequest({ authorization: "Bearer test-secret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.captured).toBe(2);
    expect(db!.insert).toHaveBeenCalledWith(keywordSnapshots);
    expect(insertValues).toHaveBeenCalledWith([
      expect.objectContaining({ keyword: "부동산 정책", engine: "naver", rank: 1 }),
      expect.objectContaining({ keyword: "여름 휴가 추천", engine: "naver", rank: 2 }),
    ]);
  });

  it("accepts CRON_SECRET header for auth", async () => {
    const response = await POST(cronRequest({ CRON_SECRET: "test-secret" }));
    expect(response.status).toBe(200);
  });
});
