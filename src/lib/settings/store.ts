import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/lib/db/index";
import { appSettings } from "@/lib/db/schema";
import { decryptSetting, encryptSetting, hasEncryptionKey } from "./crypto";
import { isSettingsKey, maskSecret, SETTINGS_KEYS, type SettingsKey } from "./keys";

type CacheEntry = { value: string | null; source: "db" | "none" };
let cache: Map<string, CacheEntry> | null = null;
const memoryRows = new Map<string, { valueEncrypted: string; updatedBy: string | null }>();

export function invalidateSettingsCache() {
  cache = null;
}

/** Test helper — clears in-memory fallback rows. */
export function __resetSettingsMemoryForTests() {
  memoryRows.clear();
  invalidateSettingsCache();
}

async function loadDbOverrides(): Promise<Map<string, CacheEntry>> {
  const map = new Map<string, CacheEntry>();

  if (!hasDatabase || !db) {
    for (const [key, row] of memoryRows) {
      try {
        map.set(key, { value: decryptSetting(row.valueEncrypted), source: "db" });
      } catch {
        map.set(key, { value: null, source: "none" });
      }
    }
    return map;
  }

  if (typeof (db as { select?: unknown }).select !== "function") {
    return map;
  }

  try {
    const rows = await db.select().from(appSettings);
    for (const row of rows) {
      try {
        map.set(row.key, { value: decryptSetting(row.valueEncrypted), source: "db" });
      } catch {
        map.set(row.key, { value: null, source: "none" });
      }
    }
  } catch {
    // Incomplete db mocks (tests) or schema not pushed yet — fall back to env.
  }
  return map;
}

async function ensureCache() {
  if (!cache) cache = await loadDbOverrides();
}

export async function getSetting(key: string): Promise<string | undefined> {
  await ensureCache();
  const entry = cache?.get(key);
  if (entry?.source === "db" && entry.value != null && entry.value !== "") {
    return entry.value;
  }
  const fromEnv = process.env[key]?.trim();
  return fromEnv || undefined;
}

export type SettingStatus = {
  key: SettingsKey;
  configured: boolean;
  source: "db" | "env" | "none";
  preview: string | null;
};

export async function listSettingStatuses(): Promise<SettingStatus[]> {
  await ensureCache();
  return SETTINGS_KEYS.map((key) => {
    const entry = cache?.get(key);
    if (entry?.source === "db" && entry.value) {
      return {
        key,
        configured: true,
        source: "db" as const,
        preview: maskSecret(entry.value),
      };
    }
    const fromEnv = process.env[key]?.trim();
    if (fromEnv) {
      return {
        key,
        configured: true,
        source: "env" as const,
        preview: maskSecret(fromEnv),
      };
    }
    return { key, configured: false, source: "none" as const, preview: null };
  });
}

export async function setSetting(
  key: string,
  value: string,
  updatedBy: string | null,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isSettingsKey(key)) {
    return { ok: false, error: "허용되지 않은 설정 키입니다.", status: 400 };
  }
  if (!hasEncryptionKey()) {
    return {
      ok: false,
      error: "SETTINGS_ENCRYPTION_KEY가 없어 설정을 저장할 수 없습니다.",
      status: 503,
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return clearSetting(key);
  }

  const sealed = encryptSetting(trimmed);

  if (!hasDatabase || !db) {
    memoryRows.set(key, { valueEncrypted: sealed, updatedBy });
    invalidateSettingsCache();
    return { ok: true };
  }

  const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  if (existing[0]) {
    await db
      .update(appSettings)
      .set({
        valueEncrypted: sealed,
        updatedAt: new Date(),
        updatedBy,
      })
      .where(eq(appSettings.key, key));
  } else {
    await db.insert(appSettings).values({
      key,
      valueEncrypted: sealed,
      updatedBy,
    });
  }

  invalidateSettingsCache();
  return { ok: true };
}

export async function clearSetting(
  key: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (!isSettingsKey(key)) {
    return { ok: false, error: "허용되지 않은 설정 키입니다.", status: 400 };
  }

  if (!hasDatabase || !db) {
    memoryRows.delete(key);
    invalidateSettingsCache();
    return { ok: true };
  }

  await db.delete(appSettings).where(eq(appSettings.key, key));
  invalidateSettingsCache();
  return { ok: true };
}
