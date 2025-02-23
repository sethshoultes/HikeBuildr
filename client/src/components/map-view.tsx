import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Trail } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Map, Edit3, Search, Route } from "lucide-react";

interface MapViewProps {
  trails: Trail[];
  centered?: boolean;
  onTrailClick?: (trail: Trail) => void;
  onTrailEdit?: (trailId: number, updates: {
    startCoordinates?: string;
    pathCoordinates?: string[];
  }) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export function MapView({ trails, centered = false, onTrailClick, onTrailEdit }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDrawingPath, setIsDrawingPath] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const loader = new Loader({
      apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["drawing", "places"],
    });

    let mounted = true;

    loader
      .load()
      .then((google) => {
        if (!mounted || !mapRef.current || !searchInputRef.current) return;

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

        // Initialize SearchBox
        searchBoxRef.current = new google.maps.places.SearchBox(searchInputRef.current);

        // Listen for search results
        searchBoxRef.current.addListener("places_changed", () => {
          const places = searchBoxRef.current?.getPlaces();
          if (places?.length) {
            const place = places[0];
            const bounds = new google.maps.LatLngBounds();
            if (place.geometry?.viewport) {
              bounds.union(place.geometry.viewport);
            } else if (place.geometry?.location) {
              bounds.extend(place.geometry.location);
            }
            googleMapRef.current?.fitBounds(bounds);
          }
        });

        if (trails.length > 0) {
          const bounds = new google.maps.LatLngBounds();

          // Clear existing markers
          markersRef.current.forEach(marker => marker.setMap(null));
          markersRef.current = [];

          trails.forEach((trail) => {
            try {
              const [latStr, lngStr] = trail.startCoordinates.split(",");
              const lat = parseFloat(latStr);
              const lng = parseFloat(lngStr);

              if (isNaN(lat) || isNaN(lng)) {
                console.warn(`Invalid coordinates for trail ${trail.id}: ${trail.startCoordinates}`);
                return;
              }

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
                    onTrailEdit(trail.id, {
                      startCoordinates: `${newPosition.lat()},${newPosition.lng()}`
                    });
                  }
                });
              }

              markersRef.current.push(marker);

              // Draw trail path if it exists
              if (trail.pathCoordinates?.length) {
                const path = trail.pathCoordinates.map(coord => {
                  const [lat, lng] = coord.split(",").map(Number);
                  return { lat, lng };
                });

                new google.maps.Polyline({
                  path,
                  map: googleMapRef.current,
                  strokeColor: "#FF0000",
                  strokeOpacity: 1.0,
                  strokeWeight: 2,
                });
              }
            } catch (error) {
              console.warn(`Error processing trail ${trail.id}:`, error);
            }
          });

          if (!centered && markersRef.current.length > 0) {
            googleMapRef.current?.fitBounds(bounds);
          }
        }

        // Set up drawing manager for edit mode
        if (isAdmin) {
          drawingManagerRef.current = new google.maps.drawing.DrawingManager({
            drawingMode: isEditing ? 
              (isDrawingPath ? google.maps.drawing.OverlayType.POLYLINE : google.maps.drawing.OverlayType.MARKER)
              : null,
            drawingControl: isEditing,
            drawingControlOptions: {
              position: google.maps.ControlPosition.TOP_CENTER,
              drawingModes: [
                google.maps.drawing.OverlayType.MARKER,
                google.maps.drawing.OverlayType.POLYLINE
              ],
            },
          });

          drawingManagerRef.current.setMap(googleMapRef.current);

          // Handle new marker creation
          if (isEditing) {
            google.maps.event.addListener(
              drawingManagerRef.current,
              "markercomplete",
              (marker: google.maps.Marker) => {
                const position = marker.getPosition();
                if (position && onTrailEdit) {
                  // For new trails, we'll pass id as -1
                  onTrailEdit(-1, {
                    startCoordinates: `${position.lat()},${position.lng()}`
                  });
                  marker.setMap(null); // Remove temporary marker
                }
              }
            );

            google.maps.event.addListener(
              drawingManagerRef.current,
              "polylinecomplete",
              (polyline: google.maps.Polyline) => {
                const path = polyline.getPath();
                const coordinates = Array.from({ length: path.getLength() }, (_, i) => {
                  const point = path.getAt(i);
                  return `${point.lat()},${point.lng()}`;
                });

                if (onTrailEdit) {
                  onTrailEdit(-1, { pathCoordinates: coordinates });
                }
              }
            );
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
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }
    };
  }, [trails, centered, isEditing, isDrawingPath, onTrailClick, onTrailEdit]);

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
      {isEditing && (
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Input
            ref={searchInputRef}
            placeholder="Search location..."
            className="w-64"
          />
        </div>
      )}
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg border border-border shadow-sm"
      />
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant={isEditing ? "destructive" : "secondary"}
          size="sm"
          onClick={() => {
            setIsEditing(!isEditing);
            setIsDrawingPath(false);
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
        {isEditing && (
          <Button
            variant={isDrawingPath ? "destructive" : "secondary"}
            size="sm"
            onClick={() => setIsDrawingPath(!isDrawingPath)}
          >
            <Route className="h-4 w-4 mr-2" />
            {isDrawingPath ? "Stop Drawing" : "Draw Path"}
          </Button>
        )}
      </div>
    </div>
  );
}