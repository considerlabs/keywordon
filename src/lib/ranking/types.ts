export type BlogRankingEntry = {
  rank: number;
  blogName: string;
  blogUrl: string;
  platform: "naver" | "tistory";
  postTitle: string;
  postUrl?: string;
  estimatedViews: number;
  keywordMatch: number;
  change: "up" | "down" | "same" | "new";
  delta: number;
  publishedAt?: string;
};

export type BlogRankingFilters = {
  keyword: string;
  category?: string;
  platform?: "all" | "naver" | "tistory";
  topN?: number;
};
