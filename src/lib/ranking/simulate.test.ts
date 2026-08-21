import { describe, expect, it } from "vitest";
import { buildBlogRanking, getRankingCategories } from "./simulate";

describe("buildBlogRanking", () => {
  it("returns deterministic entries for the same keyword", () => {
    const a = buildBlogRanking({ keyword: "에어프라이어" });
    const b = buildBlogRanking({ keyword: "에어프라이어" });
    expect(a[0]?.blogName).toBe(b[0]?.blogName);
    expect(a.length).toBeGreaterThan(0);
  });

  it("filters by platform", () => {
    const naver = buildBlogRanking({ keyword: "여행", platform: "naver", topN: 20 });
    expect(naver.every((entry) => entry.platform === "naver")).toBe(true);
  });

  it("exposes category list", () => {
    expect(getRankingCategories().length).toBeGreaterThan(5);
  });
});
