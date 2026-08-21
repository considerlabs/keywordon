import type { BlogRankingEntry } from "./types";

export type NaverSearchItem = {
  blogId: string;
  logNo: string;
  postUrl: string;
  title: string;
  nickName: string;
  blogName: string;
  addDate: number;
};

export type NaverSearchResult = {
  totalCount: number;
  items: NaverSearchItem[];
};

export function stripRankingHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function keywordMatchScore(title: string, keyword: string): number {
  const tokens = keyword
    .trim()
    .split(/\s+/)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 1);
  if (tokens.length === 0) return 0;
  const hay = title.toLowerCase();
  const hits = tokens.filter((token) => hay.includes(token)).length;
  return Math.round((hits / tokens.length) * 100);
}

export function parseNaverSearchListPayload(raw: string): NaverSearchResult {
  const jsonStart = raw.indexOf("{");
  if (jsonStart < 0) {
    throw new Error("네이버 블로그 검색 응답을 파싱하지 못했습니다.");
  }
  const data = JSON.parse(raw.slice(jsonStart)) as {
    result?: {
      totalCount?: number;
      searchList?: Array<Record<string, unknown>>;
    };
  };
  const list = data.result?.searchList;
  if (!Array.isArray(list)) {
    throw new Error("네이버 블로그 검색 결과가 비어 있습니다.");
  }

  const items: NaverSearchItem[] = [];
  for (const row of list) {
    const blogId = String(row.domainIdOrBlogId ?? "").trim();
    const logNo = String(row.logNo ?? "").trim();
    const postUrl = String(row.postUrl ?? "").trim();
    const title = stripRankingHtml(String(row.title ?? row.noTagTitle ?? ""));
    if (!blogId || !title) continue;
    items.push({
      blogId,
      logNo,
      postUrl: postUrl || `https://blog.naver.com/${blogId}/${logNo}`,
      title,
      nickName: String(row.nickName ?? "").trim(),
      blogName: String(row.blogName ?? "").trim() || String(row.nickName ?? "").trim() || blogId,
      addDate: Number(row.addDate) || 0,
    });
  }

  return {
    totalCount: Number(data.result?.totalCount) || items.length,
    items,
  };
}

export function mapSearchListToRanking(
  result: NaverSearchResult,
  keyword: string,
): BlogRankingEntry[] {
  return result.items.map((item, index) => ({
    rank: index + 1,
    blogName: item.blogName,
    blogUrl: `https://blog.naver.com/${item.blogId}`,
    platform: "naver" as const,
    postTitle: item.title,
    postUrl: item.postUrl,
    estimatedViews: 0,
    keywordMatch: keywordMatchScore(item.title, keyword),
    change: "same" as const,
    delta: 0,
    publishedAt: item.addDate
      ? new Date(item.addDate).toISOString().slice(0, 10)
      : undefined,
  }));
}

export async function fetchNaverBlogRanking(
  keyword: string,
  topN = 20,
): Promise<{ entries: BlogRankingEntry[]; totalCount: number }> {
  const q = keyword.trim();
  if (!q) {
    throw new Error("키워드를 입력해 주세요.");
  }

  const url = new URL("https://section.blog.naver.com/ajax/SearchList.naver");
  url.searchParams.set("countPerPage", String(Math.min(50, Math.max(10, topN))));
  url.searchParams.set("currentPage", "1");
  url.searchParams.set("endDate", "");
  url.searchParams.set("keyword", q);
  url.searchParams.set("orderBy", "sim");
  url.searchParams.set("startDate", "");
  url.searchParams.set("type", "post");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; KeywordOn/1.0; +https://keywordon.app)",
      Accept: "application/json, text/plain, */*",
      Referer: `https://section.blog.naver.com/Search/Post.naver?pageNo=1&rangeType=ALL&orderBy=sim&keyword=${encodeURIComponent(q)}`,
      "X-Requested-With": "XMLHttpRequest",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`네이버 블로그 검색에 실패했습니다. (${response.status})`);
  }

  const raw = await response.text();
  const parsed = parseNaverSearchListPayload(raw);
  if (parsed.items.length === 0) {
    throw new Error("검색 결과가 없습니다. 다른 키워드로 시도해 주세요.");
  }

  return {
    entries: mapSearchListToRanking(parsed, q).slice(0, topN),
    totalCount: parsed.totalCount,
  };
}
