export type Engine = "naver" | "google";
export type AdCompetition = "심화" | "혼잡" | "적당" | "없음";
export type IssueLevel = "높음" | "보통" | "낮음" | "없음";

export interface MonthlyTrendPoint {
  month: string;
  volume: number;
  pc: number;
  mobile: number;
}

export interface RelatedKeyword {
  keyword: string;
  monthlyVolume: number;
  opportunityScore: number;
  competition: AdCompetition;
  source: "internal" | "serp";
}

export interface ContentVolume {
  totalDocs: number;
  blogMonthly: number;
  blogTotal: number;
  cafeMonthly: number;
  cafeTotal: number;
  kinMonthly: number;
  kinTotal: number;
}

export interface KeywordAnalysis {
  keyword: string;
  engine: Engine;
  analyzedAt: string;
  monthlyVolume: number;
  pcVolume: number;
  mobileVolume: number;
  volumeChangeRate: number;
  cpc: number;
  adCompetition: AdCompetition;
  opportunityScore: number;
  issueLevel: IssueLevel;
  issueScore: number;
  category: string;
  subcategory: string;
  content: ContentVolume;
  genderRatio: { male: number; female: number };
  ageDistribution: { label: string; value: number }[];
  deviceRatio: { pc: number; mobile: number };
  monthlyTrend: MonthlyTrendPoint[];
  relatedInternal: RelatedKeyword[];
  relatedSerp: RelatedKeyword[];
  smartBlockKeywords: string[];
  nextKeywords: string[];
  summary: string;
}

export interface TrendItem {
  rank: number;
  keyword: string;
  change: "up" | "down" | "same" | "new";
  delta: number;
}

const EMPTY_CONTENT: ContentVolume = {
  totalDocs: 0,
  blogMonthly: 0,
  blogTotal: 0,
  cafeMonthly: 0,
  cafeTotal: 0,
  kinMonthly: 0,
  kinTotal: 0,
};

/** Empty analysis shell. Unknown metrics stay 0/empty — never invent values. */
export function emptyKeywordAnalysis(keyword: string, engine: Engine = "naver"): KeywordAnalysis {
  const trimmed = keyword.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new Error("키워드를 입력해 주세요.");

  return {
    keyword: trimmed,
    engine,
    analyzedAt: new Date().toISOString(),
    monthlyVolume: 0,
    pcVolume: 0,
    mobileVolume: 0,
    volumeChangeRate: 0,
    cpc: 0,
    adCompetition: "없음",
    opportunityScore: 0,
    issueLevel: "없음",
    issueScore: 0,
    category: "미분류",
    subcategory: "미분류",
    content: { ...EMPTY_CONTENT },
    genderRatio: { male: 0, female: 0 },
    ageDistribution: ["10대", "20대", "30대", "40대", "50대", "60대+"].map((label) => ({
      label,
      value: 0,
    })),
    deviceRatio: { pc: 0, mobile: 0 },
    monthlyTrend: [],
    relatedInternal: [],
    relatedSerp: [],
    smartBlockKeywords: [],
    nextKeywords: [],
    summary: `'${trimmed}' 실측 데이터가 없습니다.`,
  };
}
