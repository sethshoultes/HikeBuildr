import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { OpenAI } from "openai"; // Add OpenAI import
import { generateTrailDescription, generateGearList } from "./openai";
import { requireAuth, requireRole } from "./middleware/auth";
import { insertTrailSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { parseGpxFile, generateGpxFile } from "./utils/gpx";
import multer from "multer";

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

interface AuthenticatedRequest extends Request {
  user: Express.User & {
    id: number;
    username: string;
    role: string;
  };
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
  app.use((err: Error, req: Request, res: Express.Response, next: Express.NextFunction) => {
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

  // API Settings management
  app.get("/api/admin/settings", requireRole(["admin"]), async (_req, res) => {
    try {
      const settings = await storage.getApiSettings();
      res.json(settings);
    } catch (error) {
      console.error('Error fetching API settings:', error);
      res.status(500).json({ message: "Failed to fetch API settings" });
    }
  });

  app.patch("/api/admin/settings/:id", requireRole(["admin"]), async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid setting ID" });
      }

      const setting = await storage.updateApiSetting(id, {
        ...req.body,
        lastUpdatedById: req.user.id,
      });

      if (!setting) {
        return res.status(404).json({ message: "Setting not found" });
      }

      res.json(setting);
    } catch (error) {
      console.error('Error updating API setting:', error);
      res.status(500).json({ message: "Failed to update API setting" });
    }
  });

  app.post("/api/admin/settings/validate/:provider", requireRole(["admin"]), async (req, res) => {
    try {
      const { provider } = req.params;
      const setting = await storage.getApiSettingByProvider(provider);

      if (!setting) {
        return res.status(404).json({ message: "API setting not found" });
      }

      let isValid = false;
      let message = "";

      if (provider === "openai") {
        try {
          const openai = new OpenAI({ apiKey: setting.apiKey });
          const response = await openai.chat.completions.create({
            model: setting.model || "gpt-4",
            messages: [{ role: "user", content: "Test connection" }],
            max_tokens: 5
          });
          isValid = !!response;
          message = "OpenAI API connection successful";
        } catch (error: any) {
          message = `OpenAI API validation failed: ${error.message}`;
        }
      } else if (provider === "gemini") {
        // Add Gemini API validation here when implemented
        message = "Gemini API validation not implemented yet";
      }

      if (isValid) {
        await storage.updateApiSetting(setting.id, {
          lastValidated: new Date(),
          lastUpdatedById: (req as AuthenticatedRequest).user.id,
        });
      }

      res.json({
        success: isValid,
        message,
      });
    } catch (error: any) {
      console.error('Error validating API:', error);
      res.status(500).json({ message: "Failed to validate API" });
    }
  });


  // Trail management routes
  app.post("/api/trails", requireRole(["admin", "guide"]), async (req: AuthenticatedRequest, res) => {
    try {
      const validatedData = insertTrailSchema.parse({
        ...req.body,
        createdById: req.user.id,
        lastUpdatedById: req.user.id,
      });

      const trail = await storage.createTrail(validatedData);
      res.status(201).json(trail);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/trails/:id", requireRole(["admin", "guide"]), async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid trail ID" });
      }

      const validatedData = insertTrailSchema.partial().parse({
        ...req.body,
        lastUpdatedById: req.user.id,
      });

      const trail = await storage.updateTrail(id, validatedData);
      if (!trail) {
        return res.status(404).json({ message: "Trail not found" });
      }
      res.json(trail);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/trails/:id", requireRole(["admin"]), async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid trail ID" });
    }
    await storage.deleteTrail(id);
    res.sendStatus(204);
  });

  // Public routes
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
      return res.status(404).json({ message: "Trail not found" });
    }
    res.json(trail);
  });

  // AI features (protected)
  app.post("/api/trails/:id/ai-description", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid trail ID" });
      }
      const trail = await storage.getTrailById(id);
      if (!trail) {
        return res.status(404).json({ message: "Trail not found" });
      }
      const description = await generateTrailDescription(trail);
      res.json({ description });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate description" });
    }
  });

  app.post("/api/trails/:id/gear", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid trail ID" });
      }
      const trail = await storage.getTrailById(id);
      if (!trail) {
        return res.status(404).json({ message: "Trail not found" });
      }
      const gearList = await generateGearList(trail);
      res.json({ gearList });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate gear list" });
    }
  });

  // Set up multer for file uploads
  const upload = multer({ storage: multer.memoryStorage() });

  // GPX file upload
  app.post("/api/trails/:id/gpx", requireRole(["admin", "guide"]), upload.single('gpx'), async (req: AuthenticatedRequest, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid trail ID" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No GPX file provided" });
      }

      if (!req.file.buffer) {
        return res.status(400).json({ message: "Invalid file format" });
      }

      const gpxContent = req.file.buffer.toString('utf-8');

      let coordinates: string;
      let pathCoordinates: string;
      let name: string | undefined;
      let description: string | undefined;

      try {
        const result = parseGpxFile(gpxContent);
        coordinates = result.coordinates;
        pathCoordinates = result.pathCoordinates;
        name = result.name;
        description = result.description;
      } catch (parseError) {
        console.error("GPX parsing error:", parseError);
        return res.status(400).json({ message: "Failed to parse GPX file: " + (parseError as Error).message });
      }

      // Validate the parsed coordinates
      if (!coordinates || !pathCoordinates) {
        return res.status(400).json({ message: "No valid coordinates found in GPX file" });
      }

      const trail = await storage.updateTrail(id, {
        coordinates,
        pathCoordinates,
        name: name || undefined,
        description: description || undefined,
        lastUpdatedById: req.user.id,
      });

      if (!trail) {
        return res.status(404).json({ message: "Trail not found" });
      }

      res.json(trail);
    } catch (error) {
      console.error("GPX upload error:", error);
      res.status(500).json({ message: "Failed to process GPX file" });
    }
  });

  // GPX file download
  app.get("/api/trails/:id/gpx", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid trail ID" });
      }

      const trail = await storage.getTrailById(id);
      if (!trail) {
        return res.status(404).json({ message: "Trail not found" });
      }

      const gpxContent = generateGpxFile(
        trail.coordinates,
        trail.pathCoordinates,
        trail.name,
        trail.description,
        trail.elevation,
        trail.distance
      );

      res.setHeader('Content-Type', 'application/gpx+xml');
      res.setHeader('Content-Disposition', `attachment; filename="trail-${id}.gpx"`);
      res.send(gpxContent);
    } catch (error) {
      console.error("GPX download error:", error);
      res.status(400).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}