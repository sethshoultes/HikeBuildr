import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
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
  profilePictureUrl: text("profile_picture_url"),
  role: text("role").notNull().default("user"),
  favorites: text("favorites").array().default([]),
  hikingPreferences: jsonb("hiking_preferences").default({
    preferredDifficulty: "moderate",
    maxDistance: 10,
    preferredTerrains: ["forest", "mountain"],
    preferredSeasons: ["spring", "summer"],
    notifications: true
  }),
  privacySettings: jsonb("privacy_settings").default({
    showEmail: false,
    showFullName: true,
    showActivities: true,
    showFavorites: true
  }),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Keep existing trails table unchanged
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

// Keep API settings table unchanged
export const apiSettings = pgTable("api_settings", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(),
  isEnabled: boolean("is_enabled").notNull().default(false),
  apiKey: text("api_key"),
  model: text("model"),
  temperature: text("temperature"),
  maxTokens: integer("max_tokens"),
  lastValidated: timestamp("last_validated"),
  lastUpdatedById: integer("last_updated_by_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Update schemas to include new fields
export const insertUserSchema = createInsertSchema(users).extend({
  role: z.enum(["user", "guide", "admin"]).default("user"),
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  profilePictureUrl: z.string().url().optional(),
  hikingPreferences: z.object({
    preferredDifficulty: z.enum(["easy", "moderate", "strenuous"]),
    maxDistance: z.number().min(1).max(50),
    preferredTerrains: z.array(z.string()),
    preferredSeasons: z.array(z.string()),
    notifications: z.boolean()
  }).optional(),
  privacySettings: z.object({
    showEmail: z.boolean(),
    showFullName: z.boolean(),
    showActivities: z.boolean(),
    showFavorites: z.boolean()
  }).optional(),
});

export const updateUserProfileSchema = z.object({
  email: z.string().email().optional(),
  fullName: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  profilePictureUrl: z.string().url().optional(),
  hikingPreferences: z.object({
    preferredDifficulty: z.enum(["easy", "moderate", "strenuous"]),
    maxDistance: z.number().min(1).max(50),
    preferredTerrains: z.array(z.string()),
    preferredSeasons: z.array(z.string()),
    notifications: z.boolean()
  }).optional(),
  privacySettings: z.object({
    showEmail: z.boolean(),
    showFullName: z.boolean(),
    showActivities: z.boolean(),
    showFavorites: z.boolean()
  }).optional(),
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

// Keep other schemas unchanged
export const insertTrailSchema = createInsertSchema(trails);
export const apiSettingSchema = createInsertSchema(apiSettings).extend({
  provider: z.enum(["openai", "gemini"]),
  model: z.string().min(1),
  temperature: z.string().regex(/^0(\.\d+)?$|^1(\.0+)?$/),
  maxTokens: z.number().min(1).max(32000),
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUserProfile = z.infer<typeof updateUserProfileSchema>;
export type User = typeof users.$inferSelect;
export type Trail = typeof trails.$inferSelect;
export type ApiSetting = typeof apiSettings.$inferSelect;
export type InsertApiSetting = z.infer<typeof apiSettingSchema>;