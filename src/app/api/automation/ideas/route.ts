import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertIdeasDailyLimit, dayKey } from "@/lib/automation/daily";
import { buildLiveSuggestions } from "@/lib/automation/live-suggestions";
import {
  countIdeasCreatedOn,
  insertIdea,
  listIdeas,
} from "@/lib/automation/repository";
import type { IdeaSource } from "@/lib/automation/types";
import { assertFeature } from "@/lib/quota";
import { trimWriteField } from "@/lib/write/prompt";

function isIdeaSource(value: unknown): value is IdeaSource {
  return value === "manual" || value === "suggestion" || value === "keyword";
}

function mapDbError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) {
    return NextResponse.json(
      { error: "데이터베이스가 연결되지 않았습니다. DATABASE_URL을 확인해 주세요." },
      { status: 503 },
    );
  }
  console.error("automation ideas error", error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

export async function GET() {
  const authContext = await getAuthContext();
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const feature = assertFeature(authContext.plan, "copilot", "Copilot AI");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  try {
    const userId = authContext.user.id;
    const dailyLimit = authContext.plan.limits.automationIdeasDaily;
    const key = dayKey();
    const [ideas, dailyUsed, live] = await Promise.all([
      listIdeas(userId),
      countIdeasCreatedOn(userId, key),
      buildLiveSuggestions(12),
    ]);

    return NextResponse.json({
      ideas,
      suggestions: live.suggestions,
      suggestionSource: live.source,
      dailyUsed,
      dailyLimit,
    });
  } catch (error) {
    return mapDbError(error);
  }
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const feature = assertFeature(authContext.plan, "copilot", "Copilot AI");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  let body: {
    title?: string;
    keyword?: string;
    source?: string;
    monthlyVolume?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? trimWriteField(body.title) : "";
  if (!title) {
    return NextResponse.json({ error: "글감 제목을 입력해 주세요." }, { status: 400 });
  }

  const keyword =
    typeof body.keyword === "string" ? trimWriteField(body.keyword) : "";
  const source: IdeaSource = isIdeaSource(body.source) ? body.source : "manual";
  const monthlyVolume =
    typeof body.monthlyVolume === "number" && Number.isFinite(body.monthlyVolume)
      ? Math.max(0, Math.floor(body.monthlyVolume))
      : null;

  try {
    const userId = authContext.user.id;
    const dailyLimit = authContext.plan.limits.automationIdeasDaily;
    const dailyUsed = await countIdeasCreatedOn(userId, dayKey());
    const limitCheck = assertIdeasDailyLimit(dailyUsed, dailyLimit);
    if (!limitCheck.ok) {
      return NextResponse.json({ error: limitCheck.error }, { status: 429 });
    }

    const idea = await insertIdea({
      userId,
      source,
      title,
      keyword: keyword || title,
      monthlyVolume,
    });

    return NextResponse.json({ idea }, { status: 201 });
  } catch (error) {
    return mapDbError(error);
  }
}
