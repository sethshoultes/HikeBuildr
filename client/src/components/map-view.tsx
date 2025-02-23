import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Trail } from "@shared/schema";

interface MapViewProps {
  trails: Trail[];
  centered?: boolean;
}

declare global {
  interface Window {
    google: any;
  }
}

export function MapView({ trails, centered = false }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: "weekly",
    });

    let mounted = true;

    loader
      .load()
      .then((google) => {
        if (!mounted || !mapRef.current) return;

        const defaultCenter = { lat: 37.7749, lng: -122.4194 };
        googleMapRef.current = new google.maps.Map(mapRef.current, {
          zoom: 10,
          center: defaultCenter,
          styles: [
            {
              featureType: "poi.park",
              elementType: "geometry",
              stylers: [{ color: "#c8e6c9" }],
            },
            {
              featureType: "landscape.natural",
              elementType: "geometry",
              stylers: [{ color: "#e8f5e9" }],
            },
          ],
        });

        if (trails.length > 0) {
          const bounds = new google.maps.LatLngBounds();

          // Clear existing markers
          markersRef.current.forEach(marker => marker.setMap(null));
          markersRef.current = [];

          trails.forEach((trail) => {
            const [lat, lng] = trail.coordinates.split(",").map(Number);
            const position = { lat, lng };

            if (centered) {
              googleMapRef.current?.setCenter(position);
            } else {
              bounds.extend(position);
            }

            const marker = new google.maps.Marker({
              position,
              map: googleMapRef.current,
              title: trail.name,
            });
            markersRef.current.push(marker);
          });

          if (!centered && trails.length > 1) {
            googleMapRef.current?.fitBounds(bounds);
          }
        }
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });

    return () => {
      mounted = false;
      // Clear markers on cleanup
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [trails, centered]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg border border-border shadow-sm"
    />
  );
}