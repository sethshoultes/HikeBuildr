import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { generateTrailDescription, generateGearList } from "./openai";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

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
