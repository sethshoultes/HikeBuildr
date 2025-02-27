import { useEffect, useRef, useState, useCallback } from "react";
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

  // Memoize handlers to prevent unnecessary re-renders
  const handleMarkerComplete = useCallback((marker: google.maps.Marker) => {
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
  }, [onCoordinatesChange]);

  const handlePolylineComplete = useCallback((polyline: google.maps.Polyline) => {
    // Remove old polyline if it exists
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    polylineRef.current = polyline;
    const path = polyline.getPath().getArray().map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`).join(';');
    onPathCoordinatesChange(path);

    // Add path update listener
    const pathListener = google.maps.event.addListener(polyline.getPath(), 'set_at', (e: any) => {
      e.stop(); // Prevent event propagation
      const newPath = polyline.getPath().getArray().map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`).join(';');
      onPathCoordinatesChange(newPath);
    });

    // Store listener reference for cleanup
    polyline.set('pathListener', pathListener);
  }, [onPathCoordinatesChange]);

  useEffect(() => {
    let mounted = true;
    let listeners: google.maps.MapsEventListener[] = [];

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

        // Initialize map if not already initialized
        if (!googleMapRef.current) {
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
        } else {
          // Just update the center if map exists
          googleMapRef.current.setCenter(center);
        }

        // Set up drawing manager
        if (drawingManagerRef.current) {
          drawingManagerRef.current.setMap(null);
        }

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
            editable: true
          }
        });

        drawingManagerRef.current.setMap(googleMapRef.current);

        // Add existing marker if coordinates exist
        if (trail?.coordinates) {
          const [latStr, lngStr] = trail.coordinates.split(",");
          const lat = parseFloat(latStr);
          const lng = parseFloat(lngStr);
          if (!isNaN(lat) && !isNaN(lng)) {
            if (markerRef.current) {
              markerRef.current.setMap(null);
            }
            markerRef.current = new google.maps.Marker({
              position: { lat, lng },
              map: googleMapRef.current,
              draggable: true,
            });

            listeners.push(
              markerRef.current.addListener("dragend", () => {
                const position = markerRef.current?.getPosition();
                if (position) {
                  onCoordinatesChange(`${position.lat()},${position.lng()}`);
                }
              })
            );
          }
        }

        // Add existing path if pathCoordinates exist
        if (trail?.pathCoordinates) {
          const path = trail.pathCoordinates.split(';').map(coord => {
            const [lat, lng] = coord.split(',').map(Number);
            return new google.maps.LatLng(lat, lng);
          });

          if (polylineRef.current) {
            polylineRef.current.setMap(null);
          }

          polylineRef.current = new google.maps.Polyline({
            path,
            strokeColor: '#FF0000',
            strokeOpacity: 1.0,
            strokeWeight: 2,
            editable: true,
            map: googleMapRef.current
          });

          listeners.push(
            google.maps.event.addListener(polylineRef.current.getPath(), 'set_at', (e: any) => {
              e.stop(); // Prevent event propagation
              const newPath = polylineRef.current?.getPath().getArray().map((p: google.maps.LatLng) => `${p.lat()},${p.lng()}`).join(';');
              if (newPath) {
                onPathCoordinatesChange(newPath);
              }
            })
          );
        }

        // Set up drawing event listeners
        if (drawingManagerRef.current) {
          listeners.push(
            google.maps.event.addListener(drawingManagerRef.current, "markercomplete", handleMarkerComplete),
            google.maps.event.addListener(drawingManagerRef.current, 'polylinecomplete', handlePolylineComplete)
          );
        }
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });

    return () => {
      mounted = false;

      // Clean up all listeners
      listeners.forEach(listener => listener.remove());

      // Clean up map elements
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (polylineRef.current) {
        const pathListener = polylineRef.current.get('pathListener');
        if (pathListener) {
          pathListener.remove();
        }
        polylineRef.current.setMap(null);
      }
      if (drawingManagerRef.current) {
        drawingManagerRef.current.setMap(null);
      }
    };
  }, [trail?.coordinates, trail?.pathCoordinates, isEditing, handleMarkerComplete, handlePolylineComplete]);

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