import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/require-admin";
import { countUsers, getPlanDistribution } from "@/lib/db/admin-users";
import { listSettingStatuses } from "@/lib/settings/store";

export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) return gate.response;

  const [totalUsers, planDistribution, settings] = await Promise.all([
    countUsers(),
    getPlanDistribution(),
    listSettingStatuses(),
  ]);

  const criticalKeys = [
    "NAVER_SEARCHAD_CUSTOMER_ID",
    "NAVER_SEARCHAD_API_KEY",
    "NAVER_SEARCHAD_SECRET_KEY",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "STRIPE_SECRET_KEY",
  ] as const;

  const missingCritical = criticalKeys.filter((key) => {
    const row = settings.find((s) => s.key === key);
    if (key === "GOOGLE_GENERATIVE_AI_API_KEY") {
      const gemini = settings.find((s) => s.key === "GEMINI_API_KEY");
      return !(row?.configured || gemini?.configured);
    }
    return !row?.configured;
  });

  return NextResponse.json({
    totalUsers,
    planDistribution,
    settingsConfigured: settings.filter((s) => s.configured).length,
    settingsTotal: settings.length,
    missingCritical,
    naverConfigured: criticalKeys.slice(0, 3).every((key) =>
      settings.find((s) => s.key === key)?.configured,
    ),
    geminiConfigured: Boolean(
      settings.find((s) => s.key === "GOOGLE_GENERATIVE_AI_API_KEY")?.configured ||
        settings.find((s) => s.key === "GEMINI_API_KEY")?.configured,
    ),
  });
}
