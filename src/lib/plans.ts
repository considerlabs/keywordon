export type PlanId = "guest" | "free" | "basic" | "super" | "enterprise";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  highlights: string[];
  limits: {
    naverPerMinute: number;
    googleMonthly: number;
    relatedInternal: number;
    relatedSerp: number;
    trendCompare: number;
    bulkMax: number;
    historyDays: number;
    honeyBoxMax: number;
    siteDiagnosis: number;
    aiMonthly: number;
    automationIdeasDaily: number;
    shortformMonthly: number;
    postAuditMonthly: number;
    personaMonthly: number;
    dataYears: number;
    csvExport: boolean;
    opportunityScore: boolean;
    issueInfo: boolean;
    cpc: boolean;
    contentVolume: boolean;
    copilot: boolean;
    blogAnalysis: boolean;
    trendAccess: boolean;
  };
  stripePriceEnv?: {
    monthly?: string;
    yearly?: string;
  };
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  guest: {
    id: "guest",
    name: "비회원",
    priceMonthly: 0,
    priceYearly: 0,
    description: "로그인 없이 기본 조회",
    highlights: ["네이버 분석 분당 2회", "연관어 5개", "1년 데이터"],
    limits: {
      naverPerMinute: 2,
      googleMonthly: 0,
      relatedInternal: 5,
      relatedSerp: 5,
      trendCompare: 0,
      bulkMax: 0,
      historyDays: 0,
      honeyBoxMax: 0,
      siteDiagnosis: 0,
      aiMonthly: 0,
      automationIdeasDaily: 0,
      shortformMonthly: 0,
      postAuditMonthly: 0,
      personaMonthly: 0,
      dataYears: 1,
      csvExport: false,
      opportunityScore: false,
      issueInfo: false,
      cpc: false,
      contentVolume: false,
      copilot: false,
      blogAnalysis: false,
      trendAccess: false,
    },
  },
  free: {
    id: "free",
    name: "무료",
    priceMonthly: 0,
    priceYearly: 0,
    description: "가입만으로 바로 시작",
    highlights: ["네이버 분석 분당 4회", "키워드 발굴", "블로그 분석", "대량 조회 5개"],
    limits: {
      naverPerMinute: 4,
      googleMonthly: 0,
      relatedInternal: 5,
      relatedSerp: 5,
      trendCompare: 1,
      bulkMax: 5,
      historyDays: 7,
      honeyBoxMax: 10,
      siteDiagnosis: 0,
      aiMonthly: 20,
      automationIdeasDaily: 3,
      shortformMonthly: 0,
      postAuditMonthly: 1,
      personaMonthly: 1,
      dataYears: 1,
      csvExport: false,
      opportunityScore: false,
      issueInfo: false,
      cpc: false,
      contentVolume: false,
      copilot: true,
      blogAnalysis: true,
      trendAccess: true,
    },
  },
  basic: {
    id: "basic",
    name: "베이직",
    priceMonthly: 25900,
    priceYearly: 261000,
    description: "콘텐츠·SEO 실무자용",
    highlights: ["기회지수·CPC", "Copilot AI", "대량 조회 10개", "사이트 진단 1개"],
    limits: {
      naverPerMinute: 10,
      googleMonthly: 200,
      relatedInternal: 10,
      relatedSerp: 10,
      trendCompare: 5,
      bulkMax: 10,
      historyDays: 14,
      honeyBoxMax: 30,
      siteDiagnosis: 1,
      aiMonthly: 100,
      automationIdeasDaily: 7,
      shortformMonthly: 5,
      postAuditMonthly: 5,
      personaMonthly: 4,
      dataYears: 2,
      csvExport: true,
      opportunityScore: true,
      issueInfo: true,
      cpc: true,
      contentVolume: true,
      copilot: true,
      blogAnalysis: true,
      trendAccess: true,
    },
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_BASIC_MONTHLY",
      yearly: "STRIPE_PRICE_BASIC_YEARLY",
    },
  },
  super: {
    id: "super",
    name: "슈퍼",
    priceMonthly: 55000,
    priceYearly: 554000,
    description: "성장팀·에이전시용",
    highlights: ["Google 500회", "대량 조회 30개", "AI 250회", "사이트 진단 5개"],
    limits: {
      naverPerMinute: 20,
      googleMonthly: 500,
      relatedInternal: 15,
      relatedSerp: 15,
      trendCompare: 7,
      bulkMax: 30,
      historyDays: 21,
      honeyBoxMax: 90,
      siteDiagnosis: 5,
      aiMonthly: 250,
      automationIdeasDaily: 15,
      shortformMonthly: 15,
      postAuditMonthly: 15,
      personaMonthly: 8,
      dataYears: 3,
      csvExport: true,
      opportunityScore: true,
      issueInfo: true,
      cpc: true,
      contentVolume: true,
      copilot: true,
      blogAnalysis: true,
      trendAccess: true,
    },
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_SUPER_MONTHLY",
      yearly: "STRIPE_PRICE_SUPER_YEARLY",
    },
  },
  enterprise: {
    id: "enterprise",
    name: "엔터프라이즈",
    priceMonthly: 88000,
    priceYearly: 887000,
    description: "대규모 운영·동시 로그인",
    highlights: ["동시 3인", "대량 조회 50개", "AI 500회", "5년+ 데이터"],
    limits: {
      naverPerMinute: 40,
      googleMonthly: 1200,
      relatedInternal: 30,
      relatedSerp: 30,
      trendCompare: 15,
      bulkMax: 50,
      historyDays: 30,
      honeyBoxMax: 180,
      siteDiagnosis: 10,
      aiMonthly: 500,
      automationIdeasDaily: 30,
      shortformMonthly: 40,
      postAuditMonthly: 40,
      personaMonthly: 20,
      dataYears: 5,
      csvExport: true,
      opportunityScore: true,
      issueInfo: true,
      cpc: true,
      contentVolume: true,
      copilot: true,
      blogAnalysis: true,
      trendAccess: true,
    },
    stripePriceEnv: {
      monthly: "STRIPE_PRICE_ENTERPRISE_MONTHLY",
      yearly: "STRIPE_PRICE_ENTERPRISE_YEARLY",
    },
  },
};

export const PAID_PLANS: PlanId[] = ["basic", "super", "enterprise"];

export function getPlan(id: PlanId | string | null | undefined): PlanDefinition {
  if (id && id in PLANS) return PLANS[id as PlanId];
  return PLANS.guest;
}