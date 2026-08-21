import { describe, expect, it } from "vitest";
import {
  mapDirectoryPostsToSuggestions,
  parseDirectoryPostListPayload,
  titleToKeyword,
} from "./live-suggestions";

describe("titleToKeyword", () => {
  it("keeps a short searchable phrase from a long blog title", () => {
    expect(titleToKeyword("[알테오젠] 결과로 보여주는 기업")).toContain("알테오젠");
    expect(
      titleToKeyword("신용보증기금 사업자대출｜이미 보증서를 이용 중이라면"),
    ).toMatch(/신용보증기금|사업자대출/);
  });
});

describe("parseDirectoryPostListPayload", () => {
  it("parses )]}', prefixed directory post JSON", () => {
    const raw = `)]}',
{"result":{"totalCount":1000,"postList":[{
  "domainIdOrBlogId":"travel_blog",
  "logNo":224,
  "title":"부산 당일치기 코스 추천",
  "briefContents":"주말에 가기 좋은 코스",
  "directorySeq":27
}]}}`;
    const posts = parseDirectoryPostListPayload(raw);
    expect(posts).toHaveLength(1);
    expect(posts[0]?.title).toBe("부산 당일치기 코스 추천");
    expect(posts[0]?.logNo).toBe("224");
  });
});

describe("mapDirectoryPostsToSuggestions", () => {
  it("builds unique suggestions without curated placeholder titles", () => {
    const suggestions = mapDirectoryPostsToSuggestions([
      {
        title: "주말 부산 당일치기 코스",
        logNo: "1",
        blogId: "a",
        briefContents: "",
        directorySeq: 27,
      },
      {
        title: "주말 부산 당일치기 코스",
        logNo: "2",
        blogId: "b",
        briefContents: "",
        directorySeq: 27,
      },
      {
        title: "환절기 스킨케어 루틴",
        logNo: "3",
        blogId: "c",
        briefContents: "",
        directorySeq: 18,
      },
    ]);

    expect(suggestions.length).toBe(2);
    expect(suggestions[0]?.title).toContain("부산");
    expect(suggestions.some((s) => s.id.startsWith("curated-"))).toBe(false);
    expect(suggestions[0]?.keyword.length).toBeGreaterThan(0);
  });
});
