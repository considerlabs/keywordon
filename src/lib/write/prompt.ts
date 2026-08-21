import type { WritePromptInput, WritePromptOutput } from "./types";

export function trimWriteField(value: string | undefined, max = 200): string {
  const trimmed = (value ?? "").trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}

export function normalizeKeywords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const result: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const trimmed = trimWriteField(item);
    if (!trimmed) continue;
    result.push(trimmed);
    if (result.length >= 5) break;
  }
  return result;
}

export function buildWritePrompt(input: WritePromptInput): WritePromptOutput {
  const {
    postTypeLabel,
    title,
    keywords,
    charCount,
    tone,
    emphasis,
    flags,
    keywordStats,
    personaBlock,
  } = input;

  const system =
    "당신은 한국어 블로그 콘텐츠 작가입니다. 글 유형에 맞는 자연스러운 한국어 초안을 작성하고, 과장된 광고 표현은 피합니다. 제목과 본문으로 구성된 완성형 글을 작성하세요.";

  const keywordLine =
    keywords.length > 0 ? keywords.join(", ") : "(키워드 없음)";

  const relatedLine =
    keywordStats.related.length > 0
      ? keywordStats.related.join(", ")
      : "(연관어 없음)";

  const lines: string[] = [
    `글 유형: ${postTypeLabel}`,
    `제목: ${title || "(제목 없음)"}`,
    `키워드: ${keywordLine}`,
    `목표 분량: 약 ${charCount}자`,
    `톤: ${tone}`,
    `월간 검색량: ${keywordStats.monthlyVolume}`,
    `카테고리: ${keywordStats.category}`,
    `연관어: ${relatedLine}`,
  ];

  if (emphasis) {
    lines.push(`강조/포함 요청: ${emphasis}`);
  }

  if (flags.useLatestSearch) {
    lines.push("최신 검색·트렌드 정보를 반영해 주세요.");
  }

  if (flags.hashtags) {
    lines.push("본문 마지막에 관련 해시태그를 5~10개 포함해 주세요.");
  }

  if (flags.seoInsights) {
    lines.push("SEO 관점에서 검색 의도와 키워드 배치를 고려해 주세요.");
  }

  if (personaBlock) {
    lines.push("");
    lines.push("작성자 스타일:");
    lines.push(personaBlock);
  }

  lines.push("");
  lines.push(
    `위 조건에 맞는 ${postTypeLabel}용 한국어 블로그 초안을 작성하세요. 제목과 본문(소제목 포함)으로 구성하고, 목표 분량(${charCount}자)에 맞춰 주세요.`,
  );

  return { system, user: lines.join("\n") };
}

export { POST_TYPES, TONE_PRESETS, CHAR_COUNTS } from "./types";
export type {
  WritePromptInput,
  WritePromptOutput,
  WritePromptFlags,
  WriteKeywordStats,
} from "./types";
