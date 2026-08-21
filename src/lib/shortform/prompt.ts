import type { ShortformScript } from "./types";

type BuildScriptPromptInput = {
  title: string;
  sourceText: string;
  durationSeconds?: number;
  personaBlock?: string | null;
};

export function buildShortformPrompt(input: BuildScriptPromptInput): {
  system: string;
  user: string;
} {
  const duration = input.durationSeconds ?? 30;
  const persona = input.personaBlock?.trim()
    ? `\n\n작성자 문체 참고:\n${input.personaBlock.trim()}`
    : "";

  const system = [
    "당신은 한국어 숏폼(YouTube Shorts, Instagram Reels, TikTok) 대본 작가입니다.",
    "JSON만 출력하세요. 마크다운 코드 블록 없이 순수 JSON 객체 하나만 반환합니다.",
    "스키마:",
    '{"hook":"string","scenes":[{"label":"string","narration":"string","subtitle":"string","visual":"string"}],"fullNarration":"string","cta":"string"}',
    `씬은 4~5개, 총 ${duration}초 분량에 맞게 짧고 리듬감 있게 작성합니다.`,
    "visual 필드에는 B-roll·자막·화면 연출 힌트를 한국어로 적습니다.",
  ].join("\n");

  const user = [
    `프로젝트 제목: ${input.title}`,
    "",
    "원본 콘텐츠:",
    input.sourceText.slice(0, 12_000),
    persona,
  ].join("\n");

  return { system, user };
}

export function parseShortformScript(raw: string): ShortformScript | null {
  const trimmed = raw.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ShortformScript>;
    if (typeof parsed.hook !== "string") return null;
    if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) return null;
    if (typeof parsed.fullNarration !== "string") return null;

    const scenes = parsed.scenes.map((scene, index) => ({
      label: typeof scene.label === "string" ? scene.label : `씬 ${index + 1}`,
      narration: typeof scene.narration === "string" ? scene.narration : "",
      subtitle: typeof scene.subtitle === "string" ? scene.subtitle : "",
      visual: typeof scene.visual === "string" ? scene.visual : "",
    }));

    return {
      hook: parsed.hook.trim(),
      scenes,
      fullNarration: parsed.fullNarration.trim(),
      cta: typeof parsed.cta === "string" ? parsed.cta.trim() : "",
    };
  } catch {
    return null;
  }
}

export function formatCapCutExport(title: string, script: ShortformScript): string {
  const lines = [
    `# ${title}`,
    "",
    "## 훅 (0–3초)",
    script.hook,
    "",
    "## 씬별 대본",
  ];
  script.scenes.forEach((scene, index) => {
    lines.push(
      "",
      `### ${scene.label || `씬 ${index + 1}`}`,
      `[자막] ${scene.subtitle || scene.narration}`,
      `[나레이션] ${scene.narration}`,
      `[화면] ${scene.visual || "—"}`,
    );
  });
  lines.push("", "## 전체 나레이션", script.fullNarration);
  if (script.cta) {
    lines.push("", "## CTA", script.cta);
  }
  return lines.join("\n");
}

export function formatCanvaExport(title: string, script: ShortformScript): string {
  const lines = [`프로젝트: ${title}`, "", "— CapCut/Canva 텍스트 레이어용 —", ""];
  lines.push(`HOOK\t${script.hook}`);
  script.scenes.forEach((scene, index) => {
    const label = scene.label || `씬 ${index + 1}`;
    lines.push(`${label} (자막)\t${scene.subtitle || scene.narration}`);
    lines.push(`${label} (나레이션)\t${scene.narration}`);
    if (scene.visual) {
      lines.push(`${label} (화면)\t${scene.visual}`);
    }
  });
  lines.push("", "전체 나레이션", script.fullNarration);
  if (script.cta) {
    lines.push("", "CTA", script.cta);
  }
  return lines.join("\n");
}
