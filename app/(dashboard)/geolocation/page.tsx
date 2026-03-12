"use client";

/**
 * Page Géolocalisation / Disponibilité — e-Dr TIM Delivery System
 * Carte Leaflet (import dynamique), toggle disponibilité, notifications
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNotifications } from "@/hooks/useNotifications";
import { getDeliveryStatus } from "@/lib/auth";
import {
  MapPin,
  Bell,
  Crosshair,
  Plus,
  Minus,
  Satellite,
  HelpCircle,
  RefreshCw,
  Bike,
  Lock,
  X,
} from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletMap = any;

export default function GeolocationPage() {
  const router = useRouter();
  const { position, status, statusText, address, zone, startWatching, stopWatching } = useGeolocation();
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();

  const [driverStatus, setDriverStatus] = useState<string | null>(null);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<(typeof notifications)[0] | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<LeafletMap>(null);
  const markerRef = useRef<LeafletMap>(null);

  useEffect(() => {
    setDriverStatus(getDeliveryStatus());
  }, []);

  // ---- Initialisation de la carte Leaflet (SSR safe) ----
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || leafletMap.current) return;

      // Fix icônes Leaflet avec Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Créer la carte centrée sur Douala (défaut Cameroun)
      leafletMap.current = L.map(mapRef.current, {
        center: [4.05, 9.7],
        zoom: 13,
        zoomControl: false,
      });

      // Tuile OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(leafletMap.current);
    });

    startWatching();

    return () => {
      stopWatching();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Mettre à jour le marqueur quand la position change ----
  useEffect(() => {
    if (!position || !leafletMap.current) return;

    import("leaflet").then((L) => {
      const { latitude, longitude } = position;

      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      } else {
        markerRef.current = L.marker([latitude, longitude])
          .addTo(leafletMap.current)
          .bindPopup("Votre position");
      }

      leafletMap.current.setView([latitude, longitude], leafletMap.current.getZoom());
    });
  }, [position]);



  // ---- Centrer sur l'utilisateur ----
  function centerOnUser() {
    if (position && leafletMap.current) {
      leafletMap.current.setView([position.latitude, position.longitude], 16);
    }
  }

  // ---- Couleurs statut GPS ----
  const gpsStatusColor =
    status === "active" ? "bg-green-400" :
      status === "searching" ? "bg-amber-400 pulse-dot" :
        "bg-red-400";



  return (
    <>
      {/* ============ CONTENU PRINCIPAL ============ */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">


        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">

            {/* Heading */}
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#1E293B] tracking-tight">
                Disponibilité Livreur
              </h1>
              <p className="text-[#94A3B8] text-sm mt-1">
                Gérez votre statut pour recevoir des demandes de livraison et surveillez votre position GPS.
              </p>
            </div>

            {/* Grid : Carte + Panneau */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

              {/* Carte Leaflet */}
              <div
                className="lg:col-span-8 flex flex-col rounded-2xl overflow-hidden border border-[#E2E8F0] bg-[#F8FAFC] relative shadow-lg"
                style={{ minHeight: "350px" }}
              >
                {/* Zone actuelle */}
                <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 pointer-events-none">
                  <div className="bg-white/90 backdrop-blur-md border border-[#E2E8F0] px-4 py-2 rounded-xl shadow-lg pointer-events-auto">
                    <div className="flex items-center gap-2 text-[#94A3B8] text-xs uppercase tracking-wider font-semibold">
                      <MapPin size={14} className="text-[#22C55E]" />
                      Zone actuelle
                    </div>
                    <div className="text-[#1E293B] font-bold text-sm mt-0.5">
                      {zone || "Recherche de position..."}
                    </div>
                  </div>
                </div>

                {/* Boutons carte */}
                <div className="absolute bottom-16 md:bottom-12 right-3 md:right-4 z-10 flex flex-col gap-2">
                  {[
                    { icon: Crosshair, action: centerOnUser, title: "Centrer" },
                    { icon: Plus, action: () => leafletMap.current?.zoomIn(), title: "Zoom +" },
                    { icon: Minus, action: () => leafletMap.current?.zoomOut(), title: "Zoom -" },
                  ].map(({ icon: Icon, action, title }) => (
                    <button
                      key={title}
                      onClick={action}
                      title={title}
                      className="bg-white text-[#1E293B] p-2.5 md:p-3 rounded-xl shadow-lg hover:bg-[#F0FDF4] transition-colors border border-[#E2E8F0]"
                    >
                      <Icon size={18} />
                    </button>
                  ))}
                </div>

                {/* Div pour la carte */}
                <div ref={mapRef} className="w-full flex-1" style={{ minHeight: "300px" }} />

                {/* Pied de carte */}
                <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm py-2 px-4 text-xs text-[#94A3B8] border-t border-[#E2E8F0] flex justify-between items-center z-10">
                  <span>
                    Dernière mise à jour :{" "}
                    {position ? new Date().toLocaleTimeString("fr-FR") : "--"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Lock size={10} />
                    Connexion sécurisée
                  </span>
                </div>
              </div>

              {/* Panneau de contrôle */}
              <div className="lg:col-span-4 flex flex-col gap-4 md:gap-6">

                {/* Carte statut — backend */}
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[#1E293B] font-bold text-base md:text-lg">
                      Statut actuel
                    </h3>
                    <span
                      className={`flex w-3 h-3 rounded-full ${driverStatus === "IS_FREE" ? "bg-emerald-400 animate-pulse" : "bg-slate-400"
                        }`}
                    />
                  </div>

                  {driverStatus ? (
                    <div
                      className={`flex items-center gap-3 px-4 py-4 rounded-xl border ${driverStatus === "IS_FREE"
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-slate-50 border-slate-200"
                        }`}
                    >
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${driverStatus === "IS_FREE"
                            ? "bg-emerald-500 animate-pulse"
                            : "bg-slate-400"
                          }`}
                      />
                      <div>
                        <p
                          className={`text-sm font-bold ${driverStatus === "IS_FREE" ? "text-emerald-700" : "text-slate-600"
                            }`}
                        >
                          {driverStatus === "IS_FREE" ? "Disponible" : "Occupé"}
                        </p>
                        <p className="text-xs text-[#94A3B8] mt-0.5">
                          Statut géré par le serveur
                        </p>
                      </div>
                      <span
                        className={`ml-auto text-[10px] font-mono font-bold px-2 py-1 rounded-lg ${driverStatus === "IS_FREE"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {driverStatus}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-4 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0" />
                      <p className="text-sm text-[#94A3B8]">Statut inconnu — reconnectez-vous</p>
                    </div>
                  )}
                </div>

                {/* Télémétrie GPS */}
                <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-[#E2E8F0] flex flex-col gap-4">
                  <h3 className="text-[#1E293B] font-bold text-sm md:text-base flex items-center gap-2">
                    <Satellite size={18} className="text-[#22C55E]" />
                    Télémétrie GPS
                  </h3>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <div className="flex flex-col p-2.5 md:p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-[9px] md:text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">
                        Latitude
                      </span>
                      <span className="text-xs md:text-sm font-mono text-[#1E293B]">
                        {position ? position.latitude.toFixed(6) : "--"}
                      </span>
                    </div>
                    <div className="flex flex-col p-2.5 md:p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                      <span className="text-[9px] md:text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">
                        Longitude
                      </span>
                      <span className="text-xs md:text-sm font-mono text-[#1E293B]">
                        {position ? position.longitude.toFixed(6) : "--"}
                      </span>
                    </div>
                    <div className="flex flex-col p-2.5 md:p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] col-span-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] md:text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">
                          Adresse
                        </span>
                        {position && (
                          <span className="text-[9px] md:text-[10px] text-[#94A3B8] bg-[#E2E8F0] px-1.5 py-0.5 rounded">
                            ±{position.accuracy ? Math.round(position.accuracy) : "--"}m
                          </span>
                        )}
                      </div>
                      <span className="text-xs md:text-sm font-medium text-[#1E293B] mt-1 truncate">
                        {address || "En attente de position..."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lien vers missions */}
                <a
                  href="/missions"
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#22C55E]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Bike size={20} />
                  <span>Voir les missions</span>
                </a>

                {/* Aide GPS */}
                <div className="bg-[#F0FDF4] rounded-2xl p-4 border border-dashed border-[#22C55E]/30 flex flex-col items-center text-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#94A3B8]">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#1E293B]">Problèmes GPS ?</span>
                    <p className="text-xs text-[#94A3B8]">
                      Vérifiez que la géolocalisation est activée.
                    </p>
                  </div>
                  <button
                    onClick={() => { stopWatching(); startWatching(); }}
                    className="text-xs font-bold text-[#22C55E] hover:underline flex items-center gap-1"
                  >
                    <RefreshCw size={12} />
                    Actualiser la position
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ======= MODAL NOTIFICATION ======= */}
      {showNotifModal && selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowNotifModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4 border border-[#E2E8F0] z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                <Bell size={22} className="text-[#22C55E]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-[#1E293B] leading-tight">
                  {selectedNotif.title}
                </h3>
                <p className="text-xs text-[#94A3B8] mt-1">
                  {new Date(selectedNotif.receivedAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => setShowNotifModal(false)}
                className="p-2 rounded-full hover:bg-[#F0FDF4] text-[#94A3B8] transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[#64748B] leading-relaxed">
              {selectedNotif.body}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowNotifModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#F8FAFC] text-[#64748B] font-semibold text-sm hover:bg-[#F1F5F9] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
