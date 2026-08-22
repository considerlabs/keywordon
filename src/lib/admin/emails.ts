export const SUPER_ADMIN_EMAIL = "considerlabs@gmail.com";

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
  return parseAdminEmails().includes(email.trim().toLowerCase());
}
