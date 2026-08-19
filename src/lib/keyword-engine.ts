import { formatNumber, hashString, seededRandom } from "./utils";

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

const CATEGORIES = [
  ["생활/건강", "건강정보"],
  ["쇼핑", "패션의류"],
  ["비즈니스/경제", "마케팅"],
  ["IT/기술", "소프트웨어"],
  ["교육", "자기계발"],
  ["여행", "국내여행"],
  ["음식", "맛집"],
  ["부동산", "매매"],
  ["금융", "투자"],
  ["엔터테인먼트", "방송"],
] as const;

const SUFFIXES = [
  "방법",
  "추천",
  "후기",
  "가격",
  "비교",
  "순위",
  "뜻",
  "효과",
  "부작용",
  "비용",
  "자격증",
  "강의",
  "사이트",
  "앱",
  "업체",
  "근처",
  "예약",
  "할인",
  "리뷰",
  "팁",
];

const PREFIXES = ["최고의", "저렴한", "인기", "신규", "가성비", "프리미엄", "초보"];

function pickCompetition(score: number): AdCompetition {
  if (score > 0.82) return "심화";
  if (score > 0.58) return "혼잡";
  if (score > 0.28) return "적당";
  return "없음";
}

function pickIssue(score: number): IssueLevel {
  if (score > 0.78) return "높음";
  if (score > 0.5) return "보통";
  if (score > 0.25) return "낮음";
  return "없음";
}

function monthLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(`${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return labels;
}

function buildRelated(
  keyword: string,
  rand: () => number,
  source: "internal" | "serp",
  count: number,
): RelatedKeyword[] {
  const base = keyword.replace(/\s+/g, "");
  const items: RelatedKeyword[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count * 3 && items.length < count; i += 1) {
    const mode = Math.floor(rand() * 3);
    let next = "";
    if (mode === 0) {
      next = `${base} ${SUFFIXES[Math.floor(rand() * SUFFIXES.length)]}`;
    } else if (mode === 1) {
      next = `${PREFIXES[Math.floor(rand() * PREFIXES.length)]} ${base}`;
    } else {
      next = `${base}${SUFFIXES[Math.floor(rand() * SUFFIXES.length)]}`;
    }
    if (used.has(next) || next === keyword) continue;
    used.add(next);
    const volume = Math.floor(80 + rand() * 48000);
    const opportunity = Math.floor(rand() * 30);
    items.push({
      keyword: next,
      monthlyVolume: volume,
      opportunityScore: opportunity,
      competition: pickCompetition(rand()),
      source,
    });
  }

  return items.sort((a, b) => b.monthlyVolume - a.monthlyVolume);
}

export function analyzeKeyword(
  rawKeyword: string,
  engine: Engine = "naver",
): KeywordAnalysis {
  const keyword = rawKeyword.trim().replace(/\s+/g, " ");
  if (!keyword) {
    throw new Error("키워드를 입력해 주세요.");
  }

  const seed = hashString(`${engine}:${keyword.toLowerCase()}`);
  const rand = seededRandom(seed);
  const [category, subcategory] = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];

  const monthlyVolume = Math.floor(120 + rand() * 220000);
  const mobileShare = 0.55 + rand() * 0.35;
  const mobileVolume = Math.floor(monthlyVolume * mobileShare);
  const pcVolume = monthlyVolume - mobileVolume;
  const volumeChangeRate = Number(((rand() - 0.45) * 80).toFixed(1));
  const cpc = Math.floor(rand() * 4200);
  const adCompetition = pickCompetition(rand());
  const opportunityScore = Math.floor(rand() * 31);
  const issueScore = Number((rand() * 100).toFixed(1));
  const issueLevel = pickIssue(issueScore / 100);

  const blogTotal = Math.floor(800 + rand() * 180000);
  const cafeTotal = Math.floor(200 + rand() * 90000);
  const kinTotal = Math.floor(50 + rand() * 25000);

  const labels = monthLabels(12);
  const base = monthlyVolume * (0.7 + rand() * 0.5);
  const monthlyTrend: MonthlyTrendPoint[] = labels.map((month, index) => {
    const seasonal = 1 + Math.sin((index / 12) * Math.PI * 2 + rand()) * 0.18;
    const noise = 0.85 + rand() * 0.3;
    const volume = Math.max(30, Math.floor(base * seasonal * noise));
    const mobile = Math.floor(volume * mobileShare);
    return {
      month,
      volume,
      pc: volume - mobile,
      mobile,
    };
  });

  const male = Number((35 + rand() * 40).toFixed(1));
  const female = Number((100 - male).toFixed(1));

  const ageBuckets = ["10대", "20대", "30대", "40대", "50대", "60대+"];
  let remaining = 100;
  const ageDistribution = ageBuckets.map((label, index) => {
    if (index === ageBuckets.length - 1) {
      return { label, value: Number(remaining.toFixed(1)) };
    }
    const value = Number((8 + rand() * 22).toFixed(1));
    const capped = Math.min(value, remaining - (ageBuckets.length - index - 1) * 5);
    remaining = Number((remaining - capped).toFixed(1));
    return { label, value: capped };
  });

  const relatedInternal = buildRelated(keyword, rand, "internal", 12);
  const relatedSerp = buildRelated(keyword, rand, "serp", 10);

  const competitionHint =
    adCompetition === "없음" || adCompetition === "적당"
      ? "광고 경쟁이 상대적으로 낮아 콘텐츠 진입이 유리합니다."
      : "광고 경쟁이 높아 차별화된 콘텐츠 전략이 필요합니다.";

  const opportunityHint =
    opportunityScore >= 18
      ? "기회지수가 높아 상위 노출 가능성이 큽니다."
      : opportunityScore >= 10
        ? "기회지수는 보통 수준입니다. 롱테일 확장을 검토하세요."
        : "기회지수가 낮아 경쟁 키워드일 수 있습니다.";

  return {
    keyword,
    engine,
    analyzedAt: new Date().toISOString(),
    monthlyVolume,
    pcVolume,
    mobileVolume,
    volumeChangeRate,
    cpc,
    adCompetition,
    opportunityScore,
    issueLevel,
    issueScore,
    category,
    subcategory,
    content: {
      totalDocs: blogTotal + cafeTotal + kinTotal + Math.floor(rand() * 50000),
      blogMonthly: Math.floor(blogTotal * (0.02 + rand() * 0.08)),
      blogTotal,
      cafeMonthly: Math.floor(cafeTotal * (0.02 + rand() * 0.08)),
      cafeTotal,
      kinMonthly: Math.floor(kinTotal * (0.02 + rand() * 0.1)),
      kinTotal,
    },
    genderRatio: { male, female },
    ageDistribution,
    deviceRatio: {
      pc: Number(((pcVolume / monthlyVolume) * 100).toFixed(1)),
      mobile: Number(((mobileVolume / monthlyVolume) * 100).toFixed(1)),
    },
    monthlyTrend,
    relatedInternal,
    relatedSerp,
    smartBlockKeywords: relatedInternal.slice(0, 6).map((item) => item.keyword),
    nextKeywords: relatedSerp.slice(0, 5).map((item) => item.keyword),
    summary: `'${keyword}'의 월간 검색량은 약 ${formatNumber(monthlyVolume)}회이며, ${competitionHint} ${opportunityHint}`,
  };
}

export function analyzeBulk(
  keywords: string[],
  engine: Engine = "naver",
): KeywordAnalysis[] {
  const unique = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))];
  return unique.slice(0, 50).map((keyword) => analyzeKeyword(keyword, engine));
}

const TREND_POOL = [
  "부동산 정책",
  "여름 휴가 추천",
  "에어프라이어 레시피",
  "주식 시황",
  "캠핑 용품",
  "다이어트 식단",
  "노트북 추천",
  "아이폰 출시",
  "해외여행 준비",
  "자격증 추천",
  "전기차 보조금",
  "육아 용품",
  "카페 창업",
  "영어 공부법",
  "헬스장 회원권",
  "중고차 시세",
  "배달 창업",
  "피부관리",
  "반려견 훈련",
  "인테리어 소품",
];

export function getRealtimeTrends(): TrendItem[] {
  const hourSeed = hashString(
    `trends:${new Date().toISOString().slice(0, 13)}`,
  );
  const rand = seededRandom(hourSeed);
  const pool = [...TREND_POOL].sort(() => rand() - 0.5).slice(0, 10);
  const changes: TrendItem["change"][] = ["up", "down", "same", "new"];

  return pool.map((keyword, index) => ({
    rank: index + 1,
    keyword,
    change: changes[Math.floor(rand() * changes.length)],
    delta: Math.floor(rand() * 8) + 1,
  }));
}

export function discoverKeywords(seedKeyword: string): RelatedKeyword[] {
  const analysis = analyzeKeyword(seedKeyword || "마케팅", "naver");
  return [...analysis.relatedInternal, ...analysis.relatedSerp]
    .sort((a, b) => b.opportunityScore - a.opportunityScore || b.monthlyVolume - a.monthlyVolume)
    .slice(0, 30);
}