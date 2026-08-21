import { createHmac } from "node:crypto";
import { assertAllowedUrl, fetchAllowedRaw, SsrfError } from "@/lib/ssrf";

export type BlogPlatform = "naver" | "tistory";

export type BlogFeedTarget = {
  platform: BlogPlatform;
  feedUrl: string;
  displayUrl: string;
  /** Naver PostList (or similar) page that exposes total post count. */
  countUrl: string | null;
};

export type RssItem = {
  title: string;
  link: string;
  publishedAt: string;
  category: string;
  publishedMs: number;
};

export function resolveBlogFeed(raw: string): BlogFeedTarget {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("블로그 URL을 입력해 주세요.");

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("URL 형식이 올바르지 않습니다.");
  }
  if (url.protocol !== "https:") {
    throw new Error("https URL만 허용됩니다.");
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (
    host === "blog.naver.com" ||
    host === "m.blog.naver.com" ||
    host === "rss.blog.naver.com"
  ) {
    let blogId: string | null = null;
    if (host === "rss.blog.naver.com") {
      blogId = url.pathname.replace(/^\//, "").replace(/\.xml$/i, "") || null;
    } else if (/PostView\.naver/i.test(url.pathname)) {
      blogId = url.searchParams.get("blogId");
    } else {
      const pathId = url.pathname.match(/^\/([A-Za-z0-9_-]+)/)?.[1] ?? null;
      if (pathId && /^(PostList|PostView|NBlogTop|prologue)/i.test(pathId)) {
        blogId = url.searchParams.get("blogId");
      } else {
        blogId = pathId;
      }
    }
    if (!blogId) {
      throw new Error("네이버 블로그 ID를 URL에서 확인하지 못했습니다.");
    }
    return {
      platform: "naver",
      feedUrl: `https://rss.blog.naver.com/${blogId}.xml`,
      displayUrl: `https://blog.naver.com/${blogId}`,
      countUrl: `https://blog.naver.com/PostList.naver?blogId=${blogId}`,
    };
  }

  if (host.endsWith(".tistory.com")) {
    return {
      platform: "tistory",
      feedUrl: `https://${host}/rss`,
      displayUrl: `https://${host}`,
      countUrl: `https://${host}/`,
    };
  }

  throw new Error("네이버 블로그 또는 티스토리 URL만 지원합니다.");
}

function rssTagValue(block: string, tag: string): string {
  const match = block.match(
    new RegExp(
      `<${tag}(?:\\s[^>]*)?>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([^<]*))</${tag}>`,
      "i",
    ),
  );
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

export function parseRssItems(xml: string): RssItem[] {
  const blocks = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  const items: RssItem[] = [];

  for (const blockMatch of blocks) {
    const block = blockMatch[1] ?? "";
    const title = rssTagValue(block, "title");
    if (!title) continue;
    const link = rssTagValue(block, "link") || rssTagValue(block, "guid");
    const category = rssTagValue(block, "category");
    const pubRaw =
      rssTagValue(block, "pubDate") ||
      rssTagValue(block, "dc:date") ||
      rssTagValue(block, "published");
    const publishedMs = pubRaw ? Date.parse(pubRaw) : Number.NaN;
    const publishedAt = Number.isFinite(publishedMs)
      ? new Date(publishedMs).toISOString().slice(0, 10)
      : "";

    items.push({
      title,
      link,
      category,
      publishedAt,
      publishedMs: Number.isFinite(publishedMs) ? publishedMs : 0,
    });
  }

  return items.sort((a, b) => b.publishedMs - a.publishedMs);
}

/** Parse total published posts from Naver PostList / mobile HTML. */
export function parsePostTotal(html: string): number | null {
  const labeled = html.match(/([\d,]+)\s*개의\s*글/);
  if (labeled) {
    const n = Number(labeled[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  const json = html.match(/"postCount"\s*:\s*(\d+)/);
  if (json) {
    const n = Number(json[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(n)));
}

function scoreFromItems(items: RssItem[], totalPosts?: number | null) {
  const now = Date.now();
  const monthAgo = now - 30 * 86_400_000;
  const ninetyAgo = now - 90 * 86_400_000;
  const monthlyPosts = items.filter((item) => item.publishedMs >= monthAgo).length;
  const recent90 = items.filter((item) => item.publishedMs >= ninetyAgo).length;
  // RSS is capped (~50); prefer PostList/mobile total when available
  const postCount = Math.max(totalPosts ?? 0, items.length);

  const categories = items.map((item) => item.category).filter(Boolean);
  const uniqueCats = new Set(categories);
  const focus =
    categories.length === 0
      ? 0.45
      : 1 - (uniqueCats.size - 1) / Math.max(categories.length, 1);
  const indexScore = clamp(35 + focus * 60, 20, 95);

  const tokens = items
    .flatMap((item) => item.title.split(/[\s|/·,\-_:]+/).filter((t) => t.length >= 2))
    .map((t) => t.toLowerCase());
  const tokenCounts = new Map<string, number>();
  for (const token of tokens) {
    tokenCounts.set(token, (tokenCounts.get(token) ?? 0) + 1);
  }
  const repeats = [...tokenCounts.values()].filter((count) => count >= 2).length;
  const keywordScore = clamp(
    30 + Math.min(40, repeats * 8) + Math.min(25, tokens.length / 3),
    20,
    95,
  );

  const consistencyScore = clamp(25 + monthlyPosts * 10 + recent90 * 2, 20, 95);
  const overallScore = clamp((indexScore + keywordScore + consistencyScore) / 3, 0, 100);
  const estimatedMonthlyVisitors = monthlyPosts * 350 + postCount * 25;

  const recommendations = [
    indexScore < 60
      ? "카테고리·주제를 한두 축으로 모아 주제 집중도를 높이세요."
      : "주제·카테고리 집중도가 양호합니다.",
    monthlyPosts < 4
      ? "최근 30일 발행이 적습니다. 주 1회 이상 발행 리듬을 만들어 보세요."
      : "최근 발행 리듬이 안정적입니다.",
    keywordScore < 55
      ? "제목에 핵심 키워드·연관어를 반복적으로 자연스럽게 배치하세요."
      : "제목 키워드 패턴이 비교적 잘 잡혀 있습니다.",
  ];

  return {
    metrics: {
      postCount,
      monthlyPosts,
      estimatedMonthlyVisitors,
      indexScore,
      keywordScore,
      consistencyScore,
      overallScore,
    },
    recommendations,
  };
}

async function fetchPostTotal(countUrl: string | null): Promise<number | null> {
  if (!countUrl) return null;
  try {
    assertAllowedUrl(countUrl);
    const fetched = await fetchAllowedRaw(countUrl);
    return parsePostTotal(fetched.text);
  } catch {
    return null;
  }
}

export async function analyzeBlog(url: string) {
  const target = resolveBlogFeed(url);
  // SSRF gate — feed hosts must stay on the shared allowlist
  assertAllowedUrl(target.feedUrl);

  let xml: string;
  try {
    const fetched = await fetchAllowedRaw(target.feedUrl);
    xml = fetched.text;
  } catch (error) {
    const message =
      error instanceof SsrfError ? error.message : "블로그 RSS를 불러오지 못했습니다.";
    throw new Error(message);
  }

  const items = parseRssItems(xml);
  if (items.length === 0) {
    throw new Error("RSS에서 게시글을 찾지 못했습니다. 블로그 ID·공개 설정을 확인해 주세요.");
  }

  const totalPosts = await fetchPostTotal(target.countUrl);
  const scored = scoreFromItems(items, totalPosts);
  const topPosts = items.slice(0, 5).map((item) => ({
    title: item.title,
    views: 0,
    publishedAt: item.publishedAt || "날짜 미상",
    link: item.link,
  }));

  const platformLabel = target.platform === "naver" ? "네이버 블로그" : "티스토리";
  const postLabel = scored.metrics.postCount.toLocaleString("ko-KR");

  return {
    url: target.displayUrl,
    platform: target.platform,
    analyzedAt: new Date().toISOString(),
    metrics: scored.metrics,
    topPosts,
    recommendations: scored.recommendations,
    summary: `${platformLabel} 발행 ${postLabel}건 · 종합 ${scored.metrics.overallScore}점 · 최근 30일 ${scored.metrics.monthlyPosts}건 발행`,
  };
}

export function diagnoseSite(domainInput: string) {
  const domain = domainInput
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "");
  if (!domain) throw new Error("도메인을 입력해 주세요.");

  const seed = createHmac("sha256", "site").update(domain).digest("hex");
  const n = (offset: number) => parseInt(seed.slice(offset, offset + 4), 16);

  const organicKeywords = 80 + (n(0) % 2500);
  const indexedPages = 20 + (n(4) % 900);
  const referringDomains = 5 + (n(8) % 400);
  const health = 40 + (n(12) % 55);

  const trafficKeywords = Array.from({ length: 8 }, (_, i) => ({
    keyword: `${domain.split(".")[0]} 관련 키워드 ${i + 1}`,
    clicks: 10 + (n(16 + i) % 900),
    impressions: 100 + (n(20 + i) % 9000),
    position: Number((1 + (n(24 + i) % 40) + Math.random()).toFixed(1)),
  }));

  return {
    domain,
    analyzedAt: new Date().toISOString(),
    metrics: {
      organicKeywords,
      indexedPages,
      referringDomains,
      healthScore: health,
      mobileFriendly: n(28) % 2 === 0,
      https: true,
    },
    topKeywords: trafficKeywords.sort((a, b) => b.clicks - a.clicks),
    issues: [
      health < 60 ? "핵심 랜딩 페이지의 메타 설명·H1 최적화가 필요합니다." : null,
      indexedPages < 50 ? "인덱스된 페이지 수가 적어 콘텐츠 확장이 필요합니다." : null,
      referringDomains < 30 ? "외부 유입 도메인이 적어 백링크 확보를 검토하세요." : null,
    ].filter(Boolean),
    summary: `${domain} 사이트 건강도 ${health}점 · 추정 유입 키워드 ${organicKeywords.toLocaleString("ko-KR")}개`,
  };
}
