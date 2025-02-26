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

export function EditableMap({ trail, onCoordinatesChange, onPathCoordinatesChange }: EditableMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [lastCoordinates, setLastCoordinates] = useState<string | undefined>(undefined);

  // Initialize map and update marker when coordinates change
  useEffect(() => {
    let mounted = true;

    // Only update if coordinates have changed
    if (trail?.coordinates === lastCoordinates) return;
    setLastCoordinates(trail?.coordinates);

    const initMap = async () => {
      try {
        const google = await mapLoader.load();
        if (!mounted || !mapRef.current) return;

        // Initialize map if it doesn't exist
        if (!googleMapRef.current) {
          googleMapRef.current = new google.maps.Map(mapRef.current, {
            zoom: 10,
            center: { lat: 37.7749, lng: -122.4194 },
            mapTypeId: google.maps.MapTypeId.TERRAIN,
          });

          // Set up drawing manager
          drawingManagerRef.current = new google.maps.drawing.DrawingManager({
            drawingMode: null,
            drawingControl: isEditing,
            drawingControlOptions: {
              position: google.maps.ControlPosition.TOP_CENTER,
              drawingModes: [
                google.maps.drawing.OverlayType.MARKER,
                google.maps.drawing.OverlayType.POLYLINE,
              ],
            },
            markerOptions: { draggable: true },
            polylineOptions: {
              strokeColor: "#FF0000",
              strokeOpacity: 1.0,
              strokeWeight: 2,
              editable: true,
              geodesic: true,
            },
          });

          drawingManagerRef.current.setMap(googleMapRef.current);
        }

        // Update or create marker based on coordinates
        if (trail?.coordinates) {
          const [latStr, lngStr] = trail.coordinates.split(",");
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);

          if (!isNaN(lat) && !isNaN(lng)) {
            const position = { lat, lng };

            // Remove existing marker if present
            if (markerRef.current) {
              markerRef.current.setMap(null);
            }

            // Create new marker
            markerRef.current = new google.maps.Marker({
              position,
              map: googleMapRef.current,
              draggable: true,
            });

            // Add drag listener
            markerRef.current.addListener("dragend", () => {
              const newPosition = markerRef.current?.getPosition();
              if (newPosition) {
                onCoordinatesChange(`${newPosition.lat()},${newPosition.lng()}`);
              }
            });

            // Center and zoom map
            googleMapRef.current.panTo(position);
            googleMapRef.current.setZoom(14);
          }
        }

        // Setup polyline if path coordinates exist
        if (trail?.pathCoordinates) {
          setupPolyline(google, trail.pathCoordinates);
        }

      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initMap();

    return () => {
      mounted = false;
    };
  }, [trail?.coordinates, isEditing, onCoordinatesChange]);

  // Setup path drawing handlers
  useEffect(() => {
    if (!drawingManagerRef.current || !googleMapRef.current) return;

    const google = window.google;
    if (!google) return;

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

      marker.addListener("dragend", () => {
        const newPosition = marker.getPosition();
        if (newPosition) {
          onCoordinatesChange(`${newPosition.lat()},${newPosition.lng()}`);
        }
      });

      drawingManagerRef.current?.setDrawingMode(null);
    });

    // Handle polyline creation
    google.maps.event.addListener(drawingManagerRef.current, "polylinecomplete", (polyline: google.maps.Polyline) => {
      // Store current view state
      const currentCenter = googleMapRef.current?.getCenter();
      const currentZoom = googleMapRef.current?.getZoom();

      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }

      polylineRef.current = polyline;
      updatePathCoordinates();

      const updatePath = () => {
        if (polylineRef.current) {
          const path = polylineRef.current.getPath()
            .getArray()
            .map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`)
            .join(";");
          onPathCoordinatesChange(path);
        }
      };

      google.maps.event.addListener(polyline.getPath(), "set_at", updatePath);
      google.maps.event.addListener(polyline.getPath(), "insert_at", updatePath);
      google.maps.event.addListener(polyline.getPath(), "remove_at", updatePath);

      drawingManagerRef.current?.setDrawingMode(null);

      // Restore view state after a short delay
      if (currentCenter && currentZoom) {
        setTimeout(() => {
          googleMapRef.current?.setCenter(currentCenter);
          googleMapRef.current?.setZoom(currentZoom);
        }, 100);
      }
    });
  }, [onCoordinatesChange, onPathCoordinatesChange]);

  const updatePathCoordinates = () => {
    if (polylineRef.current) {
      const path = polylineRef.current.getPath()
        .getArray()
        .map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`)
        .join(";");
      onPathCoordinatesChange(path);
    }
  };

  const setupPolyline = (google: typeof window.google, pathCoordinates: string) => {
    const path = pathCoordinates.split(";").map((coord) => {
      const [lat, lng] = coord.split(",").map(Number);
      return new google.maps.LatLng(lat, lng);
    });

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    polylineRef.current = new google.maps.Polyline({
      path,
      strokeColor: "#FF0000",
      strokeOpacity: 1.0,
      strokeWeight: 2,
      editable: true,
      geodesic: true,
      map: googleMapRef.current!,
    });

    google.maps.event.addListener(polylineRef.current.getPath(), "set_at", updatePathCoordinates);
    google.maps.event.addListener(polylineRef.current.getPath(), "insert_at", updatePathCoordinates);
    google.maps.event.addListener(polylineRef.current.getPath(), "remove_at", updatePathCoordinates);
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={mapRef} className="w-full h-[600px] rounded-lg border border-border shadow-sm" />
      <div className="mt-4 flex justify-end">
        <Button
          variant={isEditing ? "destructive" : "secondary"}
          size="sm"
          onClick={() => {
            setIsEditing(!isEditing);
            if (drawingManagerRef.current) {
              drawingManagerRef.current.setDrawingMode(null);
              drawingManagerRef.current.setOptions({
                drawingControl: !isEditing,
              });
            }
          }}
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