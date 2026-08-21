import { describe, expect, it } from "vitest";
import {
  buildShortformPrompt,
  formatCanvaExport,
  formatCapCutExport,
  parseShortformScript,
} from "./prompt";
import type { ShortformScript } from "./types";

describe("buildShortformPrompt", () => {
  it("includes title and source text", () => {
    const { user } = buildShortformPrompt({
      title: "테스트 제목",
      sourceText: "본문 내용입니다.",
    });
    expect(user).toContain("테스트 제목");
    expect(user).toContain("본문 내용입니다.");
  });
});

describe("parseShortformScript", () => {
  it("parses valid JSON", () => {
    const raw = JSON.stringify({
      hook: "이거 모르면 손해",
      scenes: [{ label: "씬 1", narration: "안녕", subtitle: "안녕", visual: "클로즈업" }],
      fullNarration: "전체",
      cta: "저장하세요",
    });
    const script = parseShortformScript(raw);
    expect(script?.hook).toBe("이거 모르면 손해");
    expect(script?.scenes).toHaveLength(1);
  });

  it("returns null for invalid payload", () => {
    expect(parseShortformScript("not json")).toBeNull();
  });
});

describe("export formatters", () => {
  const script: ShortformScript = {
    hook: "훅",
    scenes: [
      { label: "씬 1", narration: "나레", subtitle: "자막", visual: "화면" },
    ],
    fullNarration: "전체",
    cta: "CTA",
  };

  it("formats CapCut markdown", () => {
    const text = formatCapCutExport("제목", script);
    expect(text).toContain("훅");
    expect(text).toContain("[나레이션] 나레");
  });

  it("formats Canva tab-separated text", () => {
    const text = formatCanvaExport("제목", script);
    expect(text).toContain("HOOK\t훅");
    expect(text).toContain("씬 1 (자막)\t자막");
  });
});
