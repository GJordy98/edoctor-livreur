"use client";

/**
 * PharmaciesMapView — Carte Google Maps multi-pharmacies
 */

import { useEffect } from "react";
import { APIProvider, Map, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";

export interface PharmacyMarker {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  confirmed?: boolean;
}

interface PharmaciesMapViewProps {
  userPosition?: { lat: number; lng: number } | null;
  pharmacies?: PharmacyMarker[];
  patientPosition?: { lat: number; lng: number };
}

const DEFAULT_CENTER = { lat: 4.0511, lng: 9.7679 }; // Douala
const DEFAULT_ZOOM = 13;

function PharmaciesInnerMap({ userPosition, pharmacies, patientPosition }: PharmaciesMapViewProps) {
    const map = useMap();

    useEffect(() => {
        if (!map || !window.google || !window.google.maps) return;
        
        try {
            const bounds = new window.google.maps.LatLngBounds();
            let hasPoints = false;

            if (userPosition) {
                bounds.extend({ lat: userPosition.lat, lng: userPosition.lng });
                hasPoints = true;
            }

            if (pharmacies) {
                pharmacies.forEach((ph) => {
                    bounds.extend({ lat: ph.lat, lng: ph.lng });
                    hasPoints = true;
                });
            }

            if (patientPosition) {
                bounds.extend({ lat: patientPosition.lat, lng: patientPosition.lng });
                hasPoints = true;
            }

            if (hasPoints) {
                map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
            }
        } catch (e) {
            console.error(e);
        }
    }, [map, userPosition, pharmacies, patientPosition]);

    return (
        <>
            {userPosition && (
                 <AdvancedMarker position={{ lat: userPosition.lat, lng: userPosition.lng }} zIndex={1000} title="Ma position">
                    <div style={{ position: "relative", width: "20px", height: "20px" }}>
                        <div style={{ position: "absolute", inset: 0, background: "#3b82f6", borderRadius: "50%", border: "3px solid white", boxShadow: "0 0 0 2px rgba(59,130,246,0.4)", zIndex: 2 }}></div>
                        <div className="pmap-pulse" style={{ position: "absolute", inset: "-6px", background: "rgba(59,130,246,0.2)", borderRadius: "50%", zIndex: 1 }}></div>
                    </div>
                </AdvancedMarker>
            )}

            {pharmacies && pharmacies.map((ph, idx) => (
                <AdvancedMarker key={ph.id} position={{ lat: ph.lat, lng: ph.lng }} title={ph.name || `Officine ${idx+1}`}>
                     <div style={{
                        background: ph.confirmed ? "#16a34a" : "#22c55e",
                        border: "3px solid white", borderRadius: "10px",
                        width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 2px 12px rgba(34,197,94,0.5)", opacity: ph.confirmed ? 0.7 : 1,
                        fontSize: "14px", fontWeight: "bold", color: "white", zIndex: 2
                    }}>
                        {idx + 1}
                    </div>
                </AdvancedMarker>
            ))}

            {patientPosition && (
                <AdvancedMarker position={{ lat: patientPosition.lat, lng: patientPosition.lng }} title="Patient (destination)">
                    <div style={{
                        background: "#ef4444", border: "3px solid white",
                        borderRadius: "50% 50% 50% 0", transform: "rotate(-45deg)",
                        width: "28px", height: "28px", boxShadow: "0 2px 10px rgba(239,68,68,0.5)"
                    }}></div>
                </AdvancedMarker>
            )}

            <style>
            {`
              @keyframes pmap-pulse-anim {
                0%   { transform: scale(1);   opacity: 0.8; }
                100% { transform: scale(2.5); opacity: 0; }
              }
              .pmap-pulse { animation: pmap-pulse-anim 2s ease-out infinite; }
            `}
            </style>
        </>
    );
}

export default function PharmaciesMapView(props: PharmaciesMapViewProps) {
  return (
    <div className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}>
          <Map
             defaultCenter={DEFAULT_CENTER}
             defaultZoom={DEFAULT_ZOOM}
             disableDefaultUI={true}
             mapId="pharmacies-map-id"
          >
              <PharmaciesInnerMap {...props} />
          </Map>
      </APIProvider>
    </div>
  );
}
