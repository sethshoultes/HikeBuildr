import { users, trails, type User, type Trail, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
import { hashPassword } from "./utils/password";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTrails(): Promise<Trail[]>;
  getTrailById(id: number): Promise<Trail | undefined>;
  searchTrails(query: string): Promise<Trail[]>;
  sessionStore: session.Store;
  createTrail(trail: Omit<Trail, "id">): Promise<Trail>;
  updateTrail(id: number, trail: Partial<Trail>): Promise<Trail | undefined>;
  deleteTrail(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    Promise.all([
      this.initializeSampleTrails(),
      this.initializeAdminUser()
    ]).catch(console.error);
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

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
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
    const [newTrail] = await db.insert(trails).values(trail).returning();
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
}

export const storage = new DatabaseStorage();