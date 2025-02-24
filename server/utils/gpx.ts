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

    // Parse XML
    const doc = create(gpxContent);
    const root = doc.root();

    // Get all waypoints
    const waypoints: GpxPoint[] = [];
    root.each((node) => {
      if (node.node.nodeName === 'wpt') {
        const lat = parseFloat(node.attribute('lat')?.value || '');
        const lon = parseFloat(node.attribute('lon')?.value || '');

        if (!isNaN(lat) && !isNaN(lon)) {
          waypoints.push({ lat, lon });
        }
      }
    });

    if (waypoints.length === 0) {
      throw new Error("No valid waypoints found in GPX file");
    }

    // Get metadata
    let name: string | undefined;
    let description: string | undefined;

    root.each((node) => {
      if (node.node.nodeName === 'name') {
        name = node.value();
      } else if (node.node.nodeName === 'desc') {
        description = node.value();
      }
    });

    // Format coordinates
    const mainCoords = `${waypoints[0].lat},${waypoints[0].lon}`;
    const pathCoords = waypoints.map(p => `${p.lat},${p.lon}`).join(';');

    return {
      coordinates: mainCoords,
      pathCoordinates: pathCoords,
      name,
      description
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