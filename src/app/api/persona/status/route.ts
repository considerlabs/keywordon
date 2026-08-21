import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { advancePersonaAnalysis } from "@/lib/persona/analyzer";
import { PERSONA_STEPS } from "@/lib/persona/types";
import { getPersonaForUser } from "@/lib/persona/repository";

function mapDbError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) {
    return NextResponse.json(
      { error: "데이터베이스가 연결되지 않았습니다. DATABASE_URL을 확인해 주세요." },
      { status: 503 },
    );
  }
  console.error("persona status error", error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

function serializePersona(persona: NonNullable<Awaited<ReturnType<typeof getPersonaForUser>>>) {
  const meta = (persona.meta as Record<string, unknown> | null) ?? {};
  return {
    id: persona.id,
    status: persona.status,
    progressStep: persona.progressStep,
    totalSteps: PERSONA_STEPS.length,
    steps: PERSONA_STEPS.map((label, index) => ({
      index: index + 1,
      label,
      done: persona.progressStep > index,
      active: persona.status === "analyzing" && persona.progressStep === index,
    })),
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
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const feature = assertFeature(authContext.plan, "blogAnalysis", "블로그 분석");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  try {
    let persona = await getPersonaForUser(authContext.user.id);
    if (persona?.status === "analyzing") {
      persona = (await advancePersonaAnalysis(authContext.user.id)) ?? persona;
    }
    if (!persona) {
      return NextResponse.json({ persona: null });
    }
    return NextResponse.json({ persona: serializePersona(persona) });
  } catch (error) {
    return mapDbError(error);
  }
}
