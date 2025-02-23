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

    // Add sample trails
    this.initializeSampleTrails();
  }

  private initializeSampleTrails() {
    const sampleTrails: Omit<Trail, "id">[] = [
      {
        name: "Mount Tamalpais Loop",
        description: "Scenic loop with bay views",
        difficulty: "Moderate",
        distance: "7.5 miles",
        duration: "4-5 hours",
        location: "Mill Valley, CA",
        coordinates: "37.9235,-122.5965",
        imageUrl: "https://example.com/tamalpais.jpg",
        aiSummary: "Popular hiking destination with panoramic views of the Bay Area",
      },
      {
        name: "Muir Woods Trail",
        description: "Ancient redwood forest trail",
        difficulty: "Easy",
        distance: "2 miles",
        duration: "1-2 hours",
        location: "Mill Valley, CA",
        coordinates: "37.8912,-122.5715",
        imageUrl: "https://example.com/muir-woods.jpg",
        aiSummary: "Easy walk through majestic redwood groves",
      },
      {
        name: "Angel Island Perimeter Trail",
        description: "Coastal trail with city views",
        difficulty: "Moderate",
        distance: "5.5 miles",
        duration: "3-4 hours",
        location: "Angel Island, CA",
        coordinates: "37.8609,-122.4326",
        imageUrl: "https://example.com/angel-island.jpg",
        aiSummary: "Historic island trail with 360-degree bay views",
      },
    ];

    sampleTrails.forEach((trail) => {
      const id = this.currentTrailId++;
      this.trails.set(id, { ...trail, id });
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
        trail.location.toLowerCase().includes(lowerQuery) ||
        trail.description.toLowerCase().includes(lowerQuery)
    );
  }
}

export const storage = new MemStorage();