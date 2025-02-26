import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Keep existing tables
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  fullName: text("full_name"),
  bio: text("bio"),
  role: text("role").notNull().default("user"),
  favorites: text("favorites").array().default([]),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// New table for API settings
export const apiSettings = pgTable("api_settings", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // 'openai' or 'gemini'
  isEnabled: boolean("is_enabled").notNull().default(false),
  apiKey: text("api_key"),
  model: text("model"), // e.g., 'gpt-4', 'gemini-pro'
  temperature: text("temperature"),
  maxTokens: integer("max_tokens"),
  lastValidated: timestamp("last_validated"),
  lastUpdatedById: integer("last_updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Existing schemas
export const insertUserSchema = createInsertSchema(users).extend({
  role: z.enum(["user", "guide", "admin"]).default("user"),
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
});

export const updateUserProfileSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  return true;
}, {
  message: "Current password is required when changing password",
});

export const insertTrailSchema = createInsertSchema(trails);

// New schema for API settings
export const apiSettingSchema = createInsertSchema(apiSettings).extend({
  provider: z.enum(["openai", "gemini"]),
  model: z.string().min(1),
  temperature: z.string().regex(/^0(\.\d+)?$|^1(\.0+)?$/), // Between 0 and 1
  maxTokens: z.number().min(1).max(32000),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type User = typeof users.$inferSelect;
export type Trail = typeof trails.$inferSelect;
export type ApiSetting = typeof apiSettings.$inferSelect;
export type InsertApiSetting = z.infer<typeof apiSettingSchema>;