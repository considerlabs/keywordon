export type ShortformProjectStatus = "draft" | "ready" | "exported";

export type ShortformScene = {
  label: string;
  narration: string;
  subtitle: string;
  visual: string;
};

export type ShortformScript = {
  hook: string;
  scenes: ShortformScene[];
  fullNarration: string;
  cta: string;
};

export type PopularShortformItem = {
  id: string;
  title: string;
  platform: string;
  views: string;
  keyword?: string;
  sourceUrl?: string;
  brief?: string;
};

/** Fallback when live directory fetch fails. */
export const POPULAR_SHORTFORM_MOCK: PopularShortformItem[] = [
  {
    id: "pop-1",
    title: "보험 설계사가 매출 올리는 3가지 루틴",
    platform: "추천",
    views: "큐레이션",
    keyword: "보험 영업 루틴",
  },
  {
    id: "pop-2",
    title: "블로그 글 1개로 릴스 3개 만드는 법",
    platform: "추천",
    views: "큐레이션",
    keyword: "블로그 릴스",
  },
  {
    id: "pop-3",
    title: "키워드 리서치 5분 컷 (초보자용)",
    platform: "추천",
    views: "큐레이션",
    keyword: "키워드 리서치",
  },
];

export function suggestionIdToBlogUrl(id: string): string | undefined {
  const match = id.match(/^live-(.+)-(\d+)$/);
  if (!match) return undefined;
  return `https://blog.naver.com/${match[1]}/${match[2]}`;
}
