import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { tryConsumeAiUsage } from "@/lib/db/users";
import { assertShortformMonthlyLimit, monthKey } from "@/lib/shortform/monthly";
import { buildShortformPrompt, parseShortformScript } from "@/lib/shortform/prompt";
import {
  countShortformGenerationsThisMonth,
  getProjectForUser,
  logShortformGenerateEvent,
  updateProjectForUser,
} from "@/lib/shortform/repository";
import { fetchAllowedUrl, SsrfError } from "@/lib/ssrf";
import { assertFeature } from "@/lib/quota";
import { getActivePersona } from "@/lib/write/persona";
import { trimWriteField } from "@/lib/write/prompt";

const GEMINI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";

function getGeminiApiKey() {
  const key = (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  ).trim();
  if (!key || key === "undefined") return null;
  return key;
}

function mapDbError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) {
    return NextResponse.json(
      { error: "데이터베이스가 연결되지 않았습니다. DATABASE_URL을 확인해 주세요." },
      { status: 503 },
    );
  }
  console.error("shortform generate error", error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "copilot", "Copilot AI");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "프로젝트 ID가 올바르지 않습니다." }, { status: 400 });
  }

  let body: { sourceUrl?: string; sourceText?: string; durationSeconds?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  let project;
  try {
    project = await getProjectForUser(authContext.user.id, id);
  } catch (error) {
    return mapDbError(error);
  }

  if (!project) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }

  const meta = (project.meta as Record<string, unknown> | null) ?? {};
  let sourceText =
    typeof body.sourceText === "string" ? body.sourceText.trim().slice(0, 50_000) : "";
  let sourceUrl =
    typeof body.sourceUrl === "string" && body.sourceUrl.trim()
      ? body.sourceUrl.trim()
      : project.sourceUrl ?? "";

  if (!sourceText && sourceUrl) {
    try {
      const fetched = await fetchAllowedUrl(sourceUrl);
      sourceText = fetched.text;
      sourceUrl = fetched.url.toString();
    } catch (error) {
      const message =
        error instanceof SsrfError
          ? error.message
          : "URL에서 본문을 불러오지 못했습니다.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (!sourceText && typeof meta.sourceText === "string") {
    sourceText = meta.sourceText.slice(0, 50_000);
  }

  if (!sourceText.trim()) {
    return NextResponse.json(
      { error: "대본 생성에 필요한 URL 또는 본문 텍스트가 없습니다." },
      { status: 400 },
    );
  }

  const shortformFeature = assertFeature(authContext.plan, "shortformMonthly", "숏폼");
  if (!shortformFeature.ok) {
    return NextResponse.json({ error: shortformFeature.error }, { status: 403 });
  }

  const monthlyLimit = authContext.plan.limits.shortformMonthly;
  let monthlyUsed: number;
  try {
    monthlyUsed = await countShortformGenerationsThisMonth(authContext.user.id, monthKey());
  } catch (error) {
    return mapDbError(error);
  }

  const monthlyCheck = assertShortformMonthlyLimit(monthlyUsed, monthlyLimit);
  if (!monthlyCheck.ok) {
    return NextResponse.json({ error: monthlyCheck.error }, { status: 429 });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Gemini API 키가 없습니다. Google AI Studio의 AIza 키를 GOOGLE_GENERATIVE_AI_API_KEY로 등록해 주세요.",
      },
      { status: 503 },
    );
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

  const durationSeconds =
    typeof body.durationSeconds === "number" && Number.isFinite(body.durationSeconds)
      ? Math.min(120, Math.max(15, Math.floor(body.durationSeconds)))
      : 30;

  const personaBlock = await getActivePersona(authContext.user.id);
  const title = trimWriteField(project.title) || "숏폼 프로젝트";
  const { system, user: prompt } = buildShortformPrompt({
    title,
    sourceText,
    durationSeconds,
    personaBlock,
  });

  const geminiResponse = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  const geminiJson = (await geminiResponse.json()) as {
    error?: { message?: string };
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  if (!geminiResponse.ok) {
    return NextResponse.json(
      {
        error: geminiJson.error?.message ?? "Gemini 호출에 실패했습니다.",
        model: "gemini-3.6-flash",
      },
      { status: 502 },
    );
  }

  const text =
    geminiJson.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text) {
    return NextResponse.json(
      { error: "Gemini가 빈 응답을 반환했습니다.", model: "gemini-3.6-flash" },
      { status: 502 },
    );
  }

  const script = parseShortformScript(text);
  if (!script) {
    return NextResponse.json(
      { error: "대본 JSON을 파싱하지 못했습니다. 다시 시도해 주세요.", model: "gemini-3.6-flash" },
      { status: 502 },
    );
  }

  try {
    const updated = await updateProjectForUser(authContext.user.id, id, {
      script,
      status: "ready",
      sourceUrl: sourceUrl || null,
      meta: { ...meta, sourceText: sourceText.slice(0, 50_000), durationSeconds },
    });
    await logShortformGenerateEvent(authContext.user.id, { projectId: id });
    return NextResponse.json({ project: updated, script });
  } catch (error) {
    return mapDbError(error);
  }
}
