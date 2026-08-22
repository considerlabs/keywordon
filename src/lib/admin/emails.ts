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

export function collectClerkEmails(user: {
  primaryEmailAddressId?: string | null;
  primaryEmailAddress?: { emailAddress?: string } | null;
  emailAddresses?: Array<{ id?: string; emailAddress?: string }>;
} | null | undefined): string[] {
  const addresses = user?.emailAddresses ?? [];
  const emails = addresses
    .map((item) => item.emailAddress?.trim())
    .filter((email): email is string => Boolean(email));
  const primaryId = user?.primaryEmailAddressId;
  const primary =
    user?.primaryEmailAddress?.emailAddress ||
    addresses.find((item) => item.id && item.id === primaryId)?.emailAddress;
  if (primary) {
    return [...new Set([primary, ...emails])];
  }
  return [...new Set(emails)];
}

/** Prefer the super-admin address when the Clerk user has several emails. */
export function pickAccountEmail(
  user: Parameters<typeof collectClerkEmails>[0],
  fallback?: string | null,
): string | null {
  const emails = collectClerkEmails(user);
  if (fallback) emails.push(fallback);
  return emails.find((email) => isAdminEmail(email)) ?? emails[0] ?? fallback ?? null;
}
