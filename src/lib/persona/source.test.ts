import { describe, expect, it, vi, afterEach } from "vitest";
import { collectPersonaSource } from "./source";

describe("collectPersonaSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects naver blog shell pages that are not real article text", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        text: async () =>
          `<html><head><title>네이버 공식블로그 : 네이버 블로그</title></head>
           <body><div id="mainFrame">셸</div></body></html>`,
      })),
    );

    await expect(collectPersonaSource("https://blog.naver.com/naverofficial")).rejects.toThrow(
      /본문|글|RSS|충분/,
    );
  });

  it("builds source text from RSS posts for a blog home URL", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("rss.blog.naver.com")) {
          return {
            ok: true,
            status: 200,
            headers: new Headers(),
            text: async () => `<?xml version="1.0"?>
              <rss><channel>
                <item>
                  <title><![CDATA[첫 번째 샘플 글]]></title>
                  <link>https://blog.naver.com/travel_korea/111</link>
                  <description><![CDATA[첫 글 요약입니다.]]></description>
                  <pubDate>Fri, 15 Aug 2026 10:00:00 +0900</pubDate>
                </item>
                <item>
                  <title><![CDATA[두 번째 샘플 글]]></title>
                  <link>https://blog.naver.com/travel_korea/222</link>
                  <description><![CDATA[두 글 요약입니다.]]></description>
                  <pubDate>Mon, 10 Aug 2026 10:00:00 +0900</pubDate>
                </item>
              </channel></rss>`,
          };
        }
        // PostView / article bodies
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          text: async () => `
            <div class="se-main-container">
              <div class="se-title-text">본문 제목</div>
              <p class="se-text-paragraph">${"페르소나 학습용 충분히 긴 본문 내용입니다. ".repeat(20)}</p>
            </div>`,
        };
      }),
    );

    const result = await collectPersonaSource("https://blog.naver.com/travel_korea");
    expect(result.displayUrl).toBe("https://blog.naver.com/travel_korea");
    expect(result.text.length).toBeGreaterThan(200);
    expect(result.text).toContain("페르소나 학습용");
    expect(result.text).toMatch(/첫 번째 샘플 글|본문 제목/);
  });
});
