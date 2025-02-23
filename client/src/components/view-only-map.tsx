import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Trail } from "@shared/schema";

interface ViewOnlyMapProps {
  trails: Trail[];
  onTrailClick?: (trail: Trail) => void;
}

export function ViewOnlyMap({ trails, onTrailClick }: ViewOnlyMapProps) {
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
          zoomControl: true,
          mapTypeControl: true,
          scaleControl: true,
          streetViewControl: true,
          rotateControl: true,
          fullscreenControl: true
        });

        if (trails.length > 0) {
          const bounds = new google.maps.LatLngBounds();

          // Clear existing markers
          markersRef.current.forEach(marker => marker.setMap(null));
          markersRef.current = [];

          trails.forEach((trail) => {
            try {
              const [latStr, lngStr] = trail.coordinates.split(",");
              const lat = parseFloat(latStr);
              const lng = parseFloat(lngStr);

              if (isNaN(lat) || isNaN(lng)) {
                console.warn(`Invalid coordinates for trail ${trail.id}: ${trail.coordinates}`);
                return;
              }

              const position = { lat, lng };
              bounds.extend(position);

              const marker = new google.maps.Marker({
                position,
                map: googleMapRef.current,
                title: trail.name,
              });

              marker.addListener("click", () => {
                if (onTrailClick) {
                  onTrailClick(trail);
                }
              });

              markersRef.current.push(marker);
            } catch (error) {
              console.warn(`Error processing trail ${trail.id}:`, error);
            }
          });

          if (markersRef.current.length > 0) {
            googleMapRef.current?.fitBounds(bounds);
          }
        }
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });

    return () => {
      mounted = false;
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [trails, onTrailClick]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[600px] rounded-lg border border-border shadow-sm"
    />
  );
}
