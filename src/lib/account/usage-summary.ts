export type UsageSummary = {
  planName: string;
  aiUsed: number;
  aiLimit: number;
  aiRemaining: number;
  aiPercent: number;
  aiIncluded: boolean;
  googleUsed: number;
  googleLimit: number;
  exhausted: boolean;
};

export function buildUsageSummary(input: {
  planName: string;
  aiUsedMonth: number;
  aiMonthly: number;
  googleUsedMonth: number;
  googleMonthly: number;
}): UsageSummary {
  const aiLimit = input.aiMonthly;
  const aiUsed = input.aiUsedMonth;
  const aiIncluded = aiLimit > 0;
  const aiRemaining = Math.max(0, aiLimit - aiUsed);
  const aiPercent =
    aiIncluded ? Math.min(100, Math.round((aiUsed / aiLimit) * 100)) : 0;
  return {
    planName: input.planName,
    aiUsed,
    aiLimit,
    aiRemaining,
    aiPercent,
    aiIncluded,
    googleUsed: input.googleUsedMonth,
    googleLimit: input.googleMonthly,
    exhausted: aiLimit <= 0 || aiRemaining <= 0,
  };
}
