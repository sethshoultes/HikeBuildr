import { useEffect, useRef, useState } from "react";
import { Trail } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Map, Edit3 } from "lucide-react";
import { mapLoader } from "@/lib/map-loader";

interface EditableMapProps {
  trail?: Trail;
  onCoordinatesChange: (coordinates: string) => void;
  onPathCoordinatesChange: (pathCoordinates: string) => void;
}

// Helper function to validate and parse coordinates
const parseCoordinates = (coordString: string): { lat: number; lng: number } | null => {
  if (!coordString) return null;

  try {
    const parts = coordString.split(",").map(s => s.trim());
    if (parts.length !== 2) return null;

    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);

    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return null;
  } catch (error) {
    console.warn("Invalid coordinate format:", error);
    return null;
  }
};

export function EditableMap({ trail, onCoordinatesChange, onPathCoordinatesChange }: EditableMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Initialize map and drawing manager once
  useEffect(() => {
    let mounted = true;

    mapLoader
      .load()
      .then((google) => {
        if (!mounted || !mapRef.current) return;

        // Initialize map
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
          mapTypeId: google.maps.MapTypeId.TERRAIN,
          zoomControl: true,
          mapTypeControl: true,
          scaleControl: true,
          streetViewControl: true,
          rotateControl: true,
          fullscreenControl: true,
        });

        // Initialize drawing manager (always present, but controls visibility toggled by edit mode)
        drawingManagerRef.current = new google.maps.drawing.DrawingManager({
          drawingMode: null,
          drawingControl: false, // Start with controls hidden
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              google.maps.drawing.OverlayType.MARKER,
              google.maps.drawing.OverlayType.POLYLINE,
            ],
          },
          markerOptions: { draggable: true },
          polylineOptions: {
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2,
            editable: true
          }
        });

        drawingManagerRef.current.setMap(googleMapRef.current);

        // Handle marker creation
        google.maps.event.addListener(drawingManagerRef.current, "markercomplete", (marker: google.maps.Marker) => {
          if (markerRef.current) {
            markerRef.current.setMap(null);
          }
          markerRef.current = marker;

          const position = marker.getPosition();
          if (position) {
            onCoordinatesChange(`${position.lat()},${position.lng()}`);
          }

          // Add drag listener
          marker.addListener("dragend", () => {
            const newPosition = marker.getPosition();
            if (newPosition) {
              onCoordinatesChange(`${newPosition.lat()},${newPosition.lng()}`);
            }
          });
        });

        // Handle polyline creation
        google.maps.event.addListener(drawingManagerRef.current, 'polylinecomplete', (polyline: google.maps.Polyline) => {
          if (polylineRef.current) {
            polylineRef.current.setMap(null);
          }
          polylineRef.current = polyline;

          const path = polyline.getPath().getArray().map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`).join(';');
          onPathCoordinatesChange(path);

          // Add path update listener
          google.maps.event.addListener(polyline.getPath(), 'set_at', () => {
            const newPath = polyline.getPath().getArray().map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`).join(';');
            onPathCoordinatesChange(newPath);
          });
        });
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });

    return () => {
      mounted = false;
      if (markerRef.current) markerRef.current.setMap(null);
      if (polylineRef.current) polylineRef.current.setMap(null);
      if (drawingManagerRef.current) drawingManagerRef.current.setMap(null);
    };
  }, []); // Only run once on mount

  // Toggle drawing controls based on edit mode
  useEffect(() => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({
        drawingControl: isEditing
      });
    }

    // Update marker draggability
    if (markerRef.current) {
      markerRef.current.setDraggable(isEditing);
    }

    // Update polyline editability
    if (polylineRef.current) {
      polylineRef.current.setEditable(isEditing);
    }
  }, [isEditing]);

  // Handle coordinate updates
  useEffect(() => {
    if (!googleMapRef.current || !trail?.coordinates) {
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      return;
    }

    const coords = parseCoordinates(trail.coordinates);
    if (!coords) {
      console.warn("Invalid coordinates:", trail.coordinates);
      return;
    }

    if (markerRef.current) {
      markerRef.current.setPosition(coords);
    } else {
      markerRef.current = new google.maps.Marker({
        position: coords,
        map: googleMapRef.current,
        draggable: isEditing,
      });

      markerRef.current.addListener("dragend", () => {
        const position = markerRef.current?.getPosition();
        if (position) {
          onCoordinatesChange(`${position.lat()},${position.lng()}`);
        }
      });
    }

    // Center map on marker
    googleMapRef.current.setCenter(coords);
    googleMapRef.current.setZoom(15);
  }, [trail?.coordinates, isEditing]);

  // Handle path coordinate updates
  useEffect(() => {
    if (!googleMapRef.current) return;

    if (!trail?.pathCoordinates) {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
      return;
    }

    try {
      const pathPoints = trail.pathCoordinates.split(';').map(coord => {
        const [lat, lng] = coord.split(',').map(Number);
        if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid path coordinates');
        return new google.maps.LatLng(lat, lng);
      });

      if (polylineRef.current) {
        polylineRef.current.setPath(pathPoints);
      } else {
        polylineRef.current = new google.maps.Polyline({
          path: pathPoints,
          strokeColor: '#FF0000',
          strokeOpacity: 1.0,
          strokeWeight: 2,
          editable: isEditing,
          map: googleMapRef.current
        });

        google.maps.event.addListener(polylineRef.current.getPath(), 'set_at', () => {
          const newPath = polylineRef.current?.getPath().getArray().map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`).join(';');
          if (newPath) {
            onPathCoordinatesChange(newPath);
          }
        });
      }
    } catch (error) {
      console.warn('Error setting path coordinates:', error);
    }
  }, [trail?.pathCoordinates, isEditing]);

  return (
    <div className="flex flex-col h-full">
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