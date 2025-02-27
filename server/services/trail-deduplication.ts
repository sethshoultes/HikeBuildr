import type { Trail } from "@shared/schema";

interface Coordinate {
  lat: number;
  lng: number;
}

function parseCoordinates(coordString: string): Coordinate {
  const [lat, lng] = coordString.split(',').map(Number);
  return { lat, lng };
}

function calculateDistance(coord1: Coordinate, coord2: Coordinate): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (coord1.lat * Math.PI) / 180;
  const φ2 = (coord2.lat * Math.PI) / 180;
  const Δφ = ((coord2.lat - coord1.lat) * Math.PI) / 180;
  const Δλ = ((coord2.lng - coord1.lng) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function findSimilarTrails(newTrail: Partial<Trail>, existingTrails: Trail[]): Trail[] {
  if (!newTrail.coordinates || !existingTrails.length) return [];

  const newCoords = parseCoordinates(newTrail.coordinates);
  const maxDistance = 1000; // 1km radius for similarity check

  return existingTrails.filter(trail => {
    // Skip comparing with self
    if (trail.id === newTrail.id) return false;

    // Basic coordinate similarity check
    const trailCoords = parseCoordinates(trail.coordinates);
    const distance = calculateDistance(newCoords, trailCoords);
    
    // Check if trails are within maxDistance and have similar characteristics
    return distance <= maxDistance && (
      trail.name.toLowerCase().includes(newTrail.name?.toLowerCase() || '') ||
      trail.difficulty === newTrail.difficulty ||
      trail.distance === newTrail.distance
    );
  });
}

export function generateSimilarityWarning(similarTrails: Trail[]): string | null {
  if (!similarTrails.length) return null;

  return `Found ${similarTrails.length} similar trail${similarTrails.length > 1 ? 's' : ''} nearby:
${similarTrails.map(trail => `- ${trail.name} (${trail.distance}, ${trail.difficulty})`).join('\n')}`;
}
