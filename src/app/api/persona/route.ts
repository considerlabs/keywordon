import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { countPersonaAnalyzesThisMonth, getPersonaForUser, patchPersonaByUser } from "@/lib/persona/repository";
import { monthKey } from "@/lib/persona/monthly";
import type { PersonaReport } from "@/lib/persona/types";

function mapDbError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) {
    return NextResponse.json(
      { error: "데이터베이스가 연결되지 않았습니다. DATABASE_URL을 확인해 주세요." },
      { status: 503 },
    );
  }
  console.error("persona route error", error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

function serializePersona(persona: NonNullable<Awaited<ReturnType<typeof getPersonaForUser>>>) {
  const meta = (persona.meta as Record<string, unknown> | null) ?? {};
  return {
    id: persona.id,
    status: persona.status,
    progressStep: persona.progressStep,
    blogUrl: persona.blogUrl,
    tone: persona.tone,
    structure: persona.structure,
    audience: persona.audience,
    avoid: persona.avoid,
    summary: typeof meta.summary === "string" ? meta.summary : null,
    errorMessage: persona.errorMessage,
    editedByUser: persona.editedByUser === 1,
    updatedAt: persona.updatedAt,
  };
}

export async function GET() {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "blogAnalysis", "블로그 분석");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const persona = await getPersonaForUser(authContext.user.id);
    const monthlyUsed = await countPersonaAnalyzesThisMonth(authContext.user.id, monthKey());
    return NextResponse.json({
      persona: persona ? serializePersona(persona) : null,
      monthlyUsed,
      monthlyLimit: authContext.plan.limits.personaMonthly,
    });
  } catch (error) {
    return mapDbError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "blogAnalysis", "블로그 분석");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: Partial<PersonaReport>;
  try {
    body = (await request.json()) as Partial<PersonaReport>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  try {
    const updated = await patchPersonaByUser(authContext.user.id, {
      tone: body.tone,
      structure: body.structure,
      audience: body.audience,
      avoid: body.avoid,
    });
    if (!updated) {
      return NextResponse.json(
        { error: "완료된 페르소나가 없습니다. 먼저 분석을 실행해 주세요." },
        { status: 404 },
      );
    }
    return NextResponse.json({ persona: serializePersona(updated) });
  } catch (error) {
    return mapDbError(error);
  }
}
