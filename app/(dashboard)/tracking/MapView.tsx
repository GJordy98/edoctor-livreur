"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { APIProvider, Map, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

export interface PharmacyPoint {
    lat: number;
    lng: number;
    name?: string;
    index?: number;
}

interface MapViewProps {
    userPosition?: { lat: number; lng: number } | null;
    officinePosition?: { lat: number; lng: number };
    pharmacies?: PharmacyPoint[];
    patientPosition?: { lat: number; lng: number };
    showRoute?: boolean;
}

export interface MapViewHandle {
    zoomIn: () => void;
    zoomOut: () => void;
    flyToUser: () => void;
}

const DEFAULT_CENTER = { lat: 4.0511, lng: 9.7679 }; // Douala
const DEFAULT_ZOOM = 14;

// L'intérieur de la carte a accès au contexte useMap()
const InnerMap = forwardRef<MapViewHandle, MapViewProps>(function InnerMap(
    { userPosition, officinePosition, pharmacies, patientPosition, showRoute },
    ref
) {
    const map = useMap();
    const routesLibrary = useMapsLibrary("routes");
    const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
    const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);

    useImperativeHandle(ref, () => ({
        zoomIn() { if (map) map.setZoom((map.getZoom() ?? 14) + 1); },
        zoomOut() { if (map) map.setZoom((map.getZoom() ?? 14) - 1); },
        flyToUser() {
            if (map && userPosition) {
                map.panTo({ lat: userPosition.lat, lng: userPosition.lng });
                map.setZoom(17);
            }
        },
    }));

    // Initialiser les services de trace (DirectionsService)
    useEffect(() => {
        if (!routesLibrary || !map) return;
        setDirectionsService(new routesLibrary.DirectionsService());
        
        setDirectionsRenderer(new routesLibrary.DirectionsRenderer({
            map: map,
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: "#22c55e",
                strokeWeight: 5,
            }
        }));
    }, [routesLibrary, map]);

    // Dessiner l'itinéraire
    useEffect(() => {
        if (!directionsService || !directionsRenderer || !showRoute || !userPosition) return;

        const pts = pharmacies && pharmacies.length > 0
            ? pharmacies
            : officinePosition
                ? [{ lat: officinePosition.lat, lng: officinePosition.lng, index: 0 }]
                : [];

        if (pts.length === 0 && !patientPosition) return;

        const waypoints: google.maps.DirectionsWaypoint[] = pts.map(p => ({
            location: { lat: p.lat, lng: p.lng },
            stopover: true,
        }));

        const destination = patientPosition 
            ? { lat: patientPosition.lat, lng: patientPosition.lng } 
             : waypoints.length > 0 ? waypoints[waypoints.length - 1].location : { lat: userPosition.lat, lng: userPosition.lng };

        if (!patientPosition && waypoints.length > 0) {
           waypoints.pop(); // Le dernier point est la destination si pas de patient
        }

        directionsService.route({
            origin: { lat: userPosition.lat, lng: userPosition.lng },
            destination: destination as google.maps.LatLngLiteral,
            waypoints: waypoints,
            optimizeWaypoints: true,
            travelMode: google.maps.TravelMode.DRIVING,
        }, (result, status) => {
            if (status === google.maps.DirectionsStatus.OK && result) {
                directionsRenderer.setDirections(result);
            }
        });

    }, [directionsService, directionsRenderer, userPosition, officinePosition, pharmacies, patientPosition, showRoute]);

    // Ajuster le cadre de la carte pour inclure tout le monde
    useEffect(() => {
        if (!map || !window.google || !window.google.maps) return;
        
        try {
            const bounds = new window.google.maps.LatLngBounds();
            let hasPoints = false;

            if (userPosition) {
                bounds.extend({ lat: userPosition.lat, lng: userPosition.lng });
                hasPoints = true;
            }
            
            const pts = pharmacies && pharmacies.length > 0
                ? pharmacies
                : officinePosition
                    ? [{ lat: officinePosition.lat, lng: officinePosition.lng }]
                    : [];

            pts.forEach(p => {
                bounds.extend({ lat: p.lat, lng: p.lng });
                hasPoints = true;
            });

            if (patientPosition) {
                bounds.extend({ lat: patientPosition.lat, lng: patientPosition.lng });
                hasPoints = true;
            }

            if (hasPoints) {
                map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
            }
        } catch (e) {
            console.error("Bounds error", e);
        }
    }, [map, userPosition, officinePosition, pharmacies, patientPosition, showRoute]);

    const pts = pharmacies && pharmacies.length > 0
        ? pharmacies
        : officinePosition
            ? [{ lat: officinePosition.lat, lng: officinePosition.lng, index: 0, name: "Officine" }]
            : [];

    return (
        <>
            {userPosition && (
                 <AdvancedMarker position={{ lat: userPosition.lat, lng: userPosition.lng }} zIndex={1000}>
                    <div style={{ position: "relative", width: "20px", height: "20px" }}>
                        <div style={{ position: "absolute", inset: 0, background: "#3b82f6", borderRadius: "50%", border: "3px solid white", boxShadow: "0 0 0 2px rgba(59,130,246,0.5)", zIndex: 2 }}></div>
                        <div className="pulse-dot" style={{ position: "absolute", inset: "-6px", background: "rgba(59,130,246,0.25)", borderRadius: "50%", zIndex: 1 }}></div>
                    </div>
                </AdvancedMarker>
            )}

            {pts.map((ph, idx) => (
                <AdvancedMarker key={`ph-${idx}`} position={{ lat: ph.lat, lng: ph.lng }}>
                     <div style={{
                        position: "relative", width: "40px", height: "40px"
                    }}>
                        <div style={{
                            position: "absolute", inset: 0, background: "#22c55e", border: "3px solid white", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(34,197,94,0.6)", fontSize: "16px", fontWeight: 900, color: "white", zIndex: 2
                        }}>
                            {ph.index !== undefined ? ph.index + 1 : idx + 1}
                        </div>
                        <div style={{ position: "absolute", inset: "-4px", background: "rgba(34,197,94,0.2)", borderRadius: "16px", zIndex: 1 }}></div>
                    </div>
                </AdvancedMarker>
            ))}

            {patientPosition && (
                <AdvancedMarker position={{ lat: patientPosition.lat, lng: patientPosition.lng }}>
                   <div style={{ position: "relative", width: "32px", height: "40px" }}>
                        <div style={{
                            position: "absolute", bottom: 0, left: "50%",
                            width: "28px", height: "28px", background: "#ef4444", border: "3px solid white",
                            borderRadius: "50% 50% 50% 0", transform: "translateX(-50%) rotate(-45deg)",
                            boxShadow: "0 3px 12px rgba(239,68,68,0.65)"
                        }}></div>
                    </div>
                </AdvancedMarker>
            )}
            <style>
            {`
              @keyframes pulse-ring {
                0%   { transform: scale(1);   opacity: 0.8; }
                100% { transform: scale(2.5); opacity: 0; }
              }
              .pulse-dot { animation: pulse-ring 2s ease-out infinite; }
            `}
            </style>
        </>
    );
});

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(props, ref) {
    return (
        <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
             <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}>
                 <Map
                    defaultCenter={DEFAULT_CENTER}
                    defaultZoom={DEFAULT_ZOOM}
                    disableDefaultUI={true}
                    mapId="tracking-map-id"
                 >
                     <InnerMap ref={ref} {...props} />
                 </Map>
             </APIProvider>
        </div>
    );
});

export default MapView;
