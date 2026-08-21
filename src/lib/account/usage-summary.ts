export type UsageSummary = {
  planName: string;
  aiUsed: number;
  aiLimit: number;
  aiRemaining: number;
  aiPercent: number;
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
  const aiRemaining = Math.max(0, aiLimit - aiUsed);
  const aiPercent =
    aiLimit <= 0 ? 100 : Math.min(100, Math.round((aiUsed / aiLimit) * 100));
  return {
    planName: input.planName,
    aiUsed,
    aiLimit,
    aiRemaining,
    aiPercent,
    googleUsed: input.googleUsedMonth,
    googleLimit: input.googleMonthly,
    exhausted: aiLimit <= 0 || aiRemaining <= 0,
  };
}
