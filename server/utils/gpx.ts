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
  try {
    console.log("Parsing GPX content:", gpxContent.substring(0, 200) + "..."); // Log first 200 chars

    // Parse XML directly instead of using gpxparser
    const doc = create(gpxContent);
    const gpx = doc.root();

    // Extract waypoints
    const waypoints = gpx.find('//wpt');
    console.log("Found waypoints:", waypoints.length);

    if (!waypoints.length) {
      throw new Error("No waypoints found in GPX file");
    }

    // Extract coordinates from waypoints
    const coordinates = waypoints.map(wpt => {
      const lat = wpt.attr('lat')?.value;
      const lon = wpt.attr('lon')?.value;
      if (!lat || !lon) {
        throw new Error("Invalid waypoint coordinates");
      }
      return { lat, lon };
    });

    // Use first waypoint as main coordinate
    const mainCoords = `${coordinates[0].lat},${coordinates[0].lon}`;

    // Use all waypoints as path
    const pathCoords = coordinates.map(c => `${c.lat},${c.lon}`).join(';');

    // Try to get name and description from metadata
    const name = gpx.find('//metadata/name')?.first()?.value || 
                gpx.find('//name')?.first()?.value || '';

    const description = gpx.find('//metadata/desc')?.first()?.value || 
                       gpx.find('//desc')?.first()?.value || '';

    return {
      coordinates: mainCoords,
      pathCoordinates: pathCoords,
      name: name || undefined,
      description: description || undefined
    };
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