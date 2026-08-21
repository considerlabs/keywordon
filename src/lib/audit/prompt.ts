import type { PostAuditReport } from "./types";

export function buildAuditPrompt(input: {
  postUrl: string;
  targetKeyword: string | null;
  content: string;
}): { system: string; user: string } {
  const system =
    "당신은 한국어 블로그 SEO 진단 전문가입니다. 게시글 본문을 분석해 JSON만 반환하세요. 마크다운 코드블록 없이 순수 JSON만 출력합니다.";

  const keywordLine = input.targetKeyword
    ? `타겟 키워드: ${input.targetKeyword}`
    : "타겟 키워드: (지정 없음)";

  const user = [
    `게시글 URL: ${input.postUrl}`,
    keywordLine,
    "",
    "본문:",
    input.content.slice(0, 30_000),
    "",
    "다음 JSON 스키마로 응답:",
    JSON.stringify({
      overallScore: 0,
      scores: [
        { label: "제목 SEO", score: 0, maxScore: 100, summary: "" },
        { label: "키워드 배치", score: 0, maxScore: 100, summary: "" },
        { label: "본문 구조", score: 0, maxScore: 100, summary: "" },
        { label: "가독성", score: 0, maxScore: 100, summary: "" },
        { label: "메타·링크", score: 0, maxScore: 100, summary: "" },
      ],
      strengths: ["", ""],
      improvements: ["", "", ""],
      seoChecklist: [
        { item: "제목에 핵심 키워드 포함", passed: true, note: "" },
        { item: "첫 문단에 키워드 자연스럽게 배치", passed: false, note: "" },
        { item: "소제목(H2/H3) 활용", passed: true, note: "" },
        { item: "적절한 글 길이(800자 이상)", passed: true, note: "" },
        { item: "내부·외부 링크", passed: false, note: "" },
      ],
    }),
  ].join("\n");

  return { system, user };
}

export function parseAuditReport(
  text: string,
  postUrl: string,
  targetKeyword: string | null,
): PostAuditReport | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<PostAuditReport>;
    if (typeof parsed.overallScore !== "number" || !Array.isArray(parsed.scores)) {
      return null;
    }
    return {
      postUrl,
      targetKeyword,
      overallScore: Math.min(100, Math.max(0, Math.round(parsed.overallScore))),
      scores: parsed.scores.map((item) => ({
        label: String(item.label ?? ""),
        score: Math.min(100, Math.max(0, Number(item.score) || 0)),
        maxScore: 100,
        summary: String(item.summary ?? ""),
      })),
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths.map(String).filter(Boolean).slice(0, 5)
        : [],
      improvements: Array.isArray(parsed.improvements)
        ? parsed.improvements.map(String).filter(Boolean).slice(0, 6)
        : [],
      seoChecklist: Array.isArray(parsed.seoChecklist)
        ? parsed.seoChecklist.map((item) => ({
            item: String(item.item ?? ""),
            passed: Boolean(item.passed),
            note: String(item.note ?? ""),
          }))
        : [],
      analyzedAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
