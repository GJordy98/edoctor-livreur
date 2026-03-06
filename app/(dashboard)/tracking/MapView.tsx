"use client";

import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

export interface PharmacyPoint {
    lat: number;
    lng: number;
    name?: string;
    index?: number;
}

interface MapViewProps {
    /** Position GPS du livreur (depuis useGeolocation) */
    userPosition?: { lat: number; lng: number } | null;
    /** Officine unique (rétro-compat) — ignoré si pharmacies est fourni */
    officinePosition?: { lat: number; lng: number };
    /** Plusieurs officines de collecte numérotées */
    pharmacies?: PharmacyPoint[];
    /** Position du patient (destination livraison) */
    patientPosition?: { lat: number; lng: number };
    /** Tracer le parcours routier entre les points (OSRM). Défaut: false */
    showRoute?: boolean;
}

export interface MapViewHandle {
    zoomIn: () => void;
    zoomOut: () => void;
    flyToUser: () => void;
}

const DEFAULT_CENTER: [number, number] = [4.0511, 9.7679]; // Douala
const DEFAULT_ZOOM = 14;

const MapView = forwardRef<MapViewHandle, MapViewProps>(function MapView(
    { userPosition, officinePosition, pharmacies, patientPosition, showRoute = false },
    ref
) {
    const mapDivRef = useRef<HTMLDivElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapInstanceRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userMarkerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const officineMarkerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pharmacyMarkersRef = useRef<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patientMarkerRef = useRef<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routeLineRef = useRef<any>(null);
    const centeredOnUserRef = useRef(false);

    // --- Expose controls to parent ---
    useImperativeHandle(ref, () => ({
        zoomIn() { mapInstanceRef.current?.zoomIn(); },
        zoomOut() { mapInstanceRef.current?.zoomOut(); },
        flyToUser() {
            if (userPosition && mapInstanceRef.current) {
                mapInstanceRef.current.flyTo(
                    [userPosition.lat, userPosition.lng],
                    17,
                    { animate: true, duration: 1 }
                );
            }
        },
    }));

    // --- Initialize map ONCE ---
    useEffect(() => {
        if (typeof window === "undefined" || !mapDivRef.current) return;

        let cancelled = false;

        import("leaflet").then((L) => {
            if (cancelled || !mapDivRef.current) return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((mapDivRef.current as any)._leaflet_id) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            const map = L.map(mapDivRef.current, {
                center: DEFAULT_CENTER,
                zoom: DEFAULT_ZOOM,
                zoomControl: false,
            });

            L.tileLayer(
                "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                {
                    attribution:
                        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
                    subdomains: "abcd",
                    maxZoom: 20,
                }
            ).addTo(map);

            mapInstanceRef.current = map;

            const style = document.createElement("style");
            style.textContent = `
        .leaflet-control-attribution {
          background: rgba(15,23,42,0.8) !important;
          color: #64748b !important;
          font-size: 9px !important;
        }
        .leaflet-control-attribution a { color: #3b82f6 !important; }
        @keyframes pulse-ring {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `;
            document.head.appendChild(style);
        });

        return () => {
            cancelled = true;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
                userMarkerRef.current = null;
                officineMarkerRef.current = null;
                pharmacyMarkersRef.current = [];
                patientMarkerRef.current = null;
                routeLineRef.current = null;
                centeredOnUserRef.current = false;
            }
        };
    }, []);

    // --- Marqueur livreur (GPS temps réel) ---
    useEffect(() => {
        if (!mapInstanceRef.current || !userPosition) return;

        import("leaflet").then((L) => {
            const map = mapInstanceRef.current;
            if (!map) return;

            const userIcon = L.divIcon({
                html: `
          <div style="position:relative;width:20px;height:20px;">
            <div style="
              position:absolute;inset:0;
              background:#3b82f6;
              border-radius:50%;
              border:3px solid white;
              box-shadow:0 0 0 2px rgba(59,130,246,0.5);
              z-index:2;
            "></div>
            <div style="
              position:absolute;inset:-6px;
              background:rgba(59,130,246,0.25);
              border-radius:50%;
              animation:pulse-ring 2s ease-out infinite;
              z-index:1;
            "></div>
          </div>`,
                className: "",
                iconSize: [20, 20],
                iconAnchor: [10, 10],
            });

            if (userMarkerRef.current) {
                userMarkerRef.current.setLatLng([userPosition.lat, userPosition.lng]);
            } else {
                userMarkerRef.current = L.marker(
                    [userPosition.lat, userPosition.lng],
                    { icon: userIcon, zIndexOffset: 1000 }
                ).addTo(map).bindPopup("📍 Ma position");
            }

            if (!centeredOnUserRef.current) {
                centeredOnUserRef.current = true;
                map.setView([userPosition.lat, userPosition.lng], DEFAULT_ZOOM);
            }
        });
    }, [userPosition]);

    // --- Marqueurs pharmacies multiples (numérotés, verts) ---
    useEffect(() => {
        if (!mapInstanceRef.current) return;
        import("leaflet").then((L) => {
            const map = mapInstanceRef.current;
            if (!map) return;

            // Supprimer anciens marqueurs pharmacies
            pharmacyMarkersRef.current.forEach((m) => map.removeLayer(m));
            pharmacyMarkersRef.current = [];
            if (officineMarkerRef.current) { map.removeLayer(officineMarkerRef.current); officineMarkerRef.current = null; }

            const pts = pharmacies && pharmacies.length > 0
                ? pharmacies
                : officinePosition
                    ? [{ lat: officinePosition.lat, lng: officinePosition.lng, name: "Officine", index: 0 }]
                    : [];

            const bounds: [number, number][] = [];
            if (userPosition) bounds.push([userPosition.lat, userPosition.lng]);

            pts.forEach((ph, idx) => {
                if (isNaN(ph.lat) || isNaN(ph.lng)) return;
                // Badge vert numéroté — design distinct du livreur
                const pharmacyIcon = L.divIcon({
                    html: `
                      <div style="
                        position:relative;
                        width:40px;height:40px;
                      ">
                        <div style="
                          position:absolute;inset:0;
                          background:#22c55e;
                          border:3px solid white;
                          border-radius:12px;
                          display:flex;align-items:center;justify-content:center;
                          box-shadow:0 4px 14px rgba(34,197,94,0.6);
                          font-size:16px;font-weight:900;color:white;
                          z-index:2;
                        ">${ph.index !== undefined ? ph.index + 1 : idx + 1}</div>
                        <div style="
                          position:absolute;inset:-4px;
                          background:rgba(34,197,94,0.2);
                          border-radius:16px;
                          z-index:1;
                        "></div>
                      </div>`,
                    className: "",
                    iconSize: [40, 40],
                    iconAnchor: [20, 20],
                });
                const marker = L.marker([ph.lat, ph.lng], { icon: pharmacyIcon })
                    .addTo(map)
                    .bindPopup(`<b>🏥 Officine ${idx + 1}</b>${ph.name ? `<br>${ph.name}` : ""}`);
                pharmacyMarkersRef.current.push(marker);
                bounds.push([ph.lat, ph.lng]);
            });

            if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds).pad(0.3));
            else if (bounds.length === 1) map.setView(bounds[0], DEFAULT_ZOOM);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pharmacies, officinePosition, userPosition]);

    // --- Marqueur patient + route OSRM livreur → pharmacies → patient ---
    useEffect(() => {
        if (!mapInstanceRef.current) return;

        let cancelled = false;

        async function drawPatientAndRoute(L: typeof import("leaflet")) {
            const map = mapInstanceRef.current;
            if (!map || cancelled) return;

            // Supprimer ancien marqueur patient
            if (patientMarkerRef.current) { map.removeLayer(patientMarkerRef.current); patientMarkerRef.current = null; }

            // Patient — pin rouge (destination)
            if (patientPosition) {
                const patientIcon = L.divIcon({
                    html: `
                      <div style="position:relative;width:32px;height:40px;">
                        <div style="
                          position:absolute;bottom:0;left:50%;transform:translateX(-50%);
                          width:28px;height:28px;
                          background:#ef4444;
                          border:3px solid white;
                          border-radius:50% 50% 50% 0;
                          transform:translateX(-50%) rotate(-45deg);
                          box-shadow:0 3px 12px rgba(239,68,68,0.65);
                        "></div>
                      </div>`,
                    className: "",
                    iconSize: [32, 40],
                    iconAnchor: [16, 40],
                });
                patientMarkerRef.current = L.marker(
                    [patientPosition.lat, patientPosition.lng],
                    { icon: patientIcon }
                ).addTo(map).bindPopup("<b>🏠 Patient</b><br>Destination de livraison");
            }

            // Supprimer ancienne route
            if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null; }

            if (!showRoute) return;

            // Construire les waypoints : livreur → officines → patient (si dispo)
            const pharmacyPts = pharmacies && pharmacies.length > 0
                ? pharmacies
                : officinePosition ? [officinePosition] : [];

            const waypoints: { lat: number; lng: number }[] = [];
            if (userPosition) waypoints.push(userPosition);
            pharmacyPts.forEach((p) => { if (!isNaN(p.lat) && !isNaN(p.lng)) waypoints.push(p); });
            if (patientPosition) waypoints.push(patientPosition);

            if (waypoints.length < 2) return;

            const allBounds: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);

            // Tracé OSRM
            try {
                const coordStr = waypoints.map((p) => `${p.lng},${p.lat}`).join(";");
                const res = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${coordStr}?geometries=geojson&overview=full`,
                    { signal: AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined }
                );
                if (cancelled) return;
                if (res.ok) {
                    const data = await res.json() as {
                        routes?: { geometry?: { coordinates?: [number, number][] } }[]
                    };
                    const coords = data.routes?.[0]?.geometry?.coordinates;
                    if (coords && coords.length > 0) {
                        const pts: [number, number][] = coords.map(([lng, lat]) => [lat, lng]);
                        routeLineRef.current = L.polyline(pts, {
                            color: "#22c55e", weight: 5, opacity: 0.9,
                        }).addTo(map);
                        map.fitBounds(L.latLngBounds(allBounds).pad(0.3));
                        return;
                    }
                }
            } catch { /* fallback */ }

            if (cancelled) return;
            // Fallback : ligne droite pointillée
            routeLineRef.current = L.polyline(allBounds, {
                color: "#22c55e", weight: 4, opacity: 0.8, dashArray: "12 8",
            }).addTo(map);
            map.fitBounds(L.latLngBounds(allBounds).pad(0.3));
        }

        import("leaflet").then(drawPatientAndRoute);
        return () => { cancelled = true; };
    }, [officinePosition, pharmacies, patientPosition, userPosition, showRoute]);

    return (
        <div ref={mapDivRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
    );
});

export default MapView;
