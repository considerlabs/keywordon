import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  analyzeBlog,
  parsePostTotal,
  parseRssItems,
  resolveBlogFeed,
} from "./analysis-tools";

describe("resolveBlogFeed", () => {
  it("maps naver blog home to rss.blog.naver.com feed", () => {
    const resolved = resolveBlogFeed("https://blog.naver.com/travel_korea");
    expect(resolved.platform).toBe("naver");
    expect(resolved.feedUrl).toBe("https://rss.blog.naver.com/travel_korea.xml");
    expect(resolved.displayUrl).toBe("https://blog.naver.com/travel_korea");
    expect(resolved.countUrl).toBe(
      "https://blog.naver.com/PostList.naver?blogId=travel_korea",
    );
  });

  it("maps naver post URL to the same blog feed", () => {
    const resolved = resolveBlogFeed("https://blog.naver.com/travel_korea/223456789012");
    expect(resolved.feedUrl).toBe("https://rss.blog.naver.com/travel_korea.xml");
  });

  it("maps tistory host to /rss", () => {
    const resolved = resolveBlogFeed("https://myblog.tistory.com/12");
    expect(resolved.platform).toBe("tistory");
    expect(resolved.feedUrl).toBe("https://myblog.tistory.com/rss");
  });

  it("rejects unsupported hosts", () => {
    expect(() => resolveBlogFeed("https://example.com/blog")).toThrow(/네이버|티스토리/);
  });
});

describe("parseRssItems", () => {
  it("extracts title, link, date, and category from RSS XML", () => {
    const xml = `<?xml version="1.0"?>
      <rss><channel>
        <item>
          <title><![CDATA[삿포로 여행 가이드]]></title>
          <link><![CDATA[https://blog.naver.com/travel_korea/1]]></link>
          <category><![CDATA[여행]]></category>
          <pubDate>Fri, 01 Aug 2026 10:00:00 +0900</pubDate>
        </item>
        <item>
          <title>오타루 운하 산책</title>
          <link>https://blog.naver.com/travel_korea/2</link>
          <pubDate>Mon, 10 Aug 2026 09:00:00 +0900</pubDate>
        </item>
      </channel></rss>`;

    const items = parseRssItems(xml);
    expect(items).toHaveLength(2);
    expect(items.map((item) => item.title)).toEqual([
      "오타루 운하 산책",
      "삿포로 여행 가이드",
    ]);
    const sapporo = items.find((item) => item.title.includes("삿포로"));
    expect(sapporo?.category).toBe("여행");
    expect(sapporo?.link).toContain("travel_korea/1");
    expect(sapporo?.publishedAt).toBe("2026-08-01");
  });
});

describe("parsePostTotal", () => {
  it("reads naver PostList total like '2,582개의 글'", () => {
    expect(parsePostTotal('<h4>전체보기</strong></a> 2,582개의 글</h4>')).toBe(2582);
  });

  it("reads mobile postCount json field", () => {
    expect(parsePostTotal('{"postCount":2602,"marketPostCount":0}')).toBe(2602);
  });
});

describe("analyzeBlog", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const body = url.includes("PostList.naver")
          ? `<html><body>전체보기</strong></a> 1,234개의 글</body></html>`
          : `<?xml version="1.0"?>
          <rss><channel>
            <item>
              <title><![CDATA[삿포로 여행 코스]]></title>
              <link>https://blog.naver.com/travel_korea/1</link>
              <category><![CDATA[여행]]></category>
              <pubDate>Fri, 15 Aug 2026 10:00:00 +0900</pubDate>
            </item>
            <item>
              <title><![CDATA[삿포로 맛집 정리]]></title>
              <link>https://blog.naver.com/travel_korea/2</link>
              <category><![CDATA[여행]]></category>
              <pubDate>Mon, 10 Aug 2026 10:00:00 +0900</pubDate>
            </item>
            <item>
              <title><![CDATA[도쿄 카페]]></title>
              <link>https://blog.naver.com/travel_korea/3</link>
              <category><![CDATA[카페]]></category>
              <pubDate>Wed, 01 Jan 2025 10:00:00 +0900</pubDate>
            </item>
          </channel></rss>`;
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          text: async () => body,
        };
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses PostList total for postCount instead of RSS item cap", async () => {
    const report = await analyzeBlog("https://blog.naver.com/travel_korea");

    expect(report.platform).toBe("naver");
    expect(report.metrics.postCount).toBe(1234);
    expect(report.metrics.monthlyPosts).toBeGreaterThanOrEqual(2);
    expect(report.topPosts[0]?.title).toContain("삿포로");
    expect(report.topPosts.some((post) => post.title.startsWith("인기 포스팅"))).toBe(false);
    expect(report.summary).toMatch(/1,234|1234/);
  });
});
