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
  const [mapInitialized, setMapInitialized] = useState(false);

  // Initialize map on component mount
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        const google = await mapLoader.load();
        if (!mounted || !mapRef.current) return;

        // Set initial center and zoom
        let center = { lat: 37.7749, lng: -122.4194 }; // Default to San Francisco
        let zoom = 10;

        // If coordinates exist, use them
        if (trail?.coordinates) {
          console.log("Initializing map with coordinates:", trail.coordinates);
          const [latStr, lngStr] = trail.coordinates.split(",");
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          if (!isNaN(lat) && !isNaN(lng)) {
            center = { lat, lng };
            zoom = 14;
          }
        }

        // Initialize map
        googleMapRef.current = new google.maps.Map(mapRef.current, {
          zoom,
          center,
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
        setMapInitialized(true);
      } catch (error) {
        console.error("Error initializing map:", error);
      }
    };

    initMap();

    return () => {
      mounted = false;
      if (markerRef.current) markerRef.current.setMap(null);
      if (polylineRef.current) polylineRef.current.setMap(null);
      if (drawingManagerRef.current) drawingManagerRef.current.setMap(null);
    };
  }, []); // Only run on mount


  // Update marker when coordinates change
  useEffect(() => {
    if (!mapInitialized || !googleMapRef.current) return;

    console.log("Coordinates changed:", trail?.coordinates);

    // Remove existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    if (trail?.coordinates) {
      const [latStr, lngStr] = trail.coordinates.split(",");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (!isNaN(lat) && !isNaN(lng)) {
        const position = { lat, lng };

        // Create new marker
        markerRef.current = new google.maps.Marker({
          position,
          map: googleMapRef.current,
          draggable: true,
        });

        markerRef.current.addListener("dragend", () => {
          const newPosition = markerRef.current?.getPosition();
          if (newPosition) {
            onCoordinatesChange(`${newPosition.lat()},${newPosition.lng()}`);
          }
        });

        // Pan and zoom to the marker
        googleMapRef.current.panTo(position);
        googleMapRef.current.setZoom(14);
      }
    }
  }, [trail?.coordinates, mapInitialized, onCoordinatesChange]);

  // Set up marker creation handler
  useEffect(() => {
    if (!drawingManagerRef.current || !googleMapRef.current) return;

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

    // Set up polyline creation handler
    google.maps.event.addListener(drawingManagerRef.current, "polylinecomplete", (polyline: google.maps.Polyline) => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }

      polylineRef.current = polyline;
      const path = polyline.getPath()
        .getArray()
        .map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`)
        .join(";");
      onPathCoordinatesChange(path);

      google.maps.event.addListener(polyline.getPath(), "set_at", () => {
        const newPath = polyline.getPath()
          .getArray()
          .map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`)
          .join(";");
        onPathCoordinatesChange(newPath);
      });

      drawingManagerRef.current?.setDrawingMode(null);
    });
  }, [drawingManagerRef.current, googleMapRef.current, onCoordinatesChange, onPathCoordinatesChange]);


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