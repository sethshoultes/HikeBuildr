import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateTrailDescription, generateGearList } from "./openai";
import { requireAuth, requireRole } from "./middleware/auth";
import { insertTrailSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

// In-memory storage for logs
const apiLogs: Array<{
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration: number;
  response?: string;
}> = [];

const errorLogs: Array<{
  timestamp: string;
  error: string;
  stack?: string;
}> = [];

const startTime = Date.now();

// Type-safe request with authenticated user
interface AuthenticatedRequest extends Request {
  user: Express.User;
}

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        apiLogs.unshift({
          timestamp: new Date().toISOString(),
          method: req.method,
          path,
          status: res.statusCode,
          duration,
          response: capturedJsonResponse ? JSON.stringify(capturedJsonResponse) : undefined,
        });

        // Keep only last 1000 logs
        if (apiLogs.length > 1000) {
          apiLogs.pop();
        }
      }
    });

    next();
  });

  // Error logging middleware
  app.use((err: Error, req: any, res: any, next: any) => {
    errorLogs.unshift({
      timestamp: new Date().toISOString(),
      error: err.message,
      stack: err.stack,
    });

    // Keep only last 1000 error logs
    if (errorLogs.length > 1000) {
      errorLogs.pop();
    }

    next(err);
  });

  // Admin routes with role-based protection
  app.get("/api/admin/logs", requireRole(["admin"]), (_req, res) => {
    res.json(apiLogs);
  });

  app.get("/api/admin/errors", requireRole(["admin"]), (_req, res) => {
    res.json(errorLogs);
  });

  app.get("/api/admin/status", requireRole(["admin"]), (_req, res) => {
    const memoryUsage = process.memoryUsage();

    res.json({
      uptime: (Date.now() - startTime) / 1000, // in seconds
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
      },
      activeUsers: 0, // To be implemented with session tracking
    });
  });

  // Trail management routes
  app.post("/api/trails", requireRole(["admin", "guide"]), async (req: AuthenticatedRequest, res) => {
    const trail = await storage.createTrail({
      ...req.body,
      createdById: req.user.id,
      lastUpdatedById: req.user.id,
    });
    res.status(201).json(trail);
  });

  app.patch("/api/trails/:id", requireRole(["admin", "guide"]), async (req: AuthenticatedRequest, res) => {
    const trail = await storage.updateTrail(parseInt(req.params.id), {
      ...req.body,
      lastUpdatedById: req.user.id,
    });
    if (!trail) {
      return res.status(404).send("Trail not found");
    }
    res.json(trail);
  });

  app.delete("/api/trails/:id", requireRole(["admin"]), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid trail ID" });
    }
    await storage.deleteTrail(id);
    res.sendStatus(204);
  });

  // Existing routes with added auth where needed
  app.get("/api/trails", async (_req, res) => {
    const trails = await storage.getTrails();
    res.json(trails);
  });

  app.get("/api/trails/search", async (req, res) => {
    const query = req.query.q as string;
    const trails = await storage.searchTrails(query);
    res.json(trails);
  });

  app.get("/api/trails/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid trail ID" });
    }
    const trail = await storage.getTrailById(id);
    if (!trail) {
      return res.status(404).send("Trail not found");
    }
    res.json(trail);
  });

  app.post("/api/trails/:id/ai-description", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid trail ID" });
    }
    const trail = await storage.getTrailById(id);
    if (!trail) {
      return res.status(404).send("Trail not found");
    }
    const description = await generateTrailDescription(trail);
    res.json({ description });
  });

  app.post("/api/trails/:id/gear", requireAuth, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid trail ID" });
    }
    const trail = await storage.getTrailById(id);
    if (!trail) {
      return res.status(404).send("Trail not found");
    }
    const gearList = await generateGearList(trail);
    res.json({ gearList });
  });

  const httpServer = createServer(app);
  return httpServer;
}