"use client";

/**
 * Page Suivi en direct — e-Dr TIM Delivery System
 * Affiche :
 *   - Position GPS du livreur (point bleu pulsant)
 *   - Officines de collecte (points verts numérotés, depuis /pickup-qr-code/?mission=id)
 *   - Trajet OSRM livreur → officines
 *   - Bouton "Commencer la collecte" → /mission-active
 */

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  getPickupOfficinesForMission,
  getMissionById,
  type MissionInfoResponse,
  type PickupOfficine,
} from "@/lib/api-client";
import { useGeolocation } from "@/hooks/useGeolocation";
import type { MapViewHandle, PharmacyPoint } from "./MapView";
import {
  Building2, Phone, User, Crosshair, Plus, Minus, MapPin,
  RefreshCw, Loader2, Store, ChevronRight, Navigation,
} from "lucide-react";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

// ─── Types ─────────────────────────────────────────────────────────────────

type Phase = "pickup" | "delivery";

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TrackingPage() {
  const router = useRouter();
  const mapRef = useRef<MapViewHandle>(null);
  const { position: geoPos, startWatching } = useGeolocation();

  const [missionId, setMissionId] = useState("");
  const [missionInfo, setMissionInfo] = useState<MissionInfoResponse | null>(null);
  const [officines, setOfficines] = useState<PickupOfficine[]>([]);
  const [phase, setPhase] = useState<Phase>("pickup");
  const [loading, setLoading] = useState(true);
  const [noMission, setNoMission] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { startWatching(); }, [startWatching]);

  const userPosition = geoPos
    ? { lat: geoPos.latitude, lng: geoPos.longitude }
    : null;

  // ── Extracteur universel de coordonnées GPS ────────────────────────────
  function extractCoords(obj: Record<string, unknown>): { lat: number; lng: number } | null {
    const candidates = (keys: string[]) =>
      keys.map(k => (obj as Record<string, unknown>)[k]).find(
        v => v !== undefined && v !== null && v !== "" && !isNaN(Number(v))
      );
    const lat = candidates(["latitude", "lat", "Latitude", "Lat"]);
    const lng = candidates(["longitude", "lng", "Longitude", "Lng"]);
    if (lat === undefined || lng === undefined) return null;
    const la = Number(lat), lo = Number(lng);
    if (isNaN(la) || isNaN(lo) || la === 0 || lo === 0) return null;
    return { lat: la, lng: lo };
  }

  // ── Charger la mission depuis localStorage ──────────────────────────────

  const fetchData = useCallback(async (mId: string) => {
    if (!mId) { setNoMission(true); setLoading(false); return; }
    try {
      // getPickupOfficinesForMission utilise maintenant le bon endpoint :
      // /pickup-qr-code/get_all_qr_code_order/?mission=<id>
      // Il retourne des PickupOfficine avec latitude/longitude depuis officine.adresse
      const [info, pickupOfficines] = await Promise.all([
        getMissionById(mId).catch(() => null as MissionInfoResponse | null),
        getPickupOfficinesForMission(mId).catch(() => [] as PickupOfficine[]),
      ]);

      console.log("[Tracking] getMissionById →", info);
      console.log("[Tracking] pickupOfficines →", pickupOfficines);

      if (!info && pickupOfficines.length === 0) {
        setNoMission(true);
        setLoading(false);
        return;
      }
      if (info) setMissionInfo(info);
      setNoMission(false);

      // Sauvegarder le premier QR code disponible (pour la page collecte)
      if (pickupOfficines.length > 0) {
        const firstQr = pickupOfficines[0].qr_code;
        if (firstQr) localStorage.setItem("delivery_pickup_code", String(firstQr));
      }

      // Construire la liste des pharmacies pour la carte
      // Source primaire : les PickupOfficine qui ont maintenant les coords depuis adresse
      const officinesWithCoords = pickupOfficines.filter(
        (o) => o.latitude && o.longitude &&
          !isNaN(Number(o.latitude)) && !isNaN(Number(o.longitude))
      );

      if (officinesWithCoords.length > 0) {
        // Utiliser les pharmacies de l'endpoint pickup (les vraies destinations)
        setOfficines(officinesWithCoords);
      } else if (info?.officine) {
        // Fallback : utiliser l'officine issue de getMissionById si pas de GPS dans pickup
        const officine = info.officine;
        const coords = extractCoords(officine as unknown as Record<string, unknown>);
        const lat = coords?.lat ?? officine.latitude;
        const lng = coords?.lng ?? officine.longitude;
        if (lat && lng) {
          setOfficines([{
            id: "mission-officine",
            name: officine.name,
            address: officine.address,
            telephone: officine.telephone,
            latitude: lat,
            longitude: lng,
          }]);
        } else {
          setOfficines([]);
          console.warn("[Tracking] Aucune coordonnée GPS disponible pour les pharmacies");
        }
      } else {
        setOfficines([]);
        console.warn("[Tracking] Aucune officine avec GPS trouvée");
      }
    } catch (err) {
      console.error("[Tracking] fetchData error:", err);
      setNoMission(true);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  useEffect(() => {
    const stored = localStorage.getItem("current_mission");
    const savedPhase = (localStorage.getItem("mission_phase") as Phase) || "pickup";
    setPhase(savedPhase);

    if (!stored) { setNoMission(true); setLoading(false); return; }
    try {
      const m = JSON.parse(stored) as { id?: string };
      const mId = m.id || "";
      setMissionId(mId);
      fetchData(mId);
    } catch {
      setNoMission(true);
      setLoading(false);
    }
  }, [fetchData]);

  const handleRefresh = async () => {
    if (!missionId) return;
    setRefreshing(true);
    await fetchData(missionId);
    setRefreshing(false);
  };

  // ── Calculer les positions pour la carte ───────────────────────────────

  // Officines avec coordonnées GPS valides → marqueurs verts numérotés
  const validOfficines = officines.filter(
    (o) => o.latitude && o.longitude && !isNaN(Number(o.latitude)) && !isNaN(Number(o.longitude))
  );

  // Tableau PharmacyPoint pour MapView (phase collecte uniquement)
  const pharmacyPoints: PharmacyPoint[] = phase === "pickup"
    ? validOfficines.map((o, idx) => ({
      lat: Number(o.latitude),
      lng: Number(o.longitude),
      name: o.name,
      index: idx,
    }))
    : [];

  // Phase livraison → position patient
  const patientPosition =
    phase === "delivery" && missionInfo?.patient?.latitude && missionInfo?.patient?.longitude
      ? { lat: Number(missionInfo.patient.latitude), lng: Number(missionInfo.patient.longitude) }
      : undefined;

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10 text-slate-400">
        <Loader2 size={24} className="animate-spin mr-3" />
        Initialisation du suivi…
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-64px)] -m-4 md:-m-6 overflow-hidden bg-slate-950">

      {/* ── Carte Leaflet ── */}
      <MapView
        ref={mapRef}
        userPosition={userPosition}
        pharmacies={pharmacyPoints}
        patientPosition={patientPosition}
        showRoute={true}
      />

      {/* ── Overlay panneaux ── */}
      <div className="relative z-10 flex flex-col md:flex-row h-full pointer-events-none p-3 md:p-5 gap-4">
        <div className="flex-1" />

        {/* Panneau droit */}
        <div className="pointer-events-auto w-full md:w-[360px] flex flex-col gap-3 h-fit max-h-full overflow-y-auto">

          {/* ── Aucune mission ── */}
          {noMission ? (
            <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 p-6 shadow-2xl text-center">
              <Building2 size={40} className="text-slate-500 mx-auto mb-3" />
              <p className="text-slate-300 font-bold">Aucune mission active</p>
              <p className="text-slate-500 text-sm mt-1">
                Acceptez une mission depuis la page Missions pour voir le suivi.
              </p>
              <button
                onClick={() => router.push("/missions")}
                className="mt-4 px-5 py-2.5 rounded-xl bg-[#22C55E] text-white text-sm font-bold hover:bg-[#16A34A] transition-colors"
              >
                Voir les missions
              </button>
            </div>
          ) : (
            <>
              {/* ── Sélecteur de phase ── */}
              <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-3 shadow-xl flex gap-2">
                <button
                  onClick={() => { setPhase("pickup"); localStorage.setItem("mission_phase", "pickup"); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${phase === "pickup"
                    ? "bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/30"
                    : "text-slate-400 hover:bg-slate-800"
                    }`}
                >
                  <Store size={13} />Phase 1 — Collecte
                </button>
                <button
                  onClick={() => { setPhase("delivery"); localStorage.setItem("mission_phase", "delivery"); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${phase === "delivery"
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                    : "text-slate-400 hover:bg-slate-800"
                    }`}
                >
                  <Navigation size={13} />Phase 2 — Livraison
                </button>
              </div>

              {/* ── Statut mission ── */}
              <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      Mission en cours
                    </span>
                  </div>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="text-slate-500 hover:text-white transition-colors"
                    title="Actualiser"
                  >
                    <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                  </button>
                </div>

                {/* Légende */}
                <div className="flex gap-3 mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow" />
                    Ma position
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <div className="w-3.5 h-3.5 rounded-lg bg-[#22C55E] border-2 border-white shadow flex items-center justify-center text-[8px] text-white font-black">1</div>
                    Officine
                  </div>
                  {phase === "delivery" && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow" />
                      Patient
                    </div>
                  )}
                </div>

                {/* PHASE 1 : liste officines */}
                {phase === "pickup" && (
                  <div className="space-y-2">
                    {validOfficines.length === 0 ? (
                      <p className="text-slate-500 text-xs text-center py-2">Aucune officine avec coordonnées GPS</p>
                    ) : (
                      validOfficines.map((off, idx) => (
                        <div
                          key={off.id ?? idx}
                          className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/50"
                        >
                          {/* Badge numéro */}
                          <div className="w-8 h-8 rounded-lg bg-[#22C55E] flex items-center justify-center text-white font-black text-sm shrink-0 shadow-lg shadow-[#22C55E]/30">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">
                              {off.name || `Officine ${idx + 1}`}
                            </p>
                            {off.address && (
                              <p className="text-slate-400 text-xs mt-0.5 leading-tight truncate">
                                <MapPin size={9} className="inline mr-0.5" />{off.address}
                              </p>
                            )}
                            {off.telephone && (
                              <a
                                href={`tel:${off.telephone}`}
                                className="text-[#22C55E] text-xs flex items-center gap-0.5 mt-0.5 hover:underline"
                              >
                                <Phone size={9} />{off.telephone}
                              </a>
                            )}
                          </div>
                          {/* Lien Maps */}
                          {off.latitude && off.longitude && (
                            <a
                              href={`https://maps.google.com/?q=${off.latitude},${off.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title="Ouvrir dans Maps"
                            >
                              <MapPin size={13} />
                            </a>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* PHASE 2 : infos patient */}
                {phase === "delivery" && missionInfo?.patient && (
                  <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800/50">
                    <div className="w-9 h-9 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                      <User size={16} className="text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-0.5">
                        Patient (destination)
                      </p>
                      <p className="text-white font-bold text-sm truncate">
                        {[missionInfo.patient.first_name, missionInfo.patient.last_name].filter(Boolean).join(" ") || "—"}
                      </p>
                      {missionInfo.patient.address && (
                        <p className="text-slate-400 text-xs mt-0.5 leading-tight">{missionInfo.patient.address}</p>
                      )}
                      {missionInfo.patient.telephone && (
                        <a
                          href={`tel:${missionInfo.patient.telephone}`}
                          className="text-blue-400 text-xs flex items-center gap-1 mt-1 hover:underline"
                        >
                          <Phone size={10} />{missionInfo.patient.telephone}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Bouton commencer la collecte ── */}
              <button
                onClick={() => router.push("/mission-active")}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold shadow-lg shadow-[#22C55E]/25 transition-all active:scale-[0.98]"
              >
                <Store size={16} />
                {phase === "pickup" ? "Commencer la collecte" : "Gérer la mission"}
                <ChevronRight size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Contrôles carte ── */}
      <div className="absolute bottom-6 left-4 z-20 flex flex-col gap-2 pointer-events-auto">
        <button
          onClick={() => mapRef.current?.flyToUser()}
          className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-800 active:scale-95 transition shadow-lg"
          title="Ma position"
        >
          <Crosshair size={18} />
        </button>
        <div className="flex flex-col rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            className="w-10 h-10 text-white flex items-center justify-center hover:bg-slate-800 active:scale-95 transition border-b border-slate-800"
            title="Zoom +"
          >
            <Plus size={18} />
          </button>
          <button
            onClick={() => mapRef.current?.zoomOut()}
            className="w-10 h-10 text-white flex items-center justify-center hover:bg-slate-800 active:scale-95 transition"
            title="Zoom -"
          >
            <Minus size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
