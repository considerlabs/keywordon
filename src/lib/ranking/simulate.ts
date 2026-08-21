import { hashString, seededRandom } from "@/lib/utils";

export type BlogRankingEntry = {
  rank: number;
  blogName: string;
  blogUrl: string;
  platform: "naver" | "tistory";
  postTitle: string;
  estimatedViews: number;
  keywordMatch: number;
  change: "up" | "down" | "same" | "new";
  delta: number;
};

export type BlogRankingFilters = {
  keyword: string;
  category?: string;
  platform?: "all" | "naver" | "tistory";
  topN?: number;
};

const CATEGORIES = [
  "생활/건강",
  "쇼핑",
  "비즈니스/경제",
  "IT/기술",
  "교육",
  "여행",
  "음식",
  "부동산",
  "금융",
  "엔터테인먼트",
] as const;

const BLOG_PREFIXES = [
  "데일리",
  "리뷰",
  "꿀팁",
  "노하우",
  "솔직",
  "초보",
  "전문",
  "실속",
  "꼼꼼",
  "솔루션",
];

export function getRankingCategories(): string[] {
  return [...CATEGORIES];
}

export function buildBlogRanking(filters: BlogRankingFilters): BlogRankingEntry[] {
  const keyword = filters.keyword.trim() || "블로그 마케팅";
  const topN = Math.min(50, Math.max(10, filters.topN ?? 20));
  const seed = hashString(`ranking:${keyword}:${filters.category ?? "all"}:${filters.platform ?? "all"}`);
  const rand = seededRandom(seed);

  const changes: BlogRankingEntry["change"][] = ["up", "down", "same", "new"];
  const entries: BlogRankingEntry[] = [];
  let attempts = 0;
  const maxAttempts = topN * 4;

  while (entries.length < topN && attempts < maxAttempts) {
    attempts += 1;
    const platform: "naver" | "tistory" = rand() > 0.35 ? "naver" : "tistory";
    if (filters.platform === "naver" && platform !== "naver") continue;
    if (filters.platform === "tistory" && platform !== "tistory") continue;

    const prefix = BLOG_PREFIXES[Math.floor(rand() * BLOG_PREFIXES.length)];
    const blogName = `${prefix} ${keyword.slice(0, 8)}`.trim();
    const slug = encodeURIComponent(blogName.replace(/\s+/g, "-").toLowerCase());
    const blogUrl =
      platform === "naver"
        ? `https://blog.naver.com/${slug}`
        : `https://${slug}.tistory.com`;

    entries.push({
      rank: entries.length + 1,
      blogName,
      blogUrl,
      platform,
      postTitle: `${keyword} ${entries.length + 1}번째 인기 포스팅`,
      estimatedViews: Math.floor(500 + rand() * 50000),
      keywordMatch: Math.floor(40 + rand() * 60),
      change: changes[Math.floor(rand() * changes.length)],
      delta: Math.floor(rand() * 8) + 1,
    });
  }

  return entries;
}

export function getDefaultRankingKeyword(): string {
  return "에어프라이어 레시피";
}
