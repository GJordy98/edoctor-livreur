"use client";

/**
 * Page Géolocalisation / Disponibilité — e-Dr TIM Delivery System
 * Migré fidèlement depuis geolocation.html + geolocation.js
 * Carte Leaflet (import dynamique), toggle disponibilité, notifications FCM
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNotifications } from "@/hooks/useNotifications";
import { setAvailability } from "@/lib/api-client";
import { getUserInfo, clearAuth, type UserInfo } from "@/lib/auth";

// ---- Types Leaflet (déclaration légère pour éviter SSR) ----
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletMap = any;

export default function GeolocationPage() {
  const router = useRouter();
  const { position, status, statusText, address, zone, startWatching, stopWatching } = useGeolocation();
  const { notifications, unreadCount, markAllAsRead, clearAll } = useNotifications();

  const [isAvailable, setIsAvailable] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<(typeof notifications)[0] | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<LeafletMap>(null);
  const markerRef = useRef<LeafletMap>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Charger userInfo côté client uniquement (évite la mismatch SSR/localStorage)
  useEffect(() => {
    setUserInfo(getUserInfo());
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

    // Démarrer la surveillance GPS
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

  // ---- Toggle disponibilité ----
  async function handleToggleAvailability() {
    const next = !isAvailable;
    setIsAvailable(next);
    await setAvailability(next);
  }

  // ---- Centrer sur l'utilisateur ----
  function centerOnUser() {
    if (position && leafletMap.current) {
      leafletMap.current.setView([position.latitude, position.longitude], 16);
    }
  }

  // ---- Déconnexion ----
  function logout() {
    clearAuth();
    router.push("/login");
  }

  // ---- Couleurs statut GPS ----
  const gpsStatusColor =
    status === "active" ? "bg-green-400" :
      status === "searching" ? "bg-amber-400 pulse-dot" :
        "bg-red-400";

  const modeLabel = isAvailable ? "DISPONIBLE" : "HORS LIGNE";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f0faf4] dark:bg-[#071324] text-slate-900 dark:text-slate-100">

      {/* ============ SIDEBAR ============ */}
      <aside className="hidden md:flex w-64 h-full flex-col justify-between border-r border-green-100 dark:border-[#1a3a6e] bg-white dark:bg-[#081730] p-4">
        <div className="flex flex-col gap-6">
          {/* Brand */}
          <div className="px-2">
            <h1 className="text-slate-900 dark:text-white text-xl font-bold flex items-center gap-2">
              e-Dr TIM
            </h1>
            <p className="text-slate-500 dark:text-[#7a9bbf] text-xs font-medium mt-1">
              Tableau de bord Livreur
            </p>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-2">
            {[
              { icon: "location_on", label: "Géolocalisation", href: "/geolocation", active: true },
              { icon: "inventory_2", label: "Livraisons actives", href: "/missions" },
              { icon: "schedule", label: "Historique", href: "/history" },
              { icon: "autorenew", label: "Mission en cours", href: "/missions" },
              { icon: "shopping_cart", label: "Livraison", href: "/orders/incoming" },
              { icon: "settings", label: "Paramètres", href: "/settings" },
            ].map(({ icon, label, href, active }) => (
              <a
                key={label}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${active
                  ? "bg-[#2E8B57]/10 dark:bg-[#2E8B57]/20 text-[#2E8B57] font-semibold"
                  : "hover:bg-green-50 dark:hover:bg-[#0d2040] text-slate-600 dark:text-[#7a9bbf]"
                  }`}
              >
                <span className="material-icons">{icon}</span>
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </div>

        {/* User card + logout */}
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-xl bg-green-50 dark:bg-[#112b52] border border-green-100 dark:border-[#1a3a6e]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full ring-2 ring-[#2E8B57]/20 bg-[#2E8B57]/10 flex items-center justify-center">
                <span className="material-icons text-[#2E8B57]">person</span>
              </div>
              <div className="flex flex-col overflow-hidden flex-1">
                <p className="text-sm font-bold truncate dark:text-white">
                  {userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : "Chargement..."}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {userInfo?.telephone || "---"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <span className="material-icons text-sm">logout</span>
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* ============ CONTENU PRINCIPAL ============ */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-green-100 dark:border-[#1a3a6e] bg-white dark:bg-[#0a1d38] px-4 md:px-6 py-3 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-slate-900 dark:text-white text-base md:text-lg font-bold tracking-tight">
              Géolocalisation
            </h2>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {/* Badge GPS */}
            <div className="flex items-center px-3 py-1.5 rounded-full bg-green-50 dark:bg-[#112b52] border border-green-100 dark:border-[#1a3a6e]">
              <div className={`w-2 h-2 rounded-full mr-2 ${gpsStatusColor}`} />
              <span className="text-xs font-bold text-slate-500 hidden sm:inline">{statusText}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 text-slate-500 hover:text-slate-700 dark:text-[#7a9bbf] dark:hover:text-white transition-colors rounded-xl hover:bg-green-50 dark:hover:bg-[#1a3a6e]"
              >
                <span className="material-icons">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#0a1d38]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Dropdown notifications */}
              {showNotifDropdown && (
                <div className="absolute right-0 top-12 w-80 max-w-[90vw] z-50 rounded-xl border border-green-100 dark:border-[#1a3a6e] bg-white dark:bg-[#0d2040] shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-green-100 dark:border-[#1a3a6e]">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Notifications</span>
                    <button
                      onClick={() => { clearAll(); markAllAsRead(); }}
                      className="text-[11px] font-semibold text-[#2E8B57] hover:underline"
                    >
                      Effacer
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">
                      Aucune notification pour le moment.
                    </div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                      {notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => { setSelectedNotif(n); setShowNotifModal(true); setShowNotifDropdown(false); }}
                          className={`w-full text-left px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.read ? "bg-[#2E8B57]/5" : ""
                            }`}
                        >
                          <p className="text-xs font-bold text-slate-800 dark:text-white">{n.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{n.body}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto flex flex-col gap-6">

            {/* Heading */}
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Disponibilité Livreur
              </h1>
              <p className="text-slate-500 dark:text-[#9da6b9] text-sm mt-1">
                Gérez votre statut pour recevoir des demandes de livraison et surveillez votre position GPS.
              </p>
            </div>

            {/* Grid : Carte + Panneau */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">

              {/* Carte Leaflet */}
              <div
                className="lg:col-span-8 flex flex-col rounded-2xl overflow-hidden border border-green-100 dark:border-[#1a3a6e] bg-gray-100 dark:bg-[#112b52] relative shadow-lg"
                style={{ minHeight: "350px" }}
              >
                {/* Zone actuelle */}
                <div className="absolute top-3 left-3 md:top-4 md:left-4 z-10 pointer-events-none">
                  <div className="bg-white/90 dark:bg-[#081730]/90 backdrop-blur-md border border-green-100 dark:border-[#1a3a6e] px-4 py-2 rounded-lg shadow-lg pointer-events-auto">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider font-semibold">
                      <span className="material-icons text-[#2E8B57] text-sm">my_location</span>
                      Zone actuelle
                    </div>
                    <div className="text-slate-900 dark:text-white font-bold text-sm mt-0.5">
                      {zone || "Recherche de position..."}
                    </div>
                  </div>
                </div>

                {/* Boutons carte */}
                <div className="absolute bottom-16 md:bottom-12 right-3 md:right-4 z-10 flex flex-col gap-2">
                  {[
                    { icon: "my_location", action: centerOnUser, title: "Centrer" },
                    { icon: "add", action: () => leafletMap.current?.zoomIn(), title: "Zoom +" },
                    { icon: "remove", action: () => leafletMap.current?.zoomOut(), title: "Zoom -" },
                  ].map(({ icon, action, title }) => (
                    <button
                      key={icon}
                      onClick={action}
                      title={title}
                      className="bg-white dark:bg-[#0d2040] text-slate-700 dark:text-white p-2.5 md:p-3 rounded-xl shadow-lg hover:bg-green-50 dark:hover:bg-[#112b52] transition-colors border border-green-100 dark:border-[#1a3a6e]"
                    >
                      <span className="material-icons text-lg md:text-xl">{icon}</span>
                    </button>
                  ))}
                </div>

                {/* Div pour la carte */}
                <div ref={mapRef} className="w-full flex-1" style={{ minHeight: "300px" }} />

                {/* Pied de carte */}
                <div className="absolute bottom-0 inset-x-0 bg-white/90 dark:bg-[#081730]/90 backdrop-blur-sm py-2 px-4 text-xs text-slate-500 dark:text-[#4a6a8a] border-t border-green-100 dark:border-[#1a3a6e] flex justify-between items-center z-10">
                  <span>
                    Dernière mise à jour :{" "}
                    {position ? new Date().toLocaleTimeString("fr-FR") : "--"}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="material-icons text-xs">lock</span>
                    Connexion sécurisée
                  </span>
                </div>
              </div>

              {/* Panneau de contrôle */}
              <div className="lg:col-span-4 flex flex-col gap-4 md:gap-6">

                {/* Carte statut */}
                <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-4 md:p-6 shadow-sm border border-green-100 dark:border-[#1a3a6e] flex flex-col gap-4 md:gap-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-slate-900 dark:text-white font-bold text-base md:text-lg">
                      Statut actuel
                    </h3>
                    <span
                      className={`flex w-3 h-3 rounded-full ${isAvailable ? "bg-green-400" : "bg-slate-400"
                        }`}
                    />
                  </div>

                  <div className="p-3 md:p-4 rounded-xl bg-gray-50 dark:bg-[#071324] border border-gray-100 dark:border-[#1a3a6e]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Mode
                      </span>
                      <span
                        className={`text-xs font-bold ${isAvailable ? "text-green-500" : "text-slate-500"
                          }`}
                      >
                        {modeLabel}
                      </span>
                    </div>

                    {/* Toggle */}
                    <label className="relative flex items-center cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={isAvailable}
                        onChange={handleToggleAvailability}
                        className="sr-only peer"
                      />
                      <div className="w-full h-12 md:h-14 bg-gray-200 dark:bg-[#112b52] rounded-lg peer-checked:bg-[#2E8B57]/20 transition-colors flex items-center px-1 relative overflow-hidden">
                        <span className="absolute left-3 md:left-4 z-10 text-xs font-bold text-slate-500 dark:text-slate-400">
                          OCCUPÉ
                        </span>
                        <span className="absolute right-3 md:right-4 z-10 text-xs font-bold text-slate-400 dark:text-slate-500">
                          DISPONIBLE
                        </span>
                        <div
                          className={`w-1/2 h-10 md:h-12 rounded-md shadow-sm absolute transition-all duration-300 ease-out flex items-center justify-center border ${isAvailable
                            ? "left-[calc(50%-4px)] bg-[#2E8B57] border-[#2E8B57]"
                            : "left-1 bg-white dark:bg-[#0d1e3a] border-gray-200 dark:border-[#1a3a6e]"
                            }`}
                        >
                          <span className={`material-icons text-lg ${isAvailable ? "text-white" : "text-slate-700 dark:text-white"}`}>
                            check_circle
                          </span>
                        </div>
                      </div>
                    </label>

                    <p className="text-xs text-slate-500 mt-3 text-center">
                      Activez <span className="font-bold text-slate-700 dark:text-slate-300">Disponible</span>{" "}
                      pour recevoir des demandes.
                    </p>
                  </div>
                </div>

                {/* Télémétrie GPS */}
                <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-4 md:p-6 shadow-sm border border-green-100 dark:border-[#1a3a6e] flex flex-col gap-4">
                  <h3 className="text-slate-900 dark:text-white font-bold text-sm md:text-base flex items-center gap-2">
                    <span className="material-icons text-[#2E8B57] text-lg md:text-xl">satellite_alt</span>
                    Télémétrie GPS
                  </h3>
                  <div className="grid grid-cols-2 gap-2 md:gap-3">
                    <div className="flex flex-col p-2.5 md:p-3 rounded-xl bg-gray-50 dark:bg-[#071324] border border-gray-100 dark:border-[#1a3a6e]">
                      <span className="text-[9px] md:text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        Latitude
                      </span>
                      <span className="text-xs md:text-sm font-mono text-slate-700 dark:text-slate-200">
                        {position ? position.latitude.toFixed(6) : "--"}
                      </span>
                    </div>
                    <div className="flex flex-col p-2.5 md:p-3 rounded-xl bg-gray-50 dark:bg-[#071324] border border-gray-100 dark:border-[#1a3a6e]">
                      <span className="text-[9px] md:text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                        Longitude
                      </span>
                      <span className="text-xs md:text-sm font-mono text-slate-700 dark:text-slate-200">
                        {position ? position.longitude.toFixed(6) : "--"}
                      </span>
                    </div>
                    <div className="flex flex-col p-2.5 md:p-3 rounded-lg bg-slate-50 dark:bg-[#111318] border border-slate-200 dark:border-slate-800 col-span-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] md:text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                          Adresse
                        </span>
                        {position && (
                          <span className="text-[9px] md:text-[10px] text-slate-500 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            ±{position.accuracy ? Math.round(position.accuracy) : "--"}m
                          </span>
                        )}
                      </div>
                      <span className="text-xs md:text-sm font-medium text-slate-700 dark:text-slate-200 mt-1 truncate">
                        {address || "En attente de position..."}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lien vers missions */}
                <a
                  href="/missions"
                  className="bg-[#2E8B57] hover:bg-[#20603D] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#2E8B57]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span className="material-icons">delivery_dining</span>
                  <span>Voir les missions</span>
                </a>

                {/* Aide GPS */}
                <div className="bg-green-50 dark:bg-[#0d2040] rounded-2xl p-4 border border-dashed border-[#2E8B57]/30 dark:border-[#1a3a6e] flex flex-col items-center text-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-[#112b52] flex items-center justify-center text-gray-400 dark:text-[#7a9bbf]">
                    <span className="material-icons">help_outline</span>
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">Problèmes GPS ?</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Vérifiez que la géolocalisation est activée.
                    </p>
                  </div>
                  <button
                    onClick={() => { stopWatching(); startWatching(); }}
                    className="text-xs font-bold text-[#2E8B57] hover:underline flex items-center gap-1"
                  >
                    <span className="material-icons text-sm">refresh</span>
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
          <div className="relative bg-white dark:bg-[#0d2040] rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4 border border-green-100 dark:border-[#1a3a6e] z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2E8B57]/10 flex items-center justify-center shrink-0">
                <span className="material-icons text-[#2E8B57] text-2xl">notifications</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                  {selectedNotif.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {new Date(selectedNotif.receivedAt).toLocaleString("fr-FR")}
                </p>
              </div>
              <button
                onClick={() => setShowNotifModal(false)}
                className="p-2 rounded-full hover:bg-green-50 dark:hover:bg-[#1a3a6e] text-slate-400 transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {selectedNotif.body}
            </p>
            <div className="flex gap-3 mt-2">
              <button
                onClick={() => setShowNotifModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 dark:bg-[#112b52] text-gray-700 dark:text-[#7a9bbf] font-semibold text-sm hover:bg-gray-200 dark:hover:bg-[#1a3a6e] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
