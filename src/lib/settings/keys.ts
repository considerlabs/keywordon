export const SETTINGS_KEYS = [
  "NAVER_SEARCHAD_CUSTOMER_ID",
  "NAVER_SEARCHAD_API_KEY",
  "NAVER_SEARCHAD_SECRET_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_ADS_DEVELOPER_TOKEN",
  "GOOGLE_ADS_CUSTOMER_ID",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_BASIC_MONTHLY",
  "STRIPE_PRICE_BASIC_YEARLY",
  "STRIPE_PRICE_SUPER_MONTHLY",
  "STRIPE_PRICE_SUPER_YEARLY",
  "STRIPE_PRICE_ENTERPRISE_MONTHLY",
  "STRIPE_PRICE_ENTERPRISE_YEARLY",
  "CRON_SECRET",
  "NEXT_PUBLIC_APP_URL",
] as const;

export type SettingsKey = (typeof SETTINGS_KEYS)[number];

const KEY_SET = new Set<string>(SETTINGS_KEYS);

export function isSettingsKey(key: string): key is SettingsKey {
  return KEY_SET.has(key);
}

export function maskSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value.length <= 8) return "****";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}
