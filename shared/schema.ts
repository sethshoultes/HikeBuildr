import { pgTable, text, serial, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  favorites: text("favorites").array().default([]),
});

export const trails = pgTable("trails", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(),
  distance: text("distance").notNull(),
  elevation: text("elevation").notNull(),
  duration: text("duration").notNull(),
  location: text("location").notNull(),
  coordinates: text("coordinates").notNull(),
  pathCoordinates: text("path_coordinates"),
  imageUrl: text("image_url"),
  aiSummary: text("ai_summary"),
  bestSeason: text("best_season"),
  parkingInfo: text("parking_info"),
  createdById: integer("created_by_id").references(() => users.id),
  lastUpdatedById: integer("last_updated_by_id").references(() => users.id),
});

export const insertUserSchema = createInsertSchema(users).extend({
  role: z.enum(["user", "guide", "admin"]).default("user"),
});

export const insertTrailSchema = createInsertSchema(trails);

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Trail = typeof trails.$inferSelect;