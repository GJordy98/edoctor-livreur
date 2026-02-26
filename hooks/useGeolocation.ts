"use client";

/**
 * useGeolocation hook — e-Dr TIM Delivery System
 * Migré depuis geolocation.js
 * Gestion GPS (position, statut, reverse geocoding)
 */

import { useState, useEffect, useRef, useCallback } from "react";

export type GpsStatus = "idle" | "searching" | "active" | "error";

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export interface UseGeolocationReturn {
  position: GeoPosition | null;
  status: GpsStatus;
  statusText: string;
  address: string;
  zone: string;
  startWatching: () => void;
  stopWatching: () => void;
}

export function useGeolocation(): UseGeolocationReturn {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus] = useState<GpsStatus>("idle");
  const [statusText, setStatusText] = useState("GPS non initialisé");
  const [address, setAddress] = useState("");
  const [zone, setZone] = useState("");
  const watchIdRef = useRef<number | null>(null);
  const lastGeocodeRef = useRef<{ key: string; at: number }>({ key: "", at: 0 });

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const now = Date.now();

    // Anti-spam: max 1 appel toutes les 15s pour la même position
    if (key === lastGeocodeRef.current.key && now - lastGeocodeRef.current.at < 15000) return;
    lastGeocodeRef.current = { key, at: now };

    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      const response = await fetch(url, {
        headers: {
          "Accept-Language": "fr",
          "User-Agent": "e-DrTIM-Delivery/1.0 (https://e-doctorpharma.onrender.com)",
        },
      });
      if (!response.ok) return;

      const data = await response.json();
      if (data?.display_name) {
        const parts: string[] = [];
        if (data.address?.road) parts.push(data.address.road);
        if (data.address?.suburb || data.address?.neighbourhood)
          parts.push(data.address.suburb || data.address.neighbourhood);
        if (data.address?.city || data.address?.town)
          parts.push(data.address.city || data.address.town);

        setAddress(parts.slice(0, 3).join(", ") || data.display_name.split(",").slice(0, 3).join(","));
        setZone(
          data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.city ||
            "Zone inconnue"
        );
      }
    } catch {
      setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setZone("Position GPS");
    }
  }, []);

  const handleSuccess = useCallback(
    (pos: GeolocationPosition) => {
      const geoPos: GeoPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
      };
      setPosition(geoPos);
      setStatus("active");
      setStatusText("GPS Actif");
      reverseGeocode(geoPos.latitude, geoPos.longitude);
    },
    [reverseGeocode]
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    let message = "Erreur GPS";
    switch (error.code) {
      case error.PERMISSION_DENIED:
        message = "Accès GPS refusé";
        break;
      case error.POSITION_UNAVAILABLE:
        message = "Position indisponible";
        break;
      case error.TIMEOUT:
        message = "Délai GPS dépassé";
        break;
    }
    setStatus("error");
    setStatusText(message);
  }, []);

  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setStatusText("GPS non supporté");
      return;
    }
    setStatus("searching");
    setStatusText("Recherche GPS...");

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    });
  }, [handleSuccess, handleError]);

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopWatching();
  }, [stopWatching]);

  return { position, status, statusText, address, zone, startWatching, stopWatching };
}
