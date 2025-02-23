import OpenAI from "openai";
import type { Trail } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateTrailDescription(trail: Trail): Promise<string> {
  const prompt = `Generate a detailed description for this hiking trail:
Name: ${trail.name}
Location: ${trail.location}
Distance: ${trail.distance}
Duration: ${trail.duration}
Difficulty: ${trail.difficulty}

Please provide a natural, engaging description that highlights unique features, views, and what makes this trail special.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const content = response.choices[0].message.content;
  return content ?? "No description available";
}

export async function generateGearList(trail: Trail): Promise<string[]> {
  const prompt = `Generate a recommended gear list for this hiking trail:
Name: ${trail.name}
Difficulty: ${trail.difficulty}
Distance: ${trail.distance}
Duration: ${trail.duration}

Provide a JSON array of essential gear items needed for this specific hike.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  try {
    const content = response.choices[0].message.content;
    if (!content) {
      return ["Basic hiking shoes", "Water bottle", "Snacks", "Sun protection"];
    }
    const result = JSON.parse(content);
    return result.gear || [];
  } catch (error) {
    return ["Basic hiking shoes", "Water bottle", "Snacks", "Sun protection"];
  }
}