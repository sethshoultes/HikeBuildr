import Parser from "gpxparser";
import { create } from "xmlbuilder2";

interface GpxPoint {
  lat: number;
  lon: number;
}

export function parseGpxFile(gpxContent: string): { 
  coordinates: string, 
  pathCoordinates: string,
  name?: string,
  description?: string
} {
  const gpx = new Parser();
  gpx.parse(gpxContent);

  let coordinates = "";
  let pathCoordinates = "";
  let name = "";
  let description = "";

  // Extract metadata if available
  if (gpx.metadata) {
    name = gpx.metadata.name || "";
    description = gpx.metadata.desc || "";
  }

  // Try to get coordinates from tracks first
  if (gpx.tracks.length > 0) {
    const track = gpx.tracks[0];
    if (track.name) name = track.name;
    if (track.desc) description = track.desc;

    const points = track.points;
    if (points.length > 0) {
      // Use first point as main coordinate
      coordinates = `${points[0].lat},${points[0].lon}`;
      // Use all points for the path
      pathCoordinates = points.map(p => `${p.lat},${p.lon}`).join(';');
    }
  }
  // If no tracks found, try routes
  else if (gpx.routes.length > 0) {
    const route = gpx.routes[0];
    if (route.name) name = route.name;
    if (route.desc) description = route.desc;

    const points = route.points;
    if (points.length > 0) {
      coordinates = `${points[0].lat},${points[0].lon}`;
      pathCoordinates = points.map(p => `${p.lat},${p.lon}`).join(';');
    }
  }
  // If no tracks or routes found, try waypoints
  else if (gpx.waypoints.length > 0) {
    coordinates = `${gpx.waypoints[0].lat},${gpx.waypoints[0].lon}`;
    pathCoordinates = gpx.waypoints.map(p => `${p.lat},${p.lon}`).join(';');
  }

  if (!coordinates || !pathCoordinates) {
    throw new Error("No valid coordinates found in GPX file");
  }

  return { coordinates, pathCoordinates, name, description };
}

export function generateGpxFile(
  coordinates: string,
  pathCoordinates: string | null,
  trailName: string,
  description?: string,
  elevation?: string,
  distance?: string
): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('gpx', {
      version: '1.1',
      creator: 'Trail Explorer',
      xmlns: 'http://www.topografix.com/GPX/1/1',
      'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
      'xsi:schemaLocation': 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd'
    });

  // Add metadata
  const metadata = doc.ele('metadata');
  metadata.ele('time').txt(new Date().toISOString());
  metadata.ele('name').txt(trailName);
  if (description) {
    metadata.ele('desc').txt(description);
  }

  // Add track
  const trk = doc.ele('trk');
  trk.ele('name').txt(trailName);
  if (description) {
    trk.ele('desc').txt(description);
  }

  // Add track metadata if available
  if (distance) {
    trk.ele('extensions')
       .ele('length').txt(distance);
  }

  const trkseg = trk.ele('trkseg');

  // Add path points
  if (pathCoordinates) {
    const points = pathCoordinates.split(';').map(coord => {
      const [lat, lon] = coord.split(',').map(Number);
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error(`Invalid coordinates format: ${coord}`);
      }
      return { lat, lon };
    });

    points.forEach(point => {
      const trkpt = trkseg.ele('trkpt', { lat: point.lat, lon: point.lon });
      if (elevation) {
        trkpt.ele('ele').txt(elevation);
      }
    });
  } else if (coordinates) {
    // If no path coordinates, use the main coordinate
    const [lat, lon] = coordinates.split(',').map(Number);
    if (isNaN(lat) || isNaN(lon)) {
      throw new Error(`Invalid coordinates format: ${coordinates}`);
    }
    const trkpt = trkseg.ele('trkpt', { lat, lon });
    if (elevation) {
      trkpt.ele('ele').txt(elevation);
    }
  }

  return doc.end({ prettyPrint: true });
}