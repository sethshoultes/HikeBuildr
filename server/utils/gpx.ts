import { create } from "xmlbuilder2";
import { XMLParser } from 'fast-xml-parser';

interface GpxPoint {
  lat: number;
  lon: number;
  ele?: number;
  name?: string;
  desc?: string;
}

export function parseGpxFile(gpxContent: string): { 
  coordinates: string, 
  pathCoordinates: string,
  name?: string,
  description?: string
} {
  try {
    console.log("Parsing GPX content:", gpxContent.substring(0, 200) + "...");

    // Parse XML with namespace awareness
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      removeNSPrefix: true
    });

    const result = parser.parse(gpxContent);

    if (!result.gpx) {
      throw new Error("Invalid GPX file: Missing root gpx element");
    }

    // Extract waypoints
    const waypoints: GpxPoint[] = [];
    if (result.gpx.wpt) {
      // Handle single waypoint case
      const wpts = Array.isArray(result.gpx.wpt) ? result.gpx.wpt : [result.gpx.wpt];

      wpts.forEach((wpt: any) => {
        if (wpt['@_lat'] && wpt['@_lon']) {
          waypoints.push({
            lat: parseFloat(wpt['@_lat']),
            lon: parseFloat(wpt['@_lon']),
            ele: wpt.ele ? parseFloat(wpt.ele) : undefined,
            name: wpt.name,
            desc: wpt.desc
          });
        }
      });
    }

    if (waypoints.length === 0) {
      throw new Error("No valid waypoints found in GPX file");
    }

    // Extract metadata
    let name = undefined;
    let description = undefined;

    if (result.gpx.metadata) {
      name = result.gpx.metadata.name;
      description = result.gpx.metadata.desc;
    }

    // Use first waypoint name/desc if metadata is not available
    if (!name && waypoints[0].name) {
      name = waypoints[0].name;
    }
    if (!description && waypoints[0].desc) {
      description = waypoints[0].desc;
    }

    // Format coordinates
    const mainCoords = `${waypoints[0].lat},${waypoints[0].lon}`;
    const pathCoords = waypoints.map(p => `${p.lat},${p.lon}`).join(';');

    console.log("Successfully parsed waypoints:", waypoints.length);
    console.log("Main coordinates:", mainCoords);

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
  metadata
    .ele('time').txt(new Date().toISOString()).up()
    .ele('name').txt(trailName).up();

  if (description) {
    metadata.ele('desc').txt(description);
  }

  // Add waypoints from path coordinates
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

      wpt
        .ele('name').txt(`WPT${index + 1}`).up()
        .ele('desc').txt(`Waypoint ${index + 1}`).up()
        .ele('sym').txt('Waypoint');
    });
  }

  return doc.end({ prettyPrint: true });
}