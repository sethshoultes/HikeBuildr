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
  const [mapCenter, setMapCenter] = useState<google.maps.LatLngLiteral>({ lat: 37.7749, lng: -122.4194 });
  const [mapZoom, setMapZoom] = useState<number>(10);

  // Watch for coordinate changes from the form
  useEffect(() => {
    if (!googleMapRef.current) return;

    if (trail?.coordinates) {
      const [latStr, lngStr] = trail.coordinates.split(",");
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);

      if (!isNaN(lat) && !isNaN(lng)) {
        const position = { lat, lng };

        // Update or create marker
        if (markerRef.current) {
          markerRef.current.setPosition(position);
        } else {
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
        }

        // Save current map state before updating
        const currentCenter = googleMapRef.current.getCenter();
        const currentZoom = googleMapRef.current.getZoom();
        if (currentCenter && currentZoom) {
          setMapCenter(currentCenter.toJSON());
          setMapZoom(currentZoom);
        }

        // Center and zoom map on the marker
        googleMapRef.current.panTo(position);
        googleMapRef.current.setZoom(14);
      }
    }
  }, [trail?.coordinates, onCoordinatesChange]);

  // Initialize map
  useEffect(() => {
    let mounted = true;

    mapLoader
      .load()
      .then((google) => {
        if (!mounted || !mapRef.current) return;

        googleMapRef.current = new google.maps.Map(mapRef.current, {
          zoom: mapZoom,
          center: mapCenter,
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
          markerOptions: {
            draggable: true,
          },
          polylineOptions: {
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            editable: true,
            geodesic: true,
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

        // Add existing path if pathCoordinates exist
        if (trail?.pathCoordinates) {
          const path = trail.pathCoordinates.split(";").map((coord) => {
            const [lat, lng] = coord.split(",").map(Number);
            return new google.maps.LatLng(lat, lng);
          });

          polylineRef.current = new google.maps.Polyline({
            path,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 2,
            editable: true,
            geodesic: true,
            map: googleMapRef.current,
          });

          google.maps.event.addListener(polylineRef.current.getPath(), "set_at", updatePathCoordinates);
          google.maps.event.addListener(polylineRef.current.getPath(), "insert_at", updatePathCoordinates);
          google.maps.event.addListener(polylineRef.current.getPath(), "remove_at", updatePathCoordinates);
        }

        // Handle new marker creation
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

          // Reset drawing mode after placing marker
          drawingManagerRef.current?.setDrawingMode(null);
        });

        // Handle polyline complete
        google.maps.event.addListener(drawingManagerRef.current, "polylinecomplete", (polyline: google.maps.Polyline) => {
          // Store current map state before updating
          const currentCenter = googleMapRef.current?.getCenter();
          const currentZoom = googleMapRef.current?.getZoom();

          if (polylineRef.current) {
            polylineRef.current.setMap(null);
          }

          polylineRef.current = polyline;
          updatePathCoordinates();

          // Add path editing listeners
          google.maps.event.addListener(polyline.getPath(), "set_at", updatePathCoordinates);
          google.maps.event.addListener(polyline.getPath(), "insert_at", updatePathCoordinates);
          google.maps.event.addListener(polyline.getPath(), "remove_at", updatePathCoordinates);

          // Reset drawing mode after completing polyline
          drawingManagerRef.current?.setDrawingMode(null);

          // Restore map state after a short delay
          if (currentCenter && currentZoom) {
            setTimeout(() => {
              googleMapRef.current?.setCenter(currentCenter);
              googleMapRef.current?.setZoom(currentZoom);
            }, 100);
          }
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
  }, [mapCenter, mapZoom, isEditing, trail?.pathCoordinates]);

  // Helper function to update path coordinates
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