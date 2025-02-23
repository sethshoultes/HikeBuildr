import Parser from "gpxparser";
import { create } from "xmlbuilder2";

interface GpxPoint {
  lat: number;
  lon: number;
}

export function parseGpxFile(gpxContent: string): { coordinates: string, pathCoordinates: string } {
  const gpx = new Parser();
  gpx.parse(gpxContent);

  // Get the first track/route point as the main coordinate
  const firstPoint = gpx.tracks[0]?.points[0] || gpx.routes[0]?.points[0];
  const coordinates = firstPoint ? `${firstPoint.lat},${firstPoint.lon}` : "";

  // Get all points as path coordinates
  const points = gpx.tracks[0]?.points || gpx.routes[0]?.points || [];
  const pathCoordinates = points.map(p => `${p.lat},${p.lon}`).join(";");

  return { coordinates, pathCoordinates };
}

export function generateGpxFile(coordinates: string, pathCoordinates?: string | null): string {
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('gpx', {
      version: '1.1',
      creator: 'Trail Explorer',
      xmlns: 'http://www.topografix.com/GPX/1/1'
    });

  // Add track
  const trk = doc.ele('trk');
  trk.ele('name').txt('Trail Path');
  const trkseg = trk.ele('trkseg');

  // Add path points
  if (pathCoordinates) {
    const points = pathCoordinates.split(';').map(coord => {
      const [lat, lon] = coord.split(',').map(Number);
      return { lat, lon };
    });

    points.forEach(point => {
      trkseg.ele('trkpt', { lat: point.lat, lon: point.lon });
    });
  } else if (coordinates) {
    // If no path coordinates, use the main coordinate
    const [lat, lon] = coordinates.split(',').map(Number);
    trkseg.ele('trkpt', { lat, lon });
  }

  return doc.end({ prettyPrint: true });
}