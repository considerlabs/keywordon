import { describe, expect, it } from "vitest";
import {
  keywordMatchScore,
  mapSearchListToRanking,
  parseNaverSearchListPayload,
  stripRankingHtml,
} from "./naver";

describe("stripRankingHtml", () => {
  it("removes search highlight tags", () => {
    expect(
      stripRankingHtml(
        '[7월 <strong class="search_keyword">삿포로</strong> 여행]',
      ),
    ).toBe("[7월 삿포로 여행]");
  });
});

describe("parseNaverSearchListPayload", () => {
  it("parses )]}', prefixed SearchList JSON", () => {
    const raw = `)]}',
{"result":{"totalCount":1000,"searchList":[{
  "domainIdOrBlogId":"thestarrr",
  "logNo":224371507240,
  "postUrl":"https://blog.naver.com/thestarrr/224371507240",
  "title":"<strong class=\\"search_keyword\\">삿포로</strong> 여행 일정",
  "nickName":"냠념뇸뇽",
  "blogName":"최애 맛집과 카페를 기록",
  "addDate":1786107900000
}]}}`;

    const parsed = parseNaverSearchListPayload(raw);
    expect(parsed.totalCount).toBe(1000);
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.blogId).toBe("thestarrr");
    expect(parsed.items[0]?.title).toContain("삿포로");
    expect(parsed.items[0]?.title).not.toContain("<strong");
  });
});

describe("mapSearchListToRanking", () => {
  it("builds ranked entries with real blog urls and titles", () => {
    const entries = mapSearchListToRanking(
      {
        totalCount: 2,
        items: [
          {
            blogId: "thestarrr",
            logNo: "224371507240",
            postUrl: "https://blog.naver.com/thestarrr/224371507240",
            title: "삿포로 여행 일정 총정리",
            nickName: "냠념뇸뇽",
            blogName: "최애 맛집과 카페를 기록",
            addDate: 1786107900000,
          },
          {
            blogId: "iamzipzuin",
            logNo: "224378752186",
            postUrl: "https://blog.naver.com/iamzipzuin/224378752186",
            title: "겨울 삿포로 여행 코스",
            nickName: "짚주인",
            blogName: "짚주인 도파민 끌어올려",
            addDate: 1786699080000,
          },
        ],
      },
      "삿포로 여행",
    );

    expect(entries[0]?.rank).toBe(1);
    expect(entries[0]?.blogUrl).toBe("https://blog.naver.com/thestarrr");
    expect(entries[0]?.postTitle).toContain("삿포로");
    expect(entries[0]?.platform).toBe("naver");
    expect(entries[0]?.blogName).toBe("최애 맛집과 카페를 기록");
    expect(entries.some((e) => e.postTitle.includes("번째 인기 포스팅"))).toBe(false);
    expect(keywordMatchScore("삿포로 여행 일정", "삿포로 여행")).toBeGreaterThan(50);
  });
});
