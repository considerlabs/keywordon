export type AuditScoreItem = {
  label: string;
  score: number;
  maxScore: number;
  summary: string;
};

export type PostAuditReport = {
  postUrl: string;
  targetKeyword: string | null;
  overallScore: number;
  scores: AuditScoreItem[];
  strengths: string[];
  improvements: string[];
  seoChecklist: { item: string; passed: boolean; note: string }[];
  analyzedAt: string;
};
