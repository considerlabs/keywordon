export function dayKey(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function assertIdeasDailyLimit(
  used: number,
  limit: number,
): { ok: true } | { ok: false; error: string } {
  if (limit <= 0 || used >= limit) {
    return {
      ok: false,
      error: `오늘 글감 추가 한도(${limit}회)를 모두 사용했습니다. 플랜을 업그레이드하거나 내일 다시 시도해 주세요.`,
    };
  }
  return { ok: true };
}
