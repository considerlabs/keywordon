import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    clerkId: text("clerk_id").notNull(),
    email: text("email"),
    plan: text("plan").notNull().default("free"),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    aiUsedMonth: integer("ai_used_month").notNull().default(0),
    googleUsedMonth: integer("google_used_month").notNull().default(0),
    usageMonthKey: text("usage_month_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("users_clerk_id_idx").on(table.clerkId)],
);

export const searchHistory = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  keyword: text("keyword").notNull(),
  engine: text("engine").notNull().default("naver"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const honeyBox = pgTable("honey_box", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  keyword: text("keyword").notNull(),
  note: text("note"),
  snapshot: jsonb("snapshot"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  domain: text("domain").notNull(),
  title: text("title"),
  lastReport: jsonb("last_report"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const usageEvents = pgTable("usage_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const automationIdeas = pgTable("automation_ideas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  source: text("source").notNull().default("manual"),
  title: text("title").notNull(),
  keyword: text("keyword"),
  monthlyVolume: integer("monthly_volume"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const automationDrafts = pgTable("automation_drafts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  ideaId: integer("idea_id"),
  title: text("title").notNull().default(""),
  content: text("content").notNull().default(""),
  status: text("status").notNull().default("draft"),
  exportedAt: timestamp("exported_at"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shortformProjects = pgTable("shortform_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  sourceUrl: text("source_url"),
  title: text("title").notNull().default(""),
  script: jsonb("script"),
  status: text("status").notNull().default("draft"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const blogPersonas = pgTable("blog_personas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  blogUrl: text("blog_url"),
  tone: jsonb("tone"),
  structure: jsonb("structure"),
  audience: jsonb("audience"),
  avoid: jsonb("avoid"),
  editedByUser: integer("edited_by_user").notNull().default(0),
  errorMessage: text("error_message"),
  progressStep: integer("progress_step").notNull().default(0),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const postAudits = pgTable("post_audits", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  postUrl: text("post_url").notNull(),
  targetKeyword: text("target_keyword"),
  report: jsonb("report"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AutomationIdeaRow = typeof automationIdeas.$inferSelect;
export type AutomationDraftRow = typeof automationDrafts.$inferSelect;
export type ShortformProjectRow = typeof shortformProjects.$inferSelect;
export type BlogPersonaRow = typeof blogPersonas.$inferSelect;
export type PostAuditRow = typeof postAudits.$inferSelect;