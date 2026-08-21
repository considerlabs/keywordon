import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { isAssignablePlan, patchUserForAdmin } from "@/lib/db/admin-users";
import type { PlanId } from "@/lib/plans";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { id: idRaw } = await context.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "잘못된 사용자 ID입니다." }, { status: 400 });
  }

  let body: { plan?: string; resetUsage?: boolean };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (body.plan !== undefined && !isAssignablePlan(body.plan)) {
    return NextResponse.json({ error: "할당할 수 없는 플랜입니다." }, { status: 400 });
  }

  const updated = await patchUserForAdmin(id, {
    plan: body.plan as PlanId | undefined,
    resetUsage: Boolean(body.resetUsage),
  });

  if (!updated) {
    return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ user: updated });
}
