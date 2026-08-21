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
};

export const POPULAR_SHORTFORM_MOCK: PopularShortformItem[] = [
  {
    id: "pop-1",
    title: "보험 설계사가 매출 올리는 3가지 루틴",
    platform: "YouTube Shorts",
    views: "12.4만",
  },
  {
    id: "pop-2",
    title: "블로그 글 1개로 릴스 3개 만드는 법",
    platform: "Instagram Reels",
    views: "8.7만",
  },
  {
    id: "pop-3",
    title: "키워드 리서치 5분 컷 (초보자용)",
    platform: "TikTok",
    views: "5.2만",
  },
  {
    id: "pop-4",
    title: "네이버 블로그 상위노출 체크리스트",
    platform: "YouTube Shorts",
    views: "4.1만",
  },
  {
    id: "pop-5",
    title: "콘텐츠 캘린더 없이 주 3회 발행하는 방법",
    platform: "Instagram Reels",
    views: "3.6만",
  },
];
