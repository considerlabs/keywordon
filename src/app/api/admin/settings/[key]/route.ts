import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { clearSetting, setSetting } from "@/lib/settings/store";
import { isSettingsKey } from "@/lib/settings/keys";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ key: string }> },
) {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const { key } = await context.params;
  if (!isSettingsKey(key)) {
    return NextResponse.json({ error: "허용되지 않은 설정 키입니다." }, { status: 400 });
  }

  let body: { value?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const value = typeof body.value === "string" ? body.value : "";
  const result = value.trim()
    ? await setSetting(key, value, gate.admin.email)
    : await clearSetting(key);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true, key, cleared: !value.trim() });
}
