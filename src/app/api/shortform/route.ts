import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { assertShortformMonthlyLimit, monthKey } from "@/lib/shortform/monthly";
import { countShortformGenerationsThisMonth, insertProject, listProjects } from "@/lib/shortform/repository";
import { POPULAR_SHORTFORM_MOCK } from "@/lib/shortform/types";
import { assertAllowedUrl, SsrfError } from "@/lib/ssrf";
import { assertFeature } from "@/lib/quota";
import { trimWriteField } from "@/lib/write/prompt";

function mapDbError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) {
    return NextResponse.json(
      { error: "데이터베이스가 연결되지 않았습니다. DATABASE_URL을 확인해 주세요." },
      { status: 503 },
    );
  }
  console.error("shortform list/create error", error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
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
    const userId = authContext.user.id;
    const monthlyLimit = authContext.plan.limits.shortformMonthly;
    const [projects, monthlyUsed] = await Promise.all([
      listProjects(userId),
      countShortformGenerationsThisMonth(userId, monthKey()),
    ]);

    return NextResponse.json({
      projects,
      popular: POPULAR_SHORTFORM_MOCK,
      monthlyUsed,
      monthlyLimit,
    });
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

  let body: { title?: string; sourceUrl?: string; sourceText?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? trimWriteField(body.title) : "";
  const sourceText =
    typeof body.sourceText === "string" ? body.sourceText.trim().slice(0, 50_000) : "";
  let sourceUrl: string | null = null;

  if (typeof body.sourceUrl === "string" && body.sourceUrl.trim()) {
    try {
      sourceUrl = assertAllowedUrl(body.sourceUrl).toString();
    } catch (error) {
      const message =
        error instanceof SsrfError
          ? error.message
          : "네이버 블로그·티스토리 https URL만 허용됩니다.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (!title && !sourceUrl && !sourceText) {
    return NextResponse.json(
      { error: "제목, URL, 또는 본문 텍스트 중 하나는 필요합니다." },
      { status: 400 },
    );
  }

  try {
    const project = await insertProject({
      userId: authContext.user.id,
      title: title || "새 숏폼 프로젝트",
      sourceUrl,
      sourceText: sourceText || null,
    });
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return mapDbError(error);
  }
}
