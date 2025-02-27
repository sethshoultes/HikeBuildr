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

  const handleMarkerComplete = useCallback((marker: google.maps.Marker) => {
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
    // Prevent the default map click event
    google.maps.event.addListenerOnce(polyline, 'click', (e) => {
      if (e.stop) e.stop();
      return false;
    });

    // Remove old polyline if it exists
    if (polylineRef.current) {
      const listeners = polylineRef.current.get('pathListeners') as google.maps.MapsEventListener[];
      if (Array.isArray(listeners)) {
        listeners.forEach(listener => listener.remove());
      }
      polylineRef.current.setMap(null);
    }

    polylineRef.current = polyline;
    polyline.setOptions({ editable: true });

    // Update path coordinates
    const updatePath = () => {
      const path = polyline.getPath();
      const coordinates = path.getArray().map(p => `${p.lat()},${p.lng()}`).join(';');
      onPathCoordinatesChange(coordinates);
    };

    // Initial path update
    updatePath();

    // Add path update listeners
    const pathListeners = [
      google.maps.event.addListener(polyline.getPath(), 'set_at', updatePath),
      google.maps.event.addListener(polyline.getPath(), 'insert_at', updatePath),
      google.maps.event.addListener(polyline.getPath(), 'remove_at', updatePath)
    ];

    // Store listeners for cleanup
    polyline.set('pathListeners', pathListeners);
  }, [onPathCoordinatesChange]);

  useEffect(() => {
    let mounted = true;
    let listeners: google.maps.MapsEventListener[] = [];

    mapLoader
      .load()
      .then((google) => {
        if (!mounted || !mapRef.current) return;

        // Initialize map if not already initialized
        if (!googleMapRef.current) {
          const defaultCenter = { lat: 37.7749, lng: -122.4194 };
          let center = trail?.coordinates ? (() => {
            const [latStr, lngStr] = trail.coordinates.split(",");
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);
            return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : defaultCenter;
          })() : defaultCenter;

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
        }

        // Clean up existing drawing manager
        if (drawingManagerRef.current) {
          drawingManagerRef.current.setMap(null);
        }

        // Set up drawing manager
        drawingManagerRef.current = new google.maps.drawing.DrawingManager({
          drawingMode: isEditing ? google.maps.drawing.OverlayType.POLYLINE : null,
          drawingControl: isEditing,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              google.maps.drawing.OverlayType.MARKER,
              google.maps.drawing.OverlayType.POLYLINE
            ],
          },
          polylineOptions: {
            strokeColor: '#FF0000',
            strokeWeight: 3,
            editable: true
          },
          markerOptions: {
            draggable: true
          }
        });

        drawingManagerRef.current.setMap(googleMapRef.current);

        // Set up drawing event listeners
        if (drawingManagerRef.current) {
          listeners.push(
            google.maps.event.addListener(drawingManagerRef.current, "markercomplete", handleMarkerComplete),
            google.maps.event.addListener(drawingManagerRef.current, 'polylinecomplete', handlePolylineComplete)
          );
        }

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
              draggable: isEditing,
            });
          }
        }

        // Add existing path if pathCoordinates exist
        if (trail?.pathCoordinates) {
          try {
            const coordinates = trail.pathCoordinates.split(';').map(coord => {
              const [lat, lng] = coord.split(',').map(Number);
              if (isNaN(lat) || isNaN(lng)) {
                throw new Error(`Invalid coordinates: ${coord}`);
              }
              return new google.maps.LatLng(lat, lng);
            });

            if (polylineRef.current) {
              const oldListeners = polylineRef.current.get('pathListeners') as google.maps.MapsEventListener[];
              if (Array.isArray(oldListeners)) {
                oldListeners.forEach(listener => listener.remove());
              }
              polylineRef.current.setMap(null);
            }

            polylineRef.current = new google.maps.Polyline({
              path: coordinates,
              strokeColor: '#FF0000',
              strokeWeight: 3,
              editable: isEditing,
              map: googleMapRef.current
            });

            // Set up path update listeners for existing polyline
            if (isEditing) {
              const updatePath = () => {
                const path = polylineRef.current?.getPath();
                if (path) {
                  const coords = path.getArray().map(p => `${p.lat()},${p.lng()}`).join(';');
                  onPathCoordinatesChange(coords);
                }
              };

              const pathListeners = [
                google.maps.event.addListener(polylineRef.current.getPath(), 'set_at', updatePath),
                google.maps.event.addListener(polylineRef.current.getPath(), 'insert_at', updatePath),
                google.maps.event.addListener(polylineRef.current.getPath(), 'remove_at', updatePath)
              ];

              polylineRef.current.set('pathListeners', pathListeners);
              listeners.push(...pathListeners);
            }
          } catch (error) {
            console.error('Error restoring path:', error);
          }
        }
      })
      .catch((error) => {
        console.error("Error loading Google Maps:", error);
      });

    return () => {
      mounted = false;

      // Clean up all listeners
      listeners.forEach(listener => {
        if (listener) listener.remove();
      });

      // Clean up map elements
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      if (polylineRef.current) {
        const pathListeners = polylineRef.current.get('pathListeners') as google.maps.MapsEventListener[];
        if (Array.isArray(pathListeners)) {
          pathListeners.forEach(listener => listener.remove());
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