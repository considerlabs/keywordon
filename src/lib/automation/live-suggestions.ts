import type { AutomationSuggestion } from "./types";
import { getCuratedSuggestions } from "./suggestions";

export type DirectoryPost = {
  title: string;
  logNo: string;
  blogId: string;
  briefContents: string;
  directorySeq: number;
};

/** Popular Naver blog directories for daily idea seeds. */
const DIRECTORY_SEQS = [
  27, // 국내여행
  28, // 세계여행
  29, // 맛집
  20, // 요리·레시피
  30, // IT·컴퓨터
  32, // 건강·의학
  21, // 상품리뷰
  15, // 육아·결혼
] as const;

export function stripSuggestionHtml(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function titleToKeyword(title: string): string {
  const cleaned = stripSuggestionHtml(title)
    .replace(/\[([^\]]*)\]/g, "$1 ")
    .replace(/["'“”‘’「」『』]/g, " ")
    .replace(/[|｜].*$/, " ")
    .replace(/[·•]/g, " ")
    .replace(/[^\w가-힣0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter((word) => word.length >= 2);
  const phrase = (words.slice(0, 3).join(" ") || cleaned).slice(0, 28).trim();
  return phrase || cleaned.slice(0, 20) || "블로그 주제";
}

export function parseDirectoryPostListPayload(raw: string): DirectoryPost[] {
  const jsonStart = raw.indexOf("{");
  if (jsonStart < 0) return [];
  const data = JSON.parse(raw.slice(jsonStart)) as {
    result?: { postList?: Array<Record<string, unknown>> };
  };
  const list = data.result?.postList;
  if (!Array.isArray(list)) return [];

  const posts: DirectoryPost[] = [];
  for (const row of list) {
    const title = stripSuggestionHtml(String(row.title ?? row.noTagTitle ?? ""));
    const logNo = String(row.logNo ?? "").trim();
    const blogId = String(row.domainIdOrBlogId ?? "").trim();
    if (!title || !logNo) continue;
    posts.push({
      title,
      logNo,
      blogId,
      briefContents: stripSuggestionHtml(String(row.briefContents ?? "")),
      directorySeq: Number(row.directorySeq ?? row.directory ?? 0) || 0,
    });
  }
  return posts;
}

export function mapDirectoryPostsToSuggestions(
  posts: DirectoryPost[],
  limit = 12,
): AutomationSuggestion[] {
  const suggestions: AutomationSuggestion[] = [];
  const seen = new Set<string>();

  for (const post of posts) {
    if (suggestions.length >= limit) break;
    const title = post.title.trim();
    const keyword = titleToKeyword(title);
    const key = keyword.toLowerCase();
    if (!keyword || seen.has(key)) continue;
    seen.add(key);
    suggestions.push({
      id: `live-${post.blogId || "blog"}-${post.logNo}`,
      title: title.slice(0, 120),
      keyword,
    });
  }

  return suggestions;
}

async function fetchDirectoryPosts(directorySeq: number, count = 3): Promise<DirectoryPost[]> {
  const url = new URL("https://section.blog.naver.com/ajax/DirectoryPostList.naver");
  url.searchParams.set("directorySeq", String(directorySeq));
  url.searchParams.set("countPerPage", String(count));
  url.searchParams.set("currentPage", "1");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; KeywordOn/1.0; +https://keywordon.app)",
      Accept: "application/json, text/plain, */*",
      Referer: "https://section.blog.naver.com/",
      "X-Requested-With": "XMLHttpRequest",
    },
  });
  if (!response.ok) return [];
  return parseDirectoryPostListPayload(await response.text());
}

/** Live “오늘의 추천” from Naver blog directory feeds. Falls back to curated list. */
export async function buildLiveSuggestions(limit = 12): Promise<{
  suggestions: AutomationSuggestion[];
  source: "live" | "curated";
}> {
  try {
    const batches = await Promise.all(
      DIRECTORY_SEQS.map((seq) => fetchDirectoryPosts(seq, 2)),
    );
    const posts = batches.flat();
    const suggestions = mapDirectoryPostsToSuggestions(posts, limit);
    if (suggestions.length >= 5) {
      return { suggestions, source: "live" };
    }
  } catch {
    /* fall through */
  }

  return { suggestions: getCuratedSuggestions().slice(0, limit), source: "curated" };
}
