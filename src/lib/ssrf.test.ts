import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(async () => ({ address: "93.184.216.34", family: 4 })),
}));

import { EventEmitter } from "node:events";
import https from "node:https";
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
    vi.restoreAllMocks();
  });

  function stubHttps(
    handler: (opts: {
      hostname?: string | null;
      path?: string | null;
      rejectUnauthorized?: boolean;
    }) => { status?: number; location?: string; body?: string; error?: Error },
  ) {
    vi.spyOn(https, "request").mockImplementation((opts, cb) => {
      const options = (typeof opts === "object" && opts && !("href" in opts) ? opts : {}) as {
        hostname?: string;
        path?: string;
        rejectUnauthorized?: boolean;
      };
      const req = new EventEmitter();
      Object.assign(req, {
        end: () => {
          const step = handler(options);
          if (step.error) {
            queueMicrotask(() => req.emit("error", step.error));
            return req;
          }
          const res = new EventEmitter();
          Object.assign(res, {
            statusCode: step.status ?? 200,
            headers: { location: step.location },
          });
          if (typeof cb === "function") cb(res as never);
          queueMicrotask(() => {
            res.emit("data", Buffer.from(step.body ?? ""));
            res.emit("end");
          });
          return req;
        },
        destroy: () => req,
      });
      return req as never;
    });
  }

  it("follows a 307 chain instead of failing on the first redirect", async () => {
    stubHttps((opts) => {
      if (opts.hostname === "example.com") {
        return { status: 307, location: "https://www.example.com/" };
      }
      if (opts.path === "/") {
        return { status: 307, location: "/home" };
      }
      return { status: 200, body: "<html><title>ok</title></html>" };
    });

    const result = await fetchPublicHtml("https://example.com/");
    expect(result.html).toContain("ok");
  });

  it("retries without certificate checks after a TLS error", async () => {
    const tlsError = Object.assign(new Error("unable to verify the first certificate"), {
      code: "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
    });
    stubHttps((opts) => {
      if (opts.rejectUnauthorized !== false) return { error: tlsError };
      return { status: 200, body: "<html><title>ok</title></html>" };
    });

    const result = await fetchPublicHtml("https://example.com/");
    expect(result.html).toContain("ok");
    expect(result.tlsTrusted).toBe(false);
  });

  it("uses HTML on a 307 when the site keeps redirecting to itself", async () => {
    stubHttps(() => ({
      status: 307,
      location: "https://example.com/",
      body: "<html><head><title>홈</title></head><body><h1>환영합니다</h1></body></html>",
    }));

    const result = await fetchPublicHtml("https://example.com/");
    expect(result.html).toContain("환영합니다");
  });

  it("does not throw a 307 status after following redirects", async () => {
    stubHttps(() => ({
      status: 307,
      location: "https://example.com/home",
      body: "<html><body>이동중</body></html>",
    }));
    const result = await fetchPublicHtml("https://example.com/");
    expect(result.html).toContain("이동중");
  });
});
