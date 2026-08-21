import type { PersonaReport } from "./types";

export function buildPersonaPrompt(sourceText: string): { system: string; user: string } {
  const system =
    "당신은 한국어 블로그 문체 분석 전문가입니다. 제공된 글 샘플에서 작성자의 독특한 톤·구조·독자층을 추출해 JSON만 반환하세요. 마크다운 코드블록 없이 순수 JSON만 출력합니다.";

  const user = [
    "다음 글 샘플을 분석해 작성자 페르소나를 추출하세요.",
    "",
    sourceText.slice(0, 40_000),
    "",
    "다음 JSON 스키마로 응답:",
    JSON.stringify({
      tone: {
        style: "",
        vocabulary: "",
        sentenceLength: "",
        emojiUsage: "",
      },
      structure: {
        intro: "",
        body: "",
        conclusion: "",
        headings: "",
      },
      audience: {
        primary: "",
        interests: ["", ""],
        readingLevel: "",
      },
      avoid: {
        phrases: ["", ""],
        tones: ["", ""],
      },
      summary: "",
    }),
  ].join("\n");

  return { system, user };
}

export function parsePersonaReport(text: string): PersonaReport | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<PersonaReport>;
    if (!parsed.tone || !parsed.structure || !parsed.audience) return null;

    return {
      tone: {
        style: String(parsed.tone.style ?? ""),
        vocabulary: String(parsed.tone.vocabulary ?? ""),
        sentenceLength: String(parsed.tone.sentenceLength ?? ""),
        emojiUsage: String(parsed.tone.emojiUsage ?? ""),
      },
      structure: {
        intro: String(parsed.structure.intro ?? ""),
        body: String(parsed.structure.body ?? ""),
        conclusion: String(parsed.structure.conclusion ?? ""),
        headings: String(parsed.structure.headings ?? ""),
      },
      audience: {
        primary: String(parsed.audience.primary ?? ""),
        interests: Array.isArray(parsed.audience.interests)
          ? parsed.audience.interests.map(String).filter(Boolean).slice(0, 6)
          : [],
        readingLevel: String(parsed.audience.readingLevel ?? ""),
      },
      avoid: {
        phrases: Array.isArray(parsed.avoid?.phrases)
          ? parsed.avoid!.phrases.map(String).filter(Boolean).slice(0, 8)
          : [],
        tones: Array.isArray(parsed.avoid?.tones)
          ? parsed.avoid!.tones.map(String).filter(Boolean).slice(0, 6)
          : [],
      },
      summary: String(parsed.summary ?? ""),
    };
  } catch {
    return null;
  }
}

export function formatPersonaBlock(report: PersonaReport): string {
  const lines = [
    "[작성자 페르소나]",
    `문체: ${report.tone.style}`,
    `어휘: ${report.tone.vocabulary}`,
    `문장 길이: ${report.tone.sentenceLength}`,
    `구조: 서론(${report.structure.intro}), 본문(${report.structure.body}), 결론(${report.structure.conclusion})`,
    `독자층: ${report.audience.primary} (${report.audience.interests.join(", ")})`,
    `피해야 할 표현: ${report.avoid.phrases.join(", ")}`,
    `요약: ${report.summary}`,
  ];
  return lines.filter(Boolean).join("\n");
}
