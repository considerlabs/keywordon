import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { tryConsumeAiUsage } from "@/lib/db/users";
import { callGemini } from "@/lib/gemini";
import { buildAuditPrompt, parseAuditReport } from "@/lib/audit/prompt";
import {
  countPostAuditsThisMonth,
  insertPostAudit,
  logPostAuditEvent,
} from "@/lib/audit/repository";
import { assertPostAuditMonthlyLimit, monthKey } from "@/lib/audit/monthly";
import { assertFeature } from "@/lib/quota";
import { fetchAllowedUrl, SsrfError } from "@/lib/ssrf";
import { trimWriteField } from "@/lib/write/prompt";

function mapDbError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("DATABASE_URL")) {
    return NextResponse.json(
      { error: "데이터베이스가 연결되지 않았습니다. DATABASE_URL을 확인해 주세요." },
      { status: 503 },
    );
  }
  console.error("audit post error", error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

export async function POST(request: NextRequest) {
  const authContext = await getAuthContext();
  if (!authContext.userId || !authContext.user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const feature = assertFeature(authContext.plan, "blogAnalysis", "블로그 분석");
  if (!feature.ok) {
    return NextResponse.json({ error: feature.error }, { status: 403 });
  }

  let body: { postUrl?: string; targetKeyword?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const rawUrl = typeof body.postUrl === "string" ? body.postUrl.trim() : "";
  if (!rawUrl) {
    return NextResponse.json({ error: "게시글 URL을 입력해 주세요." }, { status: 400 });
  }

  let postUrl: string;
  let content: string;
  try {
    const fetched = await fetchAllowedUrl(rawUrl);
    postUrl = fetched.url.toString();
    content = fetched.text;
  } catch (error) {
    const message =
      error instanceof SsrfError ? error.message : "URL에서 본문을 불러오지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!content.trim()) {
    return NextResponse.json(
      { error: "게시글 본문을 추출하지 못했습니다. URL을 확인해 주세요." },
      { status: 400 },
    );
  }

  const targetKeyword =
    typeof body.targetKeyword === "string" ? trimWriteField(body.targetKeyword, 100) : null;

  const auditFeature = assertFeature(authContext.plan, "postAuditMonthly", "게시글 진단");
  if (!auditFeature.ok) {
    return NextResponse.json({ error: auditFeature.error }, { status: 403 });
  }

  const monthlyLimit = authContext.plan.limits.postAuditMonthly;
  let monthlyUsed: number;
  try {
    monthlyUsed = await countPostAuditsThisMonth(authContext.user.id, monthKey());
  } catch (error) {
    return mapDbError(error);
  }

  const monthlyCheck = assertPostAuditMonthlyLimit(monthlyUsed, monthlyLimit);
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

  const gemini = await callGemini({
    ...buildAuditPrompt({ postUrl, targetKeyword, content }),
    temperature: 0.4,
  });
  if (!gemini.ok) {
    return NextResponse.json(
      { error: gemini.error, model: "gemini-3.6-flash" },
      { status: gemini.status },
    );
  }

  const report = parseAuditReport(gemini.text, postUrl, targetKeyword);
  if (!report) {
    return NextResponse.json(
      { error: "진단 리포트를 파싱하지 못했습니다. 다시 시도해 주세요.", model: "gemini-3.6-flash" },
      { status: 502 },
    );
  }

  try {
    const audit = await insertPostAudit({
      userId: authContext.user.id,
      postUrl,
      targetKeyword,
      report,
    });
    await logPostAuditEvent(authContext.user.id, { auditId: audit.id, postUrl });
    return NextResponse.json({ report, auditId: audit.id, monthlyUsed: monthlyUsed + 1, monthlyLimit });
  } catch (error) {
    return mapDbError(error);
  }
}
