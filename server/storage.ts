import { users, trails, type User, type Trail, type InsertUser } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getTrails(): Promise<Trail[]>;
  getTrailById(id: number): Promise<Trail | undefined>;
  searchTrails(query: string): Promise<Trail[]>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private trails: Map<number, Trail>;
  public sessionStore: session.Store;
  private currentUserId: number;
  private currentTrailId: number;

  constructor() {
    this.users = new Map();
    this.trails = new Map();
    this.currentUserId = 1;
    this.currentTrailId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, favorites: [] };
    this.users.set(id, user);
    return user;
  }

  async getTrails(): Promise<Trail[]> {
    return Array.from(this.trails.values());
  }

  async getTrailById(id: number): Promise<Trail | undefined> {
    return this.trails.get(id);
  }

  async searchTrails(query: string): Promise<Trail[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.trails.values()).filter(
      (trail) =>
        trail.name.toLowerCase().includes(lowerQuery) ||
        trail.location.toLowerCase().includes(lowerQuery)
    );
  }
}

export const storage = new MemStorage();
