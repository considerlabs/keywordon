import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertFeature } from "@/lib/quota";
import { tryConsumeAiUsage } from "@/lib/db/users";
import { resolveKeywordAnalysis } from "@/lib/providers/keyword-data";
import {
  buildWritePrompt,
  CHAR_COUNTS,
  normalizeKeywords,
  POST_TYPES,
  trimWriteField,
} from "@/lib/write/prompt";
import { getActivePersona } from "@/lib/write/persona";

// Absolute URL — do not interpolate, do not use gemini-2.0-flash
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

/** Public readiness probe only — no live Gemini calls, no key material. */
export async function GET() {
  return NextResponse.json({
    model: "gemini-3.6-flash",
    hasApiKey: Boolean(getGeminiApiKey()),
  });
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

  let body: {
    keyword?: string;
    keywords?: string[];
    title?: string;
    postType?: string;
    charCount?: number;
    tone?: string;
    intent?: string;
    emphasis?: string;
    usePersona?: boolean;
    flags?: {
      useLatestSearch?: boolean;
      hashtags?: boolean;
      seoInsights?: boolean;
    };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const keyword = typeof body.keyword === "string" ? trimWriteField(body.keyword) : "";
  const keywords = normalizeKeywords(body.keywords);
  const primaryKeyword = keywords[0] ?? keyword;
  if (!primaryKeyword) {
    return NextResponse.json({ error: "키워드를 입력해 주세요." }, { status: 400 });
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

  const postType = typeof body.postType === "string" ? trimWriteField(body.postType) : "";
  const intent = typeof body.intent === "string" ? trimWriteField(body.intent) : "";
  const postTypeLabel =
    POST_TYPES.find((item) => item.id === postType)?.label || intent || "블로그 포스팅";
  const charCount =
    typeof body.charCount === "number" &&
    CHAR_COUNTS.includes(body.charCount as (typeof CHAR_COUNTS)[number])
      ? body.charCount
      : 1000;
  const title = typeof body.title === "string" ? trimWriteField(body.title) : "";
  const tone =
    (typeof body.tone === "string" ? trimWriteField(body.tone) : "") ||
    "전문적이면서 친근한";
  const emphasis = typeof body.emphasis === "string" ? trimWriteField(body.emphasis) : "";
  const flags = {
    useLatestSearch: body.flags?.useLatestSearch === true,
    hashtags: body.flags?.hashtags === true,
    seoInsights: body.flags?.seoInsights === true,
  };
  const { data } = await resolveKeywordAnalysis(primaryKeyword, "naver");
  const personaBlock =
    body.usePersona === true ? await getActivePersona(authContext.user.id) : null;
  const { system, user: prompt } = buildWritePrompt({
    postTypeLabel,
    title,
    keywords: keywords.length > 0 ? keywords : [primaryKeyword],
    charCount,
    tone,
    emphasis,
    flags,
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
        endpoint: GEMINI_ENDPOINT,
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

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-KeywordOn-Model": "gemini-3.6-flash",
    },
  });
}
