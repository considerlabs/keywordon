export { monthKey } from "@/lib/shortform/monthly";

export function assertPersonaMonthlyLimit(
  used: number,
  limit: number,
): { ok: true } | { ok: false; error: string } {
  if (limit <= 0 || used >= limit) {
    return {
      ok: false,
      error: `이번 달 페르소나 분석 한도(${limit}회)를 모두 사용했습니다. 플랜을 업그레이드하거나 다음 달에 다시 시도해 주세요.`,
    };
  }
  return { ok: true };
}
