import { callGemini } from "@/lib/gemini";
import type { BlogPersonaRow } from "@/lib/db/schema";
import { buildPersonaPrompt, parsePersonaReport } from "./prompt";
import {
  getPersonaForUser,
  nextProgressStep,
  shouldAdvanceStep,
  TOTAL_STEPS,
  updatePersonaProgress,
} from "./repository";

export async function advancePersonaAnalysis(userId: number): Promise<BlogPersonaRow | null> {
  const persona = await getPersonaForUser(userId);
  if (!persona || persona.status !== "analyzing") return persona;

  if (!shouldAdvanceStep(persona)) return persona;

  const step = persona.progressStep;

  if (step < TOTAL_STEPS - 1) {
    return updatePersonaProgress(userId, persona.id, {
      progressStep: nextProgressStep(step),
    });
  }

  if (step === TOTAL_STEPS - 1) {
    await updatePersonaProgress(userId, persona.id, {
      progressStep: TOTAL_STEPS,
    });

    const meta = (persona.meta as Record<string, unknown> | null) ?? {};
    const sourceText =
      typeof meta.sourceText === "string" ? meta.sourceText : "";
    if (!sourceText.trim()) {
      return updatePersonaProgress(userId, persona.id, {
        status: "failed",
        errorMessage: "분석할 본문이 없습니다.",
      });
    }

    const { system, user } = buildPersonaPrompt(sourceText);
    const gemini = await callGemini({ system, user, temperature: 0.5 });

    if (!gemini.ok) {
      return updatePersonaProgress(userId, persona.id, {
        status: "failed",
        errorMessage: gemini.error,
      });
    }

    const report = parsePersonaReport(gemini.text);
    if (!report) {
      return updatePersonaProgress(userId, persona.id, {
        status: "failed",
        errorMessage: "페르소나 리포트를 파싱하지 못했습니다. 다시 시도해 주세요.",
      });
    }

    return updatePersonaProgress(userId, persona.id, {
      status: "done",
      progressStep: TOTAL_STEPS,
      tone: report.tone,
      structure: report.structure,
      audience: report.audience,
      avoid: report.avoid,
      meta: { ...meta, summary: report.summary },
    });
  }

  return persona;
}
