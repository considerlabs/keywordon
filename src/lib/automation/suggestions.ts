import type { AutomationSuggestion } from "./types";

const CURATED: AutomationSuggestion[] = [
  {
    id: "curated-busan-trip",
    title: "주말 부산 당일치기 코스 정리",
    keyword: "부산 당일치기",
    monthlyVolume: 8100,
  },
  {
    id: "curated-cafe-review",
    title: "동네 카페 리뷰 쓰는 법",
    keyword: "카페 리뷰",
    monthlyVolume: 5400,
  },
  {
    id: "curated-remote-tips",
    title: "재택근무 생산성 루틴",
    keyword: "재택근무 팁",
    monthlyVolume: 3200,
  },
  {
    id: "curated-skin-care",
    title: "환절기 스킨케어 체크리스트",
    keyword: "환절기 스킨케어",
    monthlyVolume: 2900,
  },
  {
    id: "curated-side-hustle",
    title: "직장인 사이드프로젝트 시작 가이드",
    keyword: "사이드프로젝트",
    monthlyVolume: 4100,
  },
  {
    id: "curated-parenting",
    title: "아이와 주말 실내 활동 아이디어",
    keyword: "주말 실내 활동",
    monthlyVolume: 3600,
  },
  {
    id: "curated-invest-basics",
    title: "초보 투자자가 먼저 배울 것",
    keyword: "투자 기초",
    monthlyVolume: 6700,
  },
];

export function getCuratedSuggestions(): AutomationSuggestion[] {
  return CURATED.map((item) => ({ ...item }));
}

export function mergeTrendSuggestions(
  trends: { keyword: string; volume?: number }[],
): AutomationSuggestion[] {
  const merged: AutomationSuggestion[] = getCuratedSuggestions();
  const seen = new Set(merged.map((item) => item.keyword.trim().toLowerCase()));

  for (const trend of trends) {
    if (merged.length >= 12) break;
    const keyword = (trend.keyword ?? "").trim();
    if (!keyword) continue;
    const key = keyword.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push({
      id: `trend-${merged.length}-${keyword.slice(0, 24)}`,
      title: `${keyword} 트렌드 글감`,
      keyword,
      monthlyVolume: trend.volume,
    });
  }

  return merged.slice(0, 12);
}
