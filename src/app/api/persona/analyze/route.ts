import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { tryConsumeAiUsage } from "@/lib/db/users";
import { assertFeature } from "@/lib/quota";
import { fetchAllowedUrl, SsrfError } from "@/lib/ssrf";
import { assertPersonaMonthlyLimit, monthKey } from "@/lib/persona/monthly";
import {
  countPersonaAnalyzesThisMonth,
  logPersonaAnalyzeEvent,
  upsertPersonaForAnalysis,
} from "@/lib/persona/repository";

function mapDbError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) {
    return NextResponse.json(
      { error: "데이터베이스가 연결되지 않았습니다. DATABASE_URL을 확인해 주세요." },
      { status: 503 },
    );
  }
  console.error("persona analyze error", error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "blogAnalysis", "블로그 분석");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { blogUrl?: string; posts?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const blogUrl = typeof body.blogUrl === "string" ? body.blogUrl.trim() : "";
  const pastedPosts = Array.isArray(body.posts)
    ? body.posts
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  let sourceText = pastedPosts.join("\n\n---\n\n").slice(0, 50_000);
  let resolvedUrl: string | null = blogUrl || null;

  if (!sourceText && blogUrl) {
    try {
      const fetched = await fetchAllowedUrl(blogUrl);
      sourceText = fetched.text;
      resolvedUrl = fetched.url.toString();
    } catch (error) {
      const message =
        error instanceof SsrfError ? error.message : "URL에서 본문을 불러오지 못했습니다.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (!sourceText.trim()) {
    return NextResponse.json(
      { error: "블로그 URL 또는 글 본문을 1개 이상 입력해 주세요." },
      { status: 400 },
    );
  }

  const personaFeature = assertFeature(authContext.plan, "personaMonthly", "페르소나");
  if (!personaFeature.ok) {
    return NextResponse.json({ error: personaFeature.error }, { status: 403 });
  }

  const monthlyLimit = authContext.plan.limits.personaMonthly;
  let monthlyUsed: number;
  try {
    monthlyUsed = await countPersonaAnalyzesThisMonth(authContext.user.id, monthKey());
  } catch (error) {
    return mapDbError(error);
  }

  const monthlyCheck = assertPersonaMonthlyLimit(monthlyUsed, monthlyLimit);
  if (!monthlyCheck.ok) {
    return NextResponse.json({ error: monthlyCheck.error }, { status: 429 });
  }

  const consumed = await tryConsumeAiUsage(
    authContext.userId,
    authContext.plan.limits.aiMonthly,
  );
  if (!consumed.ok) {
    return NextResponse.json(
      {
        error: `이번 달 AI 생성 한도(${authContext.plan.limits.aiMonthly}회)를 모두 사용했습니다.`,
      },
      { status: 429 },
    );
  }

  try {
    const persona = await upsertPersonaForAnalysis({
      userId: authContext.user.id,
      blogUrl: resolvedUrl,
      sourceText,
    });
    await logPersonaAnalyzeEvent(authContext.user.id, { personaId: persona.id });
    return NextResponse.json({
      personaId: persona.id,
      status: persona.status,
      progressStep: persona.progressStep,
      monthlyUsed: monthlyUsed + 1,
      monthlyLimit,
    });
  } catch (error) {
    return mapDbError(error);
  }
}
