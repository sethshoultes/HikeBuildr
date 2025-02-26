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

  // Initialize map
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      try {
        const google = await mapLoader.load();
        if (!mounted || !mapRef.current) return;

        googleMapRef.current = new google.maps.Map(mapRef.current, {
          zoom: 10,
          center: { lat: 37.7749, lng: -122.4194 },
          mapTypeId: google.maps.MapTypeId.TERRAIN,
        });

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
          },
        });

        drawingManagerRef.current.setMap(googleMapRef.current);
        setMapInitialized(true);

        // Set up marker creation handler
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

        // Set up polyline handler
        google.maps.event.addListener(drawingManagerRef.current, "polylinecomplete", (polyline: google.maps.Polyline) => {
          if (polylineRef.current) {
            polylineRef.current.setMap(null);
          }
          polylineRef.current = polyline;
          updatePathCoordinates();

          google.maps.event.addListener(polyline.getPath(), "set_at", updatePathCoordinates);
          google.maps.event.addListener(polyline.getPath(), "insert_at", updatePathCoordinates);
          drawingManagerRef.current?.setDrawingMode(null);
        });
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
  }, [isEditing, onCoordinatesChange]);

  // Update marker when coordinates change
  useEffect(() => {
    if (!mapInitialized || !googleMapRef.current) return;

    // Clear existing marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    // Add new marker if coordinates exist
    if (trail?.coordinates) {
      const [latStr, lngStr] = trail.coordinates.split(",");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (!isNaN(lat) && !isNaN(lng)) {
        const position = { lat, lng };

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

        // Center map on marker
        googleMapRef.current.panTo(position);
        googleMapRef.current.setZoom(14);
      }
    }
  }, [trail?.coordinates, mapInitialized]);

  // Update drawing controls
  useEffect(() => {
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setOptions({
        drawingControl: isEditing
      });
    }
  }, [isEditing]);

  const updatePathCoordinates = () => {
    if (polylineRef.current) {
      const path = polylineRef.current.getPath()
        .getArray()
        .map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`)
        .join(";");
      onPathCoordinatesChange(path);
    }
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