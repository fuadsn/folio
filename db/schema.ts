import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const worlds = sqliteTable("worlds", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull().unique(),
  draft: text("draft").notNull(),
  published: text("published"),
  revision: integer("revision").notNull().default(0),
  publishedAt: text("published_at"),
  updatedAt: text("updated_at").notNull(),
});
export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});
export const generations = sqliteTable("generations", {
  id: text("id").primaryKey(),
  owner: text("owner").notNull(),
  prompt: text("prompt").notNull(),
  status: text("status").notNull(),
  result: text("result"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
});
export const wallets = sqliteTable("wallets", {
  owner: text("owner").primaryKey(),
  credits: integer("credits").notNull().default(3),
});
export const purchases = sqliteTable("purchases", {
  sessionId: text("session_id").primaryKey(),
  owner: text("owner").notNull(),
  credits: integer("credits").notNull(),
  createdAt: text("created_at").notNull(),
});
