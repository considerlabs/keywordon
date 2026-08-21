import { getDonePersonaForUser } from "@/lib/persona/repository";
import { formatPersonaBlock } from "@/lib/persona/prompt";
import type { PersonaReport } from "@/lib/persona/types";
import type { BlogPersonaRow } from "@/lib/db/schema";
import { hasDatabase } from "@/lib/db";

function rowToReport(row: BlogPersonaRow): PersonaReport | null {
  if (!row.tone || !row.structure || !row.audience) return null;
  return {
    tone: row.tone as PersonaReport["tone"],
    structure: row.structure as PersonaReport["structure"],
    audience: row.audience as PersonaReport["audience"],
    avoid: (row.avoid as PersonaReport["avoid"]) ?? { phrases: [], tones: [] },
    summary: String((row.meta as Record<string, unknown> | null)?.summary ?? ""),
  };
}

export async function getActivePersona(userInternalId: number): Promise<string | null> {
  if (!hasDatabase) return null;

  const row = await getDonePersonaForUser(userInternalId);
  if (!row || row.status !== "done") return null;

  const report = rowToReport(row);
  if (!report) return null;

  const meta = (row.meta as Record<string, unknown> | null) ?? {};
  if (typeof meta.summary === "string" && meta.summary) {
    report.summary = meta.summary;
  }

  return formatPersonaBlock(report);
}
