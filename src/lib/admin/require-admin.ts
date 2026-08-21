import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { isAdminEmail } from "./emails";

export type AdminContext = {
  userId: string;
  email: string;
};

export async function requireAdmin(): Promise<
  { ok: true; admin: AdminContext } | { ok: false; response: NextResponse }
> {
  const auth = await getAuthContext();
  if (!auth.authEnabled) {
    return {
      ok: false,
      response: NextResponse.json({ error: "인증이 설정되지 않았습니다." }, { status: 503 }),
    };
  }
  if (!auth.userId || !auth.email) {
    return {
      ok: false,
      response: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }),
    };
  }
  if (!isAdminEmail(auth.email)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "관리자 권한이 없습니다." }, { status: 403 }),
    };
  }
  return { ok: true, admin: { userId: auth.userId, email: auth.email } };
}
