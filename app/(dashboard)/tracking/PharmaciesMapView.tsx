"use client";

/**
 * PharmaciesMapView — Carte Leaflet multi-pharmacies
 * Affiche le livreur + N officines numérotées + optionnellement le patient
 */

import { useEffect, useRef } from "react";

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

const DEFAULT_CENTER: [number, number] = [4.0511, 9.7679]; // Douala
const DEFAULT_ZOOM = 13;

export default function PharmaciesMapView({
  userPosition,
  pharmacies = [],
  patientPosition,
}: PharmaciesMapViewProps) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pharmacyMarkersRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patientMarkerRef = useRef<any>(null);
  const centeredRef = useRef(false);

  // Initialisation carte
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
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          subdomains: "abcd",
          maxZoom: 20,
        }
      ).addTo(map);

      mapRef.current = map;

      // Style animation
      const style = document.createElement("style");
      style.textContent = `
        @keyframes pmap-pulse {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        userMarkerRef.current = null;
        pharmacyMarkersRef.current = [];
        patientMarkerRef.current = null;
        centeredRef.current = false;
      }
    };
  }, []);

  // Marqueur livreur
  useEffect(() => {
    if (!mapRef.current || !userPosition) return;
    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;
      const icon = L.divIcon({
        html: `<div style="position:relative;width:20px;height:20px;">
          <div style="position:absolute;inset:0;background:#3b82f6;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px rgba(59,130,246,0.4);z-index:2;"></div>
          <div style="position:absolute;inset:-6px;background:rgba(59,130,246,0.2);border-radius:50%;animation:pmap-pulse 2s ease-out infinite;z-index:1;"></div>
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
          { icon, zIndexOffset: 1000 }
        ).addTo(map).bindPopup("📍 Ma position");
      }

      if (!centeredRef.current) {
        centeredRef.current = true;
        map.setView([userPosition.lat, userPosition.lng], DEFAULT_ZOOM);
      }
    });
  }, [userPosition]);

  // Marqueurs pharmacies
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;

      // Supprimer anciens marqueurs pharmacies
      pharmacyMarkersRef.current.forEach((m) => map.removeLayer(m));
      pharmacyMarkersRef.current = [];

      const bounds: [number, number][] = [];
      if (userPosition) bounds.push([userPosition.lat, userPosition.lng]);

      pharmacies.forEach((ph, idx) => {
        if (isNaN(ph.lat) || isNaN(ph.lng)) return;
        const bgColor = ph.confirmed ? "#16a34a" : "#22c55e";
        const opacity = ph.confirmed ? "0.5" : "1";
        const icon = L.divIcon({
          html: `<div style="
            background:${bgColor};border:3px solid white;border-radius:10px;
            width:36px;height:36px;display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 12px rgba(34,197,94,0.5);opacity:${opacity};
            font-size:14px;font-weight:bold;color:white;
          ">${idx + 1}</div>`,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([ph.lat, ph.lng], { icon })
          .addTo(map)
          .bindPopup(`🏥 ${ph.name || `Officine ${idx + 1}`}${ph.confirmed ? " ✅" : ""}`);

        pharmacyMarkersRef.current.push(marker);
        bounds.push([ph.lat, ph.lng]);
      });

      if (patientPosition) bounds.push([patientPosition.lat, patientPosition.lng]);

      if (bounds.length > 1) {
        map.fitBounds(L.latLngBounds(bounds).pad(0.3));
      } else if (bounds.length === 1) {
        map.setView(bounds[0], DEFAULT_ZOOM);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pharmacies, patientPosition]);

  // Marqueur patient
  useEffect(() => {
    if (!mapRef.current) return;
    import("leaflet").then((L) => {
      const map = mapRef.current;
      if (!map) return;
      if (patientMarkerRef.current) {
        map.removeLayer(patientMarkerRef.current);
        patientMarkerRef.current = null;
      }
      if (!patientPosition) return;
      const icon = L.divIcon({
        html: `<div style="
          background:#ef4444;border:3px solid white;
          border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          width:28px;height:28px;box-shadow:0 2px 10px rgba(239,68,68,0.5);
        "></div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });
      patientMarkerRef.current = L.marker(
        [patientPosition.lat, patientPosition.lng],
        { icon }
      ).addTo(map).bindPopup("🏠 Patient (destination)");
    });
  }, [patientPosition]);

  return (
    <div ref={mapDivRef} className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }} />
  );
}
