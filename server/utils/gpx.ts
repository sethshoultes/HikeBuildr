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

  try {
    console.log("Parsing GPX content:", gpxContent.substring(0, 200) + "..."); // Log first 200 chars
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

    // Try to get coordinates from waypoints first
    if (gpx.waypoints && gpx.waypoints.length > 0) {
      console.log("Found waypoints:", gpx.waypoints.length);
      // Use first waypoint as main coordinate
      coordinates = `${gpx.waypoints[0].lat},${gpx.waypoints[0].lon}`;
      // Use all waypoints for the path
      pathCoordinates = gpx.waypoints.map(p => `${p.lat},${p.lon}`).join(';');

      // If first waypoint has a name/description, use it for the trail
      if (gpx.waypoints[0].name) name = gpx.waypoints[0].name;
      if (gpx.waypoints[0].desc) description = gpx.waypoints[0].desc;
    }
    // If no waypoints found, try tracks
    else if (gpx.tracks.length > 0) {
      console.log("Found tracks:", gpx.tracks.length);
      const track = gpx.tracks[0];
      if (track.name) name = track.name;
      if (track.desc) description = track.desc;

      const points = track.points;
      if (points.length > 0) {
        coordinates = `${points[0].lat},${points[0].lon}`;
        pathCoordinates = points.map(p => `${p.lat},${p.lon}`).join(';');
      }
    }
    // If no tracks found, try routes
    else if (gpx.routes.length > 0) {
      console.log("Found routes:", gpx.routes.length);
      const route = gpx.routes[0];
      if (route.name) name = route.name;
      if (route.desc) description = route.desc;

      const points = route.points;
      if (points.length > 0) {
        coordinates = `${points[0].lat},${points[0].lon}`;
        pathCoordinates = points.map(p => `${p.lat},${p.lon}`).join(';');
      }
    }

    // Validate the parsed data
    if (!coordinates || !pathCoordinates) {
      console.error("No valid coordinates found in GPX data");
      console.log("Waypoints:", gpx.waypoints);
      console.log("Tracks:", gpx.tracks);
      console.log("Routes:", gpx.routes);
      throw new Error("No valid coordinates found in GPX file");
    }

    console.log("Successfully parsed coordinates:", coordinates);
    console.log("Path coordinates count:", pathCoordinates.split(';').length);

    return { coordinates, pathCoordinates, name, description };
  } catch (error) {
    console.error("GPX parsing error:", error);
    throw error;
  }
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

  // Add waypoints for each point in the path
  if (pathCoordinates) {
    const points = pathCoordinates.split(';').map(coord => {
      const [lat, lon] = coord.split(',').map(Number);
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error(`Invalid coordinates format: ${coord}`);
      }
      return { lat, lon };
    });

    points.forEach((point, index) => {
      const wpt = doc.ele('wpt', { lat: point.lat, lon: point.lon });
      if (elevation) {
        wpt.ele('ele').txt(elevation);
      }
      wpt.ele('name').txt(`WPT${index + 1}`);
      wpt.ele('desc').txt(`Waypoint ${index + 1}`);
      wpt.ele('sym').txt('Waypoint');
      wpt.ele('type').txt('Waypoint');
    });
  }

  return doc.end({ prettyPrint: true });
}