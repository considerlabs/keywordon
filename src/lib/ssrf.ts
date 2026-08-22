import { setDefaultResultOrder } from "node:dns";

const ALLOWED_HOSTS = ["blog.naver.com", "m.blog.naver.com", "tistory.com"] as const;

try {
  setDefaultResultOrder("ipv4first");
} catch {
  /* Node versions without this API */
}

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

function normalizeHost(hostname: string): string {
  return hostname.replace(/^www\./, "").toLowerCase();
}

export function isAllowedHost(hostname: string): boolean {
  const host = normalizeHost(hostname);
  return ALLOWED_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

function isPrivateIpv4(octets: number[]): boolean {
  if (octets.length !== 4) return false;
  const [a, b] = octets;
  if (a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function assertNotPrivateIp(hostname: string): void {
  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return;
  const octets = ipv4.slice(1, 5).map((part) => Number(part));
  if (octets.some((part) => part > 255)) {
    throw new SsrfError("허용되지 않는 IP 주소입니다.");
  }
  if (isPrivateIpv4(octets)) {
    throw new SsrfError("사설 IP 주소는 허용되지 않습니다.");
  }
}

/** Validate user-supplied URL against the shared blog allowlist. */
export function assertAllowedUrl(raw: string): URL {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new SsrfError("URL 형식이 올바르지 않습니다.");
  }
  if (url.protocol !== "https:") {
    throw new SsrfError("https URL만 허용됩니다.");
  }
  assertNotPrivateIp(url.hostname);
  if (!isAllowedHost(url.hostname)) {
    throw new SsrfError(
      "네이버 블로그(blog.naver.com, m.blog.naver.com) 또는 티스토리(*.tistory.com) URL만 허용됩니다.",
    );
  }
  return url;
}

/**
 * Desktop `blog.naver.com/{id}/{logNo}` returns an iframe shell without the post body.
 * Fetch PostView.naver so SEO audit / AI see the real article text.
 */
export function resolveFetchUrl(url: URL): URL {
  const host = normalizeHost(url.hostname);
  if (host !== "blog.naver.com" && host !== "m.blog.naver.com") {
    return url;
  }
  if (/PostView\.naver/i.test(url.pathname)) {
    return url;
  }
  const match = url.pathname.match(/^\/([A-Za-z0-9_-]+)\/(\d+)\/?$/);
  if (!match) return url;

  const next = new URL("https://blog.naver.com/PostView.naver");
  next.searchParams.set("blogId", match[1]);
  next.searchParams.set("logNo", match[2]);
  next.searchParams.set("redirect", "Dlog");
  next.searchParams.set("widgetTypeCall", "true");
  return next;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Prefer Naver SE / postViewArea / article body over chrome/shell HTML. */
export function extractBlogText(html: string): string {
  const patterns = [
    /<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*)/i,
    /<div[^>]*id="postViewArea"[^>]*>([\s\S]*)/i,
    /<article\b[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*(?:entry-content|tt_article_useless_p_margin)[^"]*"[^>]*>([\s\S]*)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match?.[1]) continue;
    const text = stripHtml(match[1].slice(0, 100_000));
    if (text.length >= 20) {
      return text.slice(0, 50_000);
    }
  }

  return stripHtml(html).slice(0, 50_000);
}

async function fetchOnce(url: URL): Promise<Response> {
  return fetch(url.toString(), {
    redirect: "manual",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; KeywordOn/1.0; +https://keywordon.app)",
      Accept: "text/html,application/xhtml+xml",
    },
  });
}

async function fetchAllowlisted(
  raw: string,
  options?: { rewriteNaverPost?: boolean },
): Promise<{ url: URL; body: string }> {
  const initial = assertAllowedUrl(raw);
  const target = options?.rewriteNaverPost === false ? initial : resolveFetchUrl(initial);
  let response = await fetchOnce(target);

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new SsrfError("리다이렉트 위치를 확인할 수 없습니다.");
    }
    const next = assertAllowedUrl(new URL(location, target).toString());
    const hop =
      options?.rewriteNaverPost === false ? next : resolveFetchUrl(next);
    response = await fetchOnce(hop);
  }

  if (!response.ok) {
    throw new SsrfError(`페이지를 불러오지 못했습니다. (${response.status})`);
  }

  return { url: initial, body: await response.text() };
}

