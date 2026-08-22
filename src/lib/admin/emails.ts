export const SUPER_ADMIN_EMAIL = "considerlabs@gmail.com";

function normalizeEmail(email: string): string {
  const lower = email.trim().toLowerCase();
  const at = lower.lastIndexOf("@");
  if (at < 0) return lower;
  const local = lower.slice(0, at);
  const domain = lower.slice(at + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.replace(/\./g, "").split("+")[0]}@gmail.com`;
  }
  return lower;
}

export function parseAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS?.trim();
  const extras = raw
    ? raw
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    : [];
  return [...new Set([SUPER_ADMIN_EMAIL, ...extras])];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = normalizeEmail(email);
  return parseAdminEmails().some((admin) => normalizeEmail(admin) === normalized);
}

function pushEmail(bucket: string[], value: unknown) {
  if (typeof value !== "string" || !value.includes("@")) return;
  bucket.push(value.trim());
}

/** Collect every email Clerk may attach, including snake_case payloads. */
export function collectClerkEmails(user: unknown): string[] {
  if (!user || typeof user !== "object") return [];
  const record = user as Record<string, unknown>;
  const found: string[] = [];
  pushEmail(found, (record.primaryEmailAddress as { emailAddress?: string } | undefined)?.emailAddress);
  const lists = [record.emailAddresses, record.email_addresses];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (typeof item === "string") pushEmail(found, item);
      else if (item && typeof item === "object") {
        const row = item as { emailAddress?: string; email_address?: string };
        pushEmail(found, row.emailAddress);
        pushEmail(found, row.email_address);
      }
    }
  }
  return [...new Set(found)];
}

/** Prefer the super-admin address when the Clerk user has several emails. */
export function pickAccountEmail(user: unknown, fallback?: string | null): string | null {
  const emails = collectClerkEmails(user);
  if (fallback) emails.push(fallback);
  return emails.find((email) => isAdminEmail(email)) ?? emails[0] ?? fallback ?? null;
}
