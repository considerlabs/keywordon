import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import {
  getIdeaForUser,
  insertDraft,
  listDrafts,
  logAutomationDraftEvent,
  updateDraftForUser,
} from "@/lib/automation/repository";
import type { AutomationDraftStatus } from "@/lib/automation/types";
import { tryConsumeAiUsage } from "@/lib/db/users";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";
import { assertFeature } from "@/lib/quota";
import { getActivePersona } from "@/lib/write/persona";
import { buildWritePrompt, trimWriteField } from "@/lib/write/prompt";

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
  console.error("automation drafts error", error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

function isDraftStatus(value: unknown): value is AutomationDraftStatus {
  return value === "draft" || value === "ready" || value === "exported";
}

export async function GET() {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "copilot", "Copilot AI");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const drafts = await listDrafts(authContext.user.id);
    return NextResponse.json({ drafts });
  } catch (error) {
    return mapDbError(error);
  }
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "copilot", "Copilot AI");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { ideaId?: number };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const ideaId =
    typeof body.ideaId === "number" && Number.isInteger(body.ideaId) ? body.ideaId : NaN;
  if (!Number.isFinite(ideaId) || ideaId <= 0) {
    return NextResponse.json({ error: "글감 ID가 필요합니다." }, { status: 400 });
  }

  let idea;
  try {
    idea = await getIdeaForUser(authContext.user.id, ideaId);
  } catch (error) {
    return mapDbError(error);
  }

  if (!idea) {
    return NextResponse.json({ error: "글감을 찾을 수 없습니다." }, { status: 404 });
  }

  const title = trimWriteField(idea.title);
  const keyword = trimWriteField(idea.keyword ?? "") || title;
  if (!keyword) {
    return NextResponse.json({ error: "글감에 키워드가 없습니다." }, { status: 400 });
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

  const { data } = await resolveKeywordAnalysis(keyword, "naver");
  const personaBlock = await getActivePersona(authContext.user.id);
  const { system, user: prompt } = buildWritePrompt({
    postTypeLabel: "정보성",
    title,
    keywords: [keyword],
    charCount: 1000,
    tone: "자동 설정",
    emphasis: "",
    flags: {
      useLatestSearch: true,
      hashtags: false,
      seoInsights: true,
    },
    keywordStats: {
      monthlyVolume: data.monthlyVolume,
      category: data.category,
      related: data.relatedInternal.slice(0, 8).map((item) => item.keyword),
    },
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

  try {
    const draft = await insertDraft({
      userId: authContext.user.id,
      ideaId: idea.id,
      title,
      content: text,
      status: "ready",
      meta: { keyword },
    });
    await logAutomationDraftEvent(authContext.user.id, { ideaId: idea.id, draftId: draft.id });
    return NextResponse.json({ draft }, { status: 201 });
  } catch (error) {
    return mapDbError(error);
  }
}

export async function PATCH(request: NextRequest) {
  const authContext = await getAuthContext();
  const feature = assertFeature(authContext.plan, "copilot", "Copilot AI");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { id?: number; status?: string; content?: string; title?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const id = typeof body.id === "number" && Number.isInteger(body.id) ? body.id : NaN;
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "초안 ID가 필요합니다." }, { status: 400 });
  }

  const patch: {
    status?: AutomationDraftStatus;
    content?: string;
    title?: string;
    exportedAt?: Date | null;
  } = {};

  if (body.status !== undefined) {
    if (!isDraftStatus(body.status)) {
      return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    }
    patch.status = body.status;
    if (body.status === "exported") {
      patch.exportedAt = new Date();
    }
  }
  if (typeof body.content === "string") {
    patch.content = body.content.slice(0, 50_000);
  }
  if (typeof body.title === "string") {
    patch.title = trimWriteField(body.title);
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  try {
    const draft = await updateDraftForUser(authContext.user.id, id, patch);
    if (!draft) {
      return NextResponse.json({ error: "초안을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ draft });
  } catch (error) {
    return mapDbError(error);
  }
}