/** Fetch HTML from an allowlisted URL with one manual redirect hop. */
export async function fetchAllowedUrl(raw: string): Promise<{ url: URL; text: string }> {
  const { url, body } = await fetchAllowlisted(raw);
  return { url, text: extractBlogText(body) };
}

/** Fetch raw body (RSS/XML) from an allowlisted URL — no HTML stripping. */
export async function fetchAllowedRaw(raw: string): Promise<{ url: URL; text: string }> {
  const { url, body } = await fetchAllowlisted(raw, { rewriteNaverPost: false });
  return { url, text: body };
}

function parseHttpsUrl(raw: string): URL {
  const trimmed = raw.trim();
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new SsrfError("URL 형식이 올바르지 않습니다.");
  }
  if (url.protocol !== "https:") {
    throw new SsrfError("https URL만 허용됩니다.");
  }
  if (url.username || url.password) {
    throw new SsrfError("URL에 인증 정보를 포함할 수 없습니다.");
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new SsrfError("사설 호스트는 허용되지 않습니다.");
  }
  assertNotPrivateIp(url.hostname);
  return url;
}

/** https + public IP only — used for arbitrary-domain site diagnosis (not blog allowlist). */
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
  const url = parseHttpsUrl(raw);
  const { lookup } = await import("node:dns/promises");
  try {
    let address: string;
    try {
      address = (await lookup(url.hostname, { family: 4 })).address;
    } catch {
      address = (await lookup(url.hostname)).address;
    }
    assertNotPrivateIp(address);
    const lower = address.toLowerCase();
    if (lower === "::1" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) {
      throw new SsrfError("사설 IP 주소는 허용되지 않습니다.");
    }
  } catch (error) {
    if (error instanceof SsrfError) throw error;
    throw new SsrfError("도메인을 확인할 수 없습니다.");
  }
  return url;
}

const MAX_PUBLIC_BODY = 1_000_000;

function mapPublicFetchError(error: unknown): never {
  const message = error instanceof Error ? error.message : "";
  const cause =
    error instanceof Error && error.cause instanceof Error ? error.cause.message : "";
  const combined = `${message} ${cause}`.toLowerCase();
  if (combined.includes("abort") || combined.includes("timeout")) {
    throw new SsrfError("사이트 응답 시간이 초과되었습니다.");
  }
  if (
    combined.includes("certificate") ||
    combined.includes("cert") ||
    combined.includes("ssl") ||
    combined.includes("tls")
  ) {
    throw new SsrfError("보안 인증서 검증에 실패했습니다.");
  }
  throw new SsrfError(
    "사이트에 연결하지 못했습니다. 도메인이 맞는지, HTTPS로 열리는 사이트인지 확인해 주세요.",
  );
}

async function fetchPublicOnce(url: URL): Promise<Response> {
  try {
    return await fetch(url.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(8_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
  } catch (error) {
    mapPublicFetchError(error);
  }
}

export async function fetchPublicHtml(raw: string): Promise<{ url: URL; html: string }> {
  let url = await assertPublicHttpsUrl(raw);
  let response = await fetchPublicOnce(url);

  for (let hop = 0; hop < 5 && response.status >= 300 && response.status < 400; hop += 1) {
    const location = response.headers.get("location")?.trim();
    if (!location) {
      throw new SsrfError("리다이렉트 위치를 확인할 수 없습니다.");
    }
    const next = new URL(location, url);
    if (next.protocol === "http:") next.protocol = "https:";
    url = await assertPublicHttpsUrl(next.toString());
    response = await fetchPublicOnce(url);
  }

  if (!response.ok) {
    throw new SsrfError(`페이지를 불러오지 못했습니다. (${response.status})`);
  }

  return { url, html: (await response.text()).slice(0, MAX_PUBLIC_BODY) };
}
