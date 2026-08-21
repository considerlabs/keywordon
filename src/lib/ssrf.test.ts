import { describe, expect, it } from "vitest";
import { assertAllowedUrl, isAllowedHost, SsrfError } from "./ssrf";

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

describe("isAllowedHost", () => {
  it("matches exact and subdomain hosts", () => {
    expect(isAllowedHost("blog.naver.com")).toBe(true);
    expect(isAllowedHost("www.blog.naver.com")).toBe(true);
    expect(isAllowedHost("foo.tistory.com")).toBe(true);
    expect(isAllowedHost("evil.com")).toBe(false);
  });
});
