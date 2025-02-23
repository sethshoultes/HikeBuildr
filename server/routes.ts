import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateTrailDescription, generateGearList } from "./openai";
import os from "os";

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

  // Admin routes
  app.get("/api/admin/logs", (_req, res) => {
    res.json(apiLogs);
  });

  app.get("/api/admin/errors", (_req, res) => {
    res.json(errorLogs);
  });

  app.get("/api/admin/status", (_req, res) => {
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

  // Existing routes
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
    const trail = await storage.getTrailById(parseInt(req.params.id));
    if (!trail) {
      return res.status(404).send("Trail not found");
    }
    res.json(trail);
  });

  app.post("/api/trails/:id/ai-description", async (req, res) => {
    const trail = await storage.getTrailById(parseInt(req.params.id));
    if (!trail) {
      return res.status(404).send("Trail not found");
    }
    const description = await generateTrailDescription(trail);
    res.json({ description });
  });

  app.post("/api/trails/:id/gear", async (req, res) => {
    const trail = await storage.getTrailById(parseInt(req.params.id));
    if (!trail) {
      return res.status(404).send("Trail not found");
    }
    const gearList = await generateGearList(trail);
    res.json({ gearList });
  });

  const httpServer = createServer(app);
  return httpServer;
}