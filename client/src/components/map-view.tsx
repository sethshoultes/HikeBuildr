import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";
import { Trail } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Map, Edit3, Save, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MapViewProps {
  trails: Trail[];
  centered?: boolean;
  onTrailClick?: (trail: Trail) => void;
  onTrailEdit?: (trailId: number, coordinates: string) => void;
  onRouteEdit?: (trailId: number, routeCoordinates: string[]) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export function MapView({
  trails,
  centered = false,
  onTrailClick,
  onTrailEdit,
  onRouteEdit
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const searchBoxRef = useRef<google.maps.places.SearchBox | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

useEffect(() => {
  const loader = new Loader({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    version: "weekly",
    libraries: ["places", "drawing"],
    mapIds: [], // Empty array to prevent duplicate loading
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
        mapTypeId: google.maps.MapTypeId.SATELLITE,
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
      googleMapRef.current.controls[google.maps.ControlPosition.TOP_LEFT].push(searchInputRef.current);

      // SearchBox listener
      searchBoxRef.current.addListener("places_changed", () => {
        const places = searchBoxRef.current!.getPlaces();
        if (places.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        places.forEach((place) => {
          if (!place.geometry || !place.geometry.location) return;
          bounds.extend(place.geometry.location);
        });
        googleMapRef.current!.fitBounds(bounds);
      });

      if (trails.length > 0) {
        const bounds = new google.maps.LatLngBounds();

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        trails.forEach((trail) => {
          try {
            const [latStr, lngStr] = trail.coordinates.split(",");
            const lat = parseFloat(latStr);
            const lng = parseFloat(lngStr);

            if (isNaN(lat) || isNaN(lng)) {
              console.warn(`Invalid coordinates for trail ${trail.id}: ${trail.coordinates}`);
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
                  onTrailEdit(trail.id, `${newPosition.lat()},${newPosition.lng()}`);
                }
              });
            }

            markersRef.current.push(marker);
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
          drawingMode: null,
          drawingControl: isEditing,
          drawingControlOptions: {
            position: google.maps.ControlPosition.TOP_CENTER,
            drawingModes: [
              google.maps.drawing.OverlayType.MARKER,
              google.maps.drawing.OverlayType.POLYLINE,
            ],
          },
          polylineOptions: {
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            editable: true,
          },
        });

        drawingManagerRef.current.setMap(googleMapRef.current);

        // Handle new marker creation
        if (isEditing) {
          google.maps.event.addListener(drawingManagerRef.current, "markercomplete", (marker: google.maps.Marker) => {
            const position = marker.getPosition();
            if (position && onTrailEdit) {
              onTrailEdit(-1, `${position.lat()},${position.lng()}`);
              marker.setMap(null);
            }
          });

          // Handle polyline completion
          google.maps.event.addListener(drawingManagerRef.current, "polylinecomplete", (polyline: google.maps.Polyline) => {
            if (polylineRef.current) {
              polylineRef.current.setMap(null);
            }
            polylineRef.current = polyline;

            // Add path change listener
            google.maps.event.addListener(polyline.getPath(), "set_at", () => {
              updateRouteCoordinates(polyline);
            });
            google.maps.event.addListener(polyline.getPath(), "insert_at", () => {
              updateRouteCoordinates(polyline);
            });

            updateRouteCoordinates(polyline);
          });
        }
      }
    })
    .catch((error) => {
      console.error("Error loading Google Maps:", error);
    });

  return () => {
    mounted = false;
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }
    if (drawingManagerRef.current) {
      drawingManagerRef.current.setMap(null);
    }
  };
}, [trails, centered, isEditing, onTrailClick, onTrailEdit, onRouteEdit]);

  const updateRouteCoordinates = (polyline: google.maps.Polyline) => {
    if (!onRouteEdit) return;
    const path = polyline.getPath();
    const coordinates = Array.from({ length: path.getLength() }, (_, i) => {
      const point = path.getAt(i);
      return `${point.lat()},${point.lng()}`;
    });
    onRouteEdit(-1, coordinates);
  };

  return (
    <div className="relative w-full h-full">
      <input
        ref={searchInputRef}
        type="text"
        placeholder="Search locations..."
        className="absolute top-4 left-4 z-10 w-64 px-3 py-2 bg-white rounded-md shadow-sm border border-input"
      />
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg border border-border shadow-sm"
      />
      {isAdmin && (
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
      )}
    </div>
  );
}