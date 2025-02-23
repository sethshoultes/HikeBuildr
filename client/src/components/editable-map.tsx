import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Trail } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Map, Edit3 } from "lucide-react";

interface EditableMapProps {
  trail?: Trail;
  onCoordinatesChange: (coordinates: string) => void;
}

export function EditableMap({ trail, onCoordinatesChange }: EditableMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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
        let center = defaultCenter;

        if (trail?.coordinates) {
          const [latStr, lngStr] = trail.coordinates.split(",");
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          if (!isNaN(lat) && !isNaN(lng)) {
            center = { lat, lng };
          }
        }

        googleMapRef.current = new google.maps.Map(mapRef.current, {
          zoom: 10,
          center,
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

        // Set up drawing manager
        drawingManagerRef.current = new google.maps.drawing.DrawingManager({
          drawingMode: google.maps.drawing.OverlayType.MARKER,
          drawingControl: isEditing,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              google.maps.drawing.OverlayType.MARKER,
              google.maps.drawing.OverlayType.POLYLINE,
            ],
          },
        });

        drawingManagerRef.current.setMap(googleMapRef.current);

        // Add existing marker if coordinates exist
        if (trail?.coordinates) {
          const [latStr, lngStr] = trail.coordinates.split(",");
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          if (!isNaN(lat) && !isNaN(lng)) {
            markerRef.current = new google.maps.Marker({
              position: { lat, lng },
              map: googleMapRef.current,
              draggable: true,
            });

            markerRef.current.addListener("dragend", () => {
              const position = markerRef.current?.getPosition();
              if (position) {
                onCoordinatesChange(`${position.lat()},${position.lng()}`);
              }
            });
          }
        }

        // Handle new marker creation
        google.maps.event.addListener(drawingManagerRef.current, "markercomplete", (marker: google.maps.Marker) => {
          // Remove old marker if it exists
          if (markerRef.current) {
            markerRef.current.setMap(null);
          }

          markerRef.current = marker;
          marker.setDraggable(true);

          const position = marker.getPosition();
          if (position) {
            onCoordinatesChange(`${position.lat()},${position.lng()}`);
          }

          marker.addListener("dragend", () => {
            const newPosition = marker.getPosition();
            if (newPosition) {
              onCoordinatesChange(`${newPosition.lat()},${newPosition.lng()}`);
            }
          });
        });

      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });

    return () => {
      mounted = false;
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
      }
    };
  }, [trail, isEditing, onCoordinatesChange]);

  return (
    <div className="w-full h-full">
      <div
        ref={mapRef}
        className="w-full h-[600px] rounded-lg border border-border shadow-sm"
      />
      <div className="mt-4 flex justify-end">
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
