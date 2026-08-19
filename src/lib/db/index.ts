import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

export const hasDatabase = Boolean(databaseUrl);

export const db = hasDatabase
  ? drizzle(neon(databaseUrl as string), { schema })
  : null;

export function requireDb() {
  if (!db) {
    throw new Error(
      "DATABASE_URL이 없습니다. Neon 연동 후 `vercel env pull .env.local --yes`를 실행하세요.",
    );
  }
  return db;
}