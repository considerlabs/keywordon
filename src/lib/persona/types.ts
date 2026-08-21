export type PersonaStatus = "pending" | "analyzing" | "done" | "failed";

export type PersonaTone = {
  style: string;
  vocabulary: string;
  sentenceLength: string;
  emojiUsage: string;
};

export type PersonaStructure = {
  intro: string;
  body: string;
  conclusion: string;
  headings: string;
};

export type PersonaAudience = {
  primary: string;
  interests: string[];
  readingLevel: string;
};

export type PersonaAvoid = {
  phrases: string[];
  tones: string[];
};

export type PersonaReport = {
  tone: PersonaTone;
  structure: PersonaStructure;
  audience: PersonaAudience;
  avoid: PersonaAvoid;
  summary: string;
};

export const PERSONA_STEPS = [
  "본문 수집",
  "문체 분석",
  "구조 분석",
  "독자층 분석",
  "리포트 생성",
] as const;
