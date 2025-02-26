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

  // Watch for coordinate changes from the form
  useEffect(() => {
    if (trail?.coordinates && googleMapRef.current) {
      const [latStr, lngStr] = trail.coordinates.split(",");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!isNaN(lat) && !isNaN(lng)) {
        // Update marker position
        if (markerRef.current) {
          markerRef.current.setPosition({ lat, lng });
        } else {
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
        // Center map on new coordinates
        googleMapRef.current.panTo({ lat, lng });
      }
    }
  }, [trail?.coordinates]);

  useEffect(() => {
    let mounted = true;

    mapLoader
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
          fullscreenControl: true,
          mapTypeId: google.maps.MapTypeId.TERRAIN
        });

        // Set up drawing manager
        drawingManagerRef.current = new google.maps.drawing.DrawingManager({
          drawingMode: isEditing ? google.maps.drawing.OverlayType.MARKER : null,
          drawingControl: isEditing,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              google.maps.drawing.OverlayType.MARKER,
              google.maps.drawing.OverlayType.POLYLINE,
            ],
          },
          markerOptions: {
            draggable: true
          },
          polylineOptions: {
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2,
            editable: true,
            geodesic: true
          }
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

        // Add existing path if pathCoordinates exist
        if (trail?.pathCoordinates) {
          const path = trail.pathCoordinates.split(';').map(coord => {
            const [lat, lng] = coord.split(',').map(Number);
            return new google.maps.LatLng(lat, lng);
          });

          polylineRef.current = new google.maps.Polyline({
            path,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2,
            editable: true,
            geodesic: true,
            map: googleMapRef.current
          });

          // Listen for path changes when editing the polyline
          google.maps.event.addListener(polylineRef.current.getPath(), 'set_at', () => {
            updatePathCoordinates();
          });

          google.maps.event.addListener(polylineRef.current.getPath(), 'insert_at', () => {
            updatePathCoordinates();
          });

          google.maps.event.addListener(polylineRef.current.getPath(), 'remove_at', () => {
            updatePathCoordinates();
          });
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

        // Handle polyline complete
        google.maps.event.addListener(drawingManagerRef.current, 'polylinecomplete', (polyline: google.maps.Polyline) => {
          // Remove old polyline if it exists
          if (polylineRef.current) {
            polylineRef.current.setMap(null);
          }

          polylineRef.current = polyline;
          updatePathCoordinates();

          // Add listeners for path editing
          google.maps.event.addListener(polyline.getPath(), 'set_at', () => {
            updatePathCoordinates();
          });

          google.maps.event.addListener(polyline.getPath(), 'insert_at', () => {
            updatePathCoordinates();
          });

          google.maps.event.addListener(polyline.getPath(), 'remove_at', () => {
            updatePathCoordinates();
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
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
      }
    };
  }, [trail, isEditing, onCoordinatesChange, onPathCoordinatesChange]);

  // Helper function to update path coordinates
  const updatePathCoordinates = () => {
    if (polylineRef.current) {
      const path = polylineRef.current.getPath().getArray().map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`).join(';');
      onPathCoordinatesChange(path);
    }
  };

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