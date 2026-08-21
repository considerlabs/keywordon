import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { listSettingStatuses } from "@/lib/settings/store";
import { hasEncryptionKey } from "@/lib/settings/crypto";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const settings = await listSettingStatuses();
  return NextResponse.json({
    settings,
    encryptionReady: hasEncryptionKey(),
    note: "NEXT_PUBLIC_APP_URL은 서버(체크아웃 URL 등)에만 적용됩니다. 클라이언트 번들은 빌드 시점 env를 씁니다.",
  });
}
