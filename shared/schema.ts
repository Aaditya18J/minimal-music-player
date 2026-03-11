import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const playHistory = pgTable("play_history", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  playedAt: timestamp("played_at").defaultNow().notNull(),
});

export const insertPlayHistorySchema = createInsertSchema(playHistory).pick({
  filename: true,
});

export type InsertPlayHistory = z.infer<typeof insertPlayHistorySchema>;
export type PlayHistory = typeof playHistory.$inferSelect;
