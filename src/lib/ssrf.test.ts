import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => ({ address: "93.184.216.34", family: 4 })),
}));

vi.mock("undici", () => ({
  Agent: class DummyAgent {
    constructor(_opts: unknown) {}
  },
  fetch: vi.fn(),
}));

import { fetch as undiciFetch } from "undici";
import {
  assertAllowedUrl,
  assertPublicHttpsUrl,
  extractBlogText,
  fetchPublicHtml,
  isAllowedHost,
  resolveFetchUrl,
  SsrfError,
} from "./ssrf";

describe("assertAllowedUrl", () => {
  it("allows blog.naver.com https URLs", () => {
    const url = assertAllowedUrl("https://blog.naver.com/example/123");
    expect(url.hostname).toBe("blog.naver.com");
  });

  it("allows m.blog.naver.com", () => {
    const url = assertAllowedUrl("https://m.blog.naver.com/example/123");
    expect(url.hostname).toBe("m.blog.naver.com");
  });

  it("allows tistory subdomains", () => {
    const url = assertAllowedUrl("https://myblog.tistory.com/123");
    expect(url.hostname).toBe("myblog.tistory.com");
  });

  it("rejects http URLs", () => {
    expect(() => assertAllowedUrl("http://blog.naver.com/post")).toThrow(SsrfError);
    expect(() => assertAllowedUrl("http://blog.naver.com/post")).toThrow(/https/);
  });

  it("rejects disallowed hosts", () => {
    expect(() => assertAllowedUrl("https://example.com/post")).toThrow(SsrfError);
    expect(() => assertAllowedUrl("https://example.com/post")).toThrow(/티스토리/);
  });

  it("rejects private IP addresses", () => {
    expect(() => assertAllowedUrl("https://127.0.0.1/post")).toThrow(SsrfError);
    expect(() => assertAllowedUrl("https://192.168.0.1/post")).toThrow(/사설 IP/);
  });

  it("rejects malformed URLs", () => {
    expect(() => assertAllowedUrl("not-a-url")).toThrow(SsrfError);
  });
});

describe("assertPublicHttpsUrl", () => {
  it("rejects private IPs and localhost without DNS", async () => {
    await expect(assertPublicHttpsUrl("https://127.0.0.1/")).rejects.toThrow(SsrfError);
    await expect(assertPublicHttpsUrl("https://192.168.0.1/")).rejects.toThrow(/사설 IP/);
    await expect(assertPublicHttpsUrl("https://localhost/")).rejects.toThrow(/사설 호스트/);
    await expect(assertPublicHttpsUrl("http://example.com/")).rejects.toThrow(/https/);
  });
});

describe("isAllowedHost", () => {
  it("matches exact and subdomain hosts", () => {
    expect(isAllowedHost("blog.naver.com")).toBe(true);
    expect(isAllowedHost("www.blog.naver.com")).toBe(true);
    expect(isAllowedHost("foo.tistory.com")).toBe(true);
    expect(isAllowedHost("evil.com")).toBe(false);
  });
});

describe("resolveFetchUrl", () => {
  it("rewrites desktop naver path posts to PostView.naver", () => {
    const input = new URL("https://blog.naver.com/travel_blog/223456789012");
    const resolved = resolveFetchUrl(input);
    expect(resolved.hostname).toBe("blog.naver.com");
    expect(resolved.pathname).toBe("/PostView.naver");
    expect(resolved.searchParams.get("blogId")).toBe("travel_blog");
    expect(resolved.searchParams.get("logNo")).toBe("223456789012");
  });

  it("rewrites mobile naver path posts to PostView.naver", () => {
    const input = new URL("https://m.blog.naver.com/travel_blog/223456789012");
    const resolved = resolveFetchUrl(input);
    expect(resolved.pathname).toBe("/PostView.naver");
    expect(resolved.searchParams.get("blogId")).toBe("travel_blog");
    expect(resolved.searchParams.get("logNo")).toBe("223456789012");
  });

  it("leaves PostView and tistory URLs unchanged", () => {
    const postView = new URL(
      "https://blog.naver.com/PostView.naver?blogId=a&logNo=1&redirect=Dlog&widgetTypeCall=true",
    );
    expect(resolveFetchUrl(postView).toString()).toBe(postView.toString());

    const tistory = new URL("https://myblog.tistory.com/123");
    expect(resolveFetchUrl(tistory).toString()).toBe(tistory.toString());
  });
});

describe("extractBlogText", () => {
  it("extracts naver smart editor body so target keywords are preserved", () => {
    const html = `
      <html><head><title>셸 제목</title></head>
      <body>
        <div id="mainFrame">네이버 블로그 셸</div>
        <div class="se-main-container">
          <div class="se-title-text">삿포로 여행 완벽 가이드</div>
          <p class="se-text-paragraph">첫 문단에 삿포로 여행 팁을 담았습니다.</p>
        </div>
      </body></html>
    `;
    const text = extractBlogText(html);
    expect(text).toContain("삿포로 여행");
    expect(text).toContain("완벽 가이드");
    expect(text).not.toContain("네이버 블로그 셸");
  });

  it("falls back to full-page text when article container is missing", () => {
    const text = extractBlogText("<html><body><p>티스토리 본문 키워드</p></body></html>");
    expect(text).toContain("티스토리 본문 키워드");
  });
});

describe("fetchPublicHtml", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("follows a 307 chain instead of failing on the first redirect", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url === "https://example.com/") {
          return new Response(null, {
            status: 307,
            headers: { location: "https://www.example.com/" },
          });
        }
        if (url === "https://www.example.com/") {
          return new Response(null, {
            status: 307,
            headers: { location: "/home" },
          });
        }
        return new Response("<html><title>ok</title></html>", { status: 200 });
      }),
    );

    const result = await fetchPublicHtml("https://example.com/");
    expect(result.html).toContain("ok");
  });

  it("maps undici fetch failed to a Korean connection error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    await expect(fetchPublicHtml("https://example.com/")).rejects.toThrow(/연결하지 못했습니다/);
  });

  it("retries with relaxed TLS after a certificate error and still returns HTML", async () => {
    const err = new TypeError("fetch failed");
    (err as Error & { cause: Error }).cause = Object.assign(
      new Error("unable to verify the first certificate"),
      { code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE" },
    );
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw err;
      }),
    );
    vi.mocked(undiciFetch).mockResolvedValue(
      new Response("<html><title>ok</title></html>", { status: 200 }) as never,
    );

    const result = await fetchPublicHtml("https://example.com/");
    expect(result.html).toContain("ok");
    expect(result.tlsTrusted).toBe(false);
  });
});
