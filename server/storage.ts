import { users, trails, apiSettings, type User, type Trail, type ApiSetting, type InsertUser, type UpdateUserProfile } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { hashPassword, comparePasswords } from "./utils/password";
import { findSimilarTrails } from "./services/trail-deduplication";

const PostgresStore = connectPgSimple(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: number, profile: UpdateUserProfile): Promise<User | undefined>;
  getTrails(): Promise<Trail[]>;
  getTrailById(id: number): Promise<Trail | undefined>;
  searchTrails(query: string): Promise<Trail[]>;
  getUserFavorites(userId: number): Promise<Trail[]>;
  addFavoriteTrail(userId: number, trailId: number): Promise<void>;
  removeFavoriteTrail(userId: number, trailId: number): Promise<void>;
  sessionStore: session.Store;
  createTrail(trail: Omit<Trail, "id">): Promise<Trail>;
  updateTrail(id: number, trail: Partial<Trail>): Promise<Trail | undefined>;
  deleteTrail(id: number): Promise<void>;

  getApiSettings(): Promise<ApiSetting[]>;
  getApiSettingByProvider(provider: string): Promise<ApiSetting | undefined>;
  updateApiSetting(id: number, setting: Partial<ApiSetting>): Promise<ApiSetting | undefined>;
  checkForDuplicateTrails(trail: Partial<Trail>): Promise<Trail[]>;
  markTrailOfflineAvailable(id: number, available: boolean): Promise<Trail>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    try {
      this.sessionStore = new PostgresStore({
        pool,
        createTableIfMissing: true,
        tableName: 'user_sessions',
        pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
      });

      Promise.all([
        this.initializeSampleTrails(),
        this.initializeAdminUser(),
        this.initializeApiSettings(),
      ]).catch(console.error);
    } catch (error) {
      console.error('Failed to initialize session store:', error);
      throw new Error('Session store initialization failed');
    }
  }

  private async initializeSampleTrails() {
    const existingTrails = await this.getTrails();
    if (existingTrails.length === 0) {
      const sampleTrails = [
        {
          name: "Angels Landing",
          description: "One of the most famous and thrilling hikes in Zion National Park",
          difficulty: "Strenuous",
          distance: "5.4 miles",
          elevation: "1,488 feet",
          duration: "4-6 hours",
          location: "Zion National Park, Utah",
          coordinates: "37.2690,-112.9469",
          imageUrl: "https://example.com/angels-landing.jpg",
          bestSeason: "Spring and Fall",
          parkingInfo: "Parking available at the Grotto Trailhead",
        },
        {
          name: "The Narrows",
          description: "Iconic water hike through the narrowest section of Zion Canyon",
          difficulty: "Moderate to Strenuous",
          distance: "Up to 16 miles",
          elevation: "334 feet",
          duration: "4-8 hours",
          location: "Zion National Park, Utah",
          coordinates: "37.3045,-112.9477",
          imageUrl: "https://example.com/the-narrows.jpg",
          bestSeason: "Late Spring to Fall",
          parkingInfo: "Temple of Sinawava shuttle stop",
        },
        {
          name: "Emerald Pools Trail",
          description: "Series of three pools with waterfalls and hanging gardens",
          difficulty: "Easy to Moderate",
          distance: "3 miles",
          elevation: "350 feet",
          duration: "2-4 hours",
          location: "Zion National Park, Utah",
          coordinates: "37.2516,-112.9507",
          imageUrl: "https://example.com/emerald-pools.jpg",
          bestSeason: "Year-round",
          parkingInfo: "Zion Lodge parking area",
        },
        {
          name: "Observation Point",
          description: "Highest point in Zion with panoramic views",
          difficulty: "Strenuous",
          distance: "8 miles",
          elevation: "2,148 feet",
          duration: "6-8 hours",
          location: "Zion National Park, Utah",
          coordinates: "37.2709,-112.9431",
          imageUrl: "https://example.com/observation-point.jpg",
          bestSeason: "Spring and Fall",
          parkingInfo: "Weeping Rock parking area",
        },
        {
          name: "Watchman Trail",
          description: "Less crowded trail with views of Springdale and the Towers of the Virgin",
          difficulty: "Moderate",
          distance: "3.3 miles",
          elevation: "368 feet",
          duration: "2-3 hours",
          location: "Zion National Park, Utah",
          coordinates: "37.2001,-112.9847",
          imageUrl: "https://example.com/watchman-trail.jpg",
          bestSeason: "Year-round",
          parkingInfo: "Visitor Center parking lot",
        }
      ];

      await db.insert(trails).values(sampleTrails);
    }
  }

  private async initializeAdminUser() {
    const adminUsername = "seth";
    const existingAdmin = await this.getUserByUsername(adminUsername);

    if (!existingAdmin) {
      await this.createUser({
        username: adminUsername,
        password: await hashPassword("admin123"),
        role: "admin"
      });
    }
  }

  private async initializeApiSettings() {
    const settings = await this.getApiSettings();
    if (settings.length === 0) {
      await db.insert(apiSettings).values([
        {
          provider: 'openai',
          isEnabled: false,
          model: 'gpt-4o',
          temperature: '0.7',
          maxTokens: 2000,
        },
        {
          provider: 'gemini',
          isEnabled: false,
          model: 'gemini-pro',
          temperature: '0.7',
          maxTokens: 2000,
        },
      ]);
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserProfile(id: number, profile: UpdateUserProfile): Promise<User | undefined> {
    if (profile.newPassword) {
      const currentUser = await this.getUser(id);
      if (!currentUser || !(await comparePasswords(profile.currentPassword!, currentUser.password))) {
        throw new Error("Current password is incorrect");
      }
    }

    const updateData: Partial<User> = {
      email: profile.email,
      fullName: profile.fullName,
      bio: profile.bio,
      profilePictureUrl: profile.profilePictureUrl,
      hikingPreferences: profile.hikingPreferences,
      privacySettings: profile.privacySettings,
      updatedAt: new Date(),
    };

    if (profile.newPassword) {
      updateData.password = await hashPassword(profile.newPassword);
    }

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return updatedUser;
  }

  async getUserFavorites(userId: number): Promise<Trail[]> {
    const user = await this.getUser(userId);
    if (!user || !user.favorites) return [];

    const favoriteIds = user.favorites;
    const favoriteTrails = await Promise.all(
      favoriteIds.map(id => this.getTrailById(parseInt(id)))
    );

    return favoriteTrails.filter((trail): trail is Trail => trail !== undefined);
  }

  async addFavoriteTrail(userId: number, trailId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const favorites = new Set(user.favorites || []);
    favorites.add(trailId.toString());

    await db
      .update(users)
      .set({ favorites: Array.from(favorites) })
      .where(eq(users.id, userId));
  }

  async removeFavoriteTrail(userId: number, trailId: number): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) throw new Error("User not found");

    const favorites = new Set(user.favorites || []);
    favorites.delete(trailId.toString());

    await db
      .update(users)
      .set({ favorites: Array.from(favorites) })
      .where(eq(users.id, userId));
  }

  async getTrails(): Promise<Trail[]> {
    return await db.select().from(trails);
  }

  async getTrailById(id: number): Promise<Trail | undefined> {
    const [trail] = await db.select().from(trails).where(eq(trails.id, id));
    return trail;
  }

  async searchTrails(query: string): Promise<Trail[]> {
    const lowerQuery = query.toLowerCase();
    const allTrails = await this.getTrails();
    return allTrails.filter(
      (trail) =>
        trail.name.toLowerCase().includes(lowerQuery) ||
        trail.location.toLowerCase().includes(lowerQuery) ||
        trail.description.toLowerCase().includes(lowerQuery)
    );
  }

  async createTrail(trail: Omit<Trail, "id">): Promise<Trail> {
    const similarTrails = await this.checkForDuplicateTrails(trail);

    const [newTrail] = await db.insert(trails).values({
      ...trail,
      similarTrails: similarTrails.map(t => t.id.toString()),
      offlineAvailable: false,
    }).returning();

    return newTrail;
  }

  async updateTrail(id: number, trail: Partial<Trail>): Promise<Trail | undefined> {
    const [updatedTrail] = await db
      .update(trails)
      .set(trail)
      .where(eq(trails.id, id))
      .returning();
    return updatedTrail;
  }

  async deleteTrail(id: number): Promise<void> {
    await db.delete(trails).where(eq(trails.id, id));
  }

  async getApiSettings(): Promise<ApiSetting[]> {
    return await db.select().from(apiSettings);
  }

  async getApiSettingByProvider(provider: string): Promise<ApiSetting | undefined> {
    const [setting] = await db
      .select()
      .from(apiSettings)
      .where(eq(apiSettings.provider, provider));
    return setting;
  }

  async updateApiSetting(id: number, setting: Partial<ApiSetting>): Promise<ApiSetting | undefined> {
    const [updatedSetting] = await db
      .update(apiSettings)
      .set({
        ...setting,
        updatedAt: new Date(),
      })
      .where(eq(apiSettings.id, id))
      .returning();
    return updatedSetting;
  }

  async checkForDuplicateTrails(trail: Partial<Trail>): Promise<Trail[]> {
    const existingTrails = await this.getTrails();
    return findSimilarTrails(trail, existingTrails);
  }

  async markTrailOfflineAvailable(id: number, available: boolean): Promise<Trail> {
    const [updatedTrail] = await db
      .update(trails)
      .set({
        offlineAvailable: available,
        lastOfflineSync: available ? new Date() : null,
        localCacheKey: available ? `trail_${id}_${Date.now()}` : null,
      })
      .where(eq(trails.id, id))
      .returning();

    return updatedTrail;
  }
}

export const storage = new DatabaseStorage();