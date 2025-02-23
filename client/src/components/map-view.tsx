import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Trail } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Map, Edit3, Save } from "lucide-react";

interface MapViewProps {
  trails: Trail[];
  centered?: boolean;
  onTrailClick?: (trail: Trail) => void;
  onTrailEdit?: (trailId: number, coordinates: string) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export function MapView({ trails, centered = false, onTrailClick, onTrailEdit }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["drawing"],
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
              draggable: isEditing,
            });

            marker.addListener("click", () => {
              if (!isEditing && onTrailClick) {
                onTrailClick(trail);
              }
            });

            if (isEditing) {
              marker.addListener("dragend", () => {
                const newPosition = marker.getPosition();
                if (newPosition && onTrailEdit) {
                  onTrailEdit(trail.id, `${newPosition.lat()},${newPosition.lng()}`);
                }
              });
            }

            markersRef.current.push(marker);
          });

          if (!centered && trails.length > 1) {
            googleMapRef.current?.fitBounds(bounds);
          }
        }

        // Set up drawing manager for edit mode
        if (isAdmin) {
          drawingManagerRef.current = new google.maps.drawing.DrawingManager({
            drawingMode: isEditing ? google.maps.drawing.OverlayType.MARKER : null,
            drawingControl: isEditing,
            drawingControlOptions: {
              position: google.maps.ControlPosition.TOP_CENTER,
              drawingModes: [google.maps.drawing.OverlayType.MARKER],
            },
          });

          drawingManagerRef.current.setMap(googleMapRef.current);

          // Handle new marker creation
          if (isEditing) {
            google.maps.event.addListener(drawingManagerRef.current, "markercomplete", (marker: google.maps.Marker) => {
              const position = marker.getPosition();
              if (position && onTrailEdit) {
                // For new trails, we'll pass id as -1
                onTrailEdit(-1, `${position.lat()},${position.lng()}`);
                marker.setMap(null); // Remove temporary marker
              }
            });
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
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
      }
    };
  }, [trails, centered, isEditing, onTrailClick, onTrailEdit]);

  if (!isAdmin) {
    return (
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg border border-border shadow-sm"
      />
    );
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg border border-border shadow-sm"
      />
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant={isEditing ? "destructive" : "secondary"}
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? (
            <>
              <Map className="h-4 w-4 mr-2" />
              View Mode
            </>
          ) : (
            <>
              <Edit3 className="h-4 w-4 mr-2" />
              Edit Mode
            </>
          )}
        </Button>
      </div>
    </div>
  );
}