import { describe, expect, it } from "vitest";
import { buildWritePrompt, normalizeKeywords, trimWriteField } from "./prompt";

describe("trimWriteField", () => {
  it("trims and caps length", () => {
    expect(trimWriteField("  hi  ")).toBe("hi");
    expect(trimWriteField("x".repeat(250)).length).toBe(200);
  });
});

describe("normalizeKeywords", () => {
  it("caps at 5 and trims", () => {
    expect(normalizeKeywords([" a ", "b", "", "c", "d", "e", "f"])).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });
});

describe("buildWritePrompt", () => {
  it("includes post type, title, char count, and optional emphasis", () => {
    const { system, user } = buildWritePrompt({
      postTypeLabel: "여행 후기",
      title: "부산 여행",
      keywords: ["부산", "해운대"],
      charCount: 1000,
      tone: "~해요",
      emphasis: "오후 2시 방문 언급",
      flags: { useLatestSearch: true, hashtags: true, seoInsights: false },
      keywordStats: {
        monthlyVolume: 12000,
        category: "여행",
        related: ["광안리", "서면"],
      },
      personaBlock: null,
    });
    expect(system).toContain("한국어");
    expect(user).toContain("여행 후기");
    expect(user).toContain("부산 여행");
    expect(user).toContain("1000");
    expect(user).toContain("~해요");
    expect(user).toContain("오후 2시");
    expect(user).toContain("해시태그");
  });

  it("appends persona when provided", () => {
    const { user } = buildWritePrompt({
      postTypeLabel: "일상/취미",
      title: "",
      keywords: ["캠핑"],
      charCount: 500,
      tone: "자동 설정",
      emphasis: "",
      flags: { useLatestSearch: false, hashtags: false, seoInsights: false },
      keywordStats: { monthlyVolume: 100, category: "생활", related: [] },
      personaBlock: "어미: ~해요, 평균 1200자",
    });
    expect(user).toContain("어미: ~해요");
  });
});
