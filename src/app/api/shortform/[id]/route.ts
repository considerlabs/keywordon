import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { getProjectForUser, updateProjectForUser } from "@/lib/shortform/repository";
import type { ShortformProjectStatus, ShortformScript } from "@/lib/shortform/types";
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
  console.error("shortform detail error", error);
  return NextResponse.json({ error: "요청을 처리하지 못했습니다." }, { status: 500 });
}

function isStatus(value: unknown): value is ShortformProjectStatus {
  return value === "draft" || value === "ready" || value === "exported";
}

function isScript(value: unknown): value is ShortformScript {
  if (!value || typeof value !== "object") return false;
  const script = value as Partial<ShortformScript>;
  return (
    typeof script.hook === "string" &&
    Array.isArray(script.scenes) &&
    typeof script.fullNarration === "string"
  );
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
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

  try {
    const project = await getProjectForUser(authContext.user.id, id);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    return mapDbError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
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

  let body: { title?: string; script?: unknown; status?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const patch: {
    title?: string;
    script?: ShortformScript;
    status?: ShortformProjectStatus;
  } = {};

  if (typeof body.title === "string") {
    patch.title = trimWriteField(body.title);
  }
  if (body.script !== undefined) {
    if (!isScript(body.script)) {
      return NextResponse.json({ error: "대본 형식이 올바르지 않습니다." }, { status: 400 });
    }
    patch.script = body.script;
  }
  if (body.status !== undefined) {
    if (!isStatus(body.status)) {
      return NextResponse.json({ error: "상태 값이 올바르지 않습니다." }, { status: 400 });
    }
    patch.status = body.status;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "변경할 항목이 없습니다." }, { status: 400 });
  }

  try {
    const project = await updateProjectForUser(authContext.user.id, id, patch);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    return mapDbError(error);
  }
}
