import type {
  AdCompetition,
  ContentVolume,
  Engine,
  IssueLevel,
  KeywordAnalysis,
  MonthlyTrendPoint,
  RelatedKeyword,
} from "./keyword-engine";

export type AnalysisViewModel = {
  keyword: string;
  engine: Engine;
  analyzedAt: string;
  monthlyVolume: number;
  pcVolume: number;
  mobileVolume: number;
  volumeChangeRate: number;
  cpc: number | null;
  adCompetition: AdCompetition | null;
  opportunityScore: number | null;
  issueLevel: IssueLevel | null;
  issueScore: number | null;
  category: string;
  subcategory: string;
  content: ContentVolume | null;
  genderRatio: KeywordAnalysis["genderRatio"];
  ageDistribution: KeywordAnalysis["ageDistribution"];
  deviceRatio: KeywordAnalysis["deviceRatio"];
  monthlyTrend: MonthlyTrendPoint[];
  relatedInternal: RelatedKeyword[];
  relatedSerp: RelatedKeyword[];
  smartBlockKeywords: string[];
  nextKeywords: string[];
  summary: string;
  locked?: {
    opportunityScore: boolean;
    issueInfo: boolean;
    cpc: boolean;
    contentVolume: boolean;
  };
  dataSource?: "live";
  planName?: string;
};