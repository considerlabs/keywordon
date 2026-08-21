const ALLOWED_HOSTS = ["blog.naver.com", "m.blog.naver.com", "tistory.com"] as const;

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

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchOnce(url: URL): Promise<Response> {
  return fetch(url.toString(), {
    redirect: "manual",
    headers: { "User-Agent": "KeywordOn/1.0 (+https://keywordon.app)" },
  });
}

/** Fetch HTML from an allowlisted URL with one manual redirect hop. */
export async function fetchAllowedUrl(raw: string): Promise<{ url: URL; text: string }> {
  const initial = assertAllowedUrl(raw);
  let response = await fetchOnce(initial);

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new SsrfError("리다이렉트 위치를 확인할 수 없습니다.");
    }
    const next = assertAllowedUrl(new URL(location, initial).toString());
    response = await fetchOnce(next);
  }

  if (!response.ok) {
    throw new SsrfError(`페이지를 불러오지 못했습니다. (${response.status})`);
  }

  const html = await response.text();
  return { url: initial, text: stripHtml(html).slice(0, 50_000) };
}
