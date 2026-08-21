export const POST_TYPES = [
  { id: "travel", label: "여행 후기", tags: ["여행", "관광"] },
  { id: "restaurant", label: "맛집/카페", tags: ["맛집", "카페"] },
  { id: "info", label: "정보/가이드", tags: ["정보", "가이드"] },
  { id: "promo", label: "홍보/이벤트", tags: ["홍보", "이벤트"] },
  { id: "it_review", label: "IT/리뷰", tags: ["IT", "리뷰"] },
  { id: "biz", label: "비즈니스", tags: ["비즈니스"] },
  { id: "beauty", label: "뷰티/패션", tags: ["뷰티", "패션"] },
  { id: "daily", label: "일상/취미", tags: ["일상", "취미"] },
] as const;

export const TONE_PRESETS = [
  "자동 설정",
  "~해요",
  "~합니다",
  "~한다(반말)",
] as const;

export const CHAR_COUNTS = [500, 1000, 1500, 2000, 3000] as const;

export type WritePromptFlags = {
  useLatestSearch: boolean;
  hashtags: boolean;
  seoInsights: boolean;
};

export type WriteKeywordStats = {
  monthlyVolume: number;
  category: string;
  related: string[];
};

export type WritePromptInput = {
  postTypeLabel: string;
  title: string;
  keywords: string[];
  charCount: number;
  tone: string;
  emphasis: string;
  flags: WritePromptFlags;
  keywordStats: WriteKeywordStats;
  personaBlock: string | null;
};

export type WritePromptOutput = {
  system: string;
  user: string;
};
