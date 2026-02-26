"use client";

/**
 * Page Missions Actives — e-Dr TIM Delivery System
 * Migré fidèlement depuis actives_missions.html + actives_missions.js
 * Flux : Activer livraison → Recherche mission → Modal countdown → Accepter/Refuser
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getLastMission,
  getMissionInfo,
  acceptMission,
  cancelMission,
  getNotifications,
  type ApiNotification,
  type MissionInfoResponse,
} from "@/lib/api-client";
import { getUserInfo, clearAuth, type UserInfo } from "@/lib/auth";

// ---- Types ----
interface Mission {
  id: string;
  pharmacy_name?: string;
  title?: string;
  pickup_address?: string;
  address?: string;
  items_count?: number;
  total_items?: number;
  distance_km?: number;
  estimated_minutes?: number;
}

type AppState = "idle" | "loading" | "no-mission" | "incoming" | "active";

// ---- Component ----
export default function MissionsPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Charger userInfo côté client uniquement (évite la mismatch SSR/localStorage)
  useEffect(() => {
    setUserInfo(getUserInfo());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [appState, setAppState] = useState<AppState>("idle");
  const [isOnline, setIsOnline] = useState(false);
  const [currentMission, setCurrentMission] = useState<Mission | null>(null);
  const [missionInfo, setMissionInfo] = useState<MissionInfoResponse | null>(null);
  const [missionInfoLoading, setMissionInfoLoading] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [gpsStatus, setGpsStatus] = useState<"inactive" | "searching" | "active" | "error">("inactive");

  // Notifications
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<ApiNotification | null>(null);

  // Refs for intervals / watchId
  const missionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsWatchRef = useRef<number | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ---- Charger détails mission active ----
  const fetchMissionInfo = useCallback(async () => {
    setMissionInfoLoading(true);
    try {
      const info = await getMissionInfo();
      setMissionInfo(info);
    } catch {
      // ignore
    } finally {
      setMissionInfoLoading(false);
    }
  }, []);

  // Vérifier si une mission est en cours au chargement
  useEffect(() => {
    const saved = localStorage.getItem("current_mission");
    if (saved) {
      try {
        const mission = JSON.parse(saved) as Mission;
        setCurrentMission(mission);
        setIsOnline(true);
        setAppState("active");
        fetchMissionInfo();
      } catch {
        // ignore
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- GPS ----
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("searching");
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      () => setGpsStatus("active"),
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => {
      if (gpsWatchRef.current !== null) navigator.geolocation.clearWatch(gpsWatchRef.current);
    };
  }, []);

  // ---- Notifications polling ----
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications((prev) => {
        const ids = new Set(prev.map((n) => n.id));
        const merged = [...prev];
        data.forEach((n) => {
          if (!ids.has(n.id)) merged.push(n);
          else {
            const idx = merged.findIndex((x) => x.id === n.id);
            if (idx !== -1) merged[idx] = n;
          }
        });
        return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    notifIntervalRef.current = setInterval(fetchNotifications, 30_000);
    return () => { if (notifIntervalRef.current) clearInterval(notifIntervalRef.current); };
  }, [fetchNotifications]);

  // ---- Check mission ----
  const checkForMission = useCallback(async () => {
    try {
      const data = await getLastMission() as Mission;
      if (data && data.id) {
        setCurrentMission(data);
        setAppState("incoming");
        startCountdown();
      } else {
        setAppState("no-mission");
      }
    } catch {
      setAppState("no-mission");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Countdown ----
  function startCountdown() {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdown(30);
    let secs = 30;
    countdownIntervalRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0) {
        clearInterval(countdownIntervalRef.current!);
        handleDecline();
      }
    }, 1000);
  }

  // ---- Activate delivery ----
  async function handleActivate() {
    setIsOnline(true);
    setAppState("loading");
    await checkForMission();
    // Poll every 30s
    if (missionIntervalRef.current) clearInterval(missionIntervalRef.current);
    missionIntervalRef.current = setInterval(checkForMission, 30_000);
  }

  // ---- Accept mission ----
  async function handleAccept() {
    if (!currentMission) return;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    try {
      await acceptMission(currentMission.id);
      localStorage.setItem("current_mission", JSON.stringify(currentMission));
      router.push(`/missions/${currentMission.id}/progress`);
    } catch (err) {
      console.error("Erreur acceptation:", err);
      window.alert("Erreur lors de l'acceptation. Veuillez réessayer.");
    }
  }

  // ---- Decline mission ----
  function handleDecline() {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (currentMission) {
      cancelMission(currentMission.id).catch(() => { });
    }
    setCurrentMission(null);
    setAppState("no-mission");
  }

  // ---- Logout ----
  function logout() {
    if (missionIntervalRef.current) clearInterval(missionIntervalRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
    clearAuth();
    router.push("/login");
  }

  // ---- Cleanup ----
  useEffect(() => {
    return () => {
      if (missionIntervalRef.current) clearInterval(missionIntervalRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
    };
  }, []);

  // ---- Helpers ----
  const gpsColor =
    gpsStatus === "active" ? "bg-emerald-500" :
      gpsStatus === "searching" ? "bg-amber-400 animate-pulse" :
        gpsStatus === "error" ? "bg-red-500" : "bg-slate-400";

  const gpsText =
    gpsStatus === "active" ? "GPS Actif" :
      gpsStatus === "searching" ? "Recherche..." :
        gpsStatus === "error" ? "Erreur GPS" : "GPS Inactif";

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  function formatTimeAgo(iso: string, currentNow: number) {
    if (!iso) return "";
    const diff = Math.floor((currentNow - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `${diff} min`;
    return new Date(iso).toLocaleDateString("fr-FR");
  }

  const countdownPct = (countdown / 30) * 100;

  // ---- Sidebar nav items ----
  const navItems = [
    { icon: "location_on", label: "Géolocalisation", href: "/geolocation" },
    { icon: "inventory_2", label: "Missions actives", href: "/missions", active: true },
    { icon: "schedule", label: "Historique", href: "/history" },
    { icon: "shopping_cart", label: "Livraison", href: "/orders/incoming" },
    { icon: "settings", label: "Paramètres", href: "/settings" },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f0faf4] dark:bg-[#071324] text-slate-900 dark:text-slate-100">

      {/* ===== SIDEBAR ===== */}
      <aside className="hidden md:flex w-64 h-full flex-col justify-between border-r border-green-100 dark:border-[#1a3a6e] bg-white dark:bg-[#081730] p-4">
        <div className="flex flex-col gap-6">
          <div className="px-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">e-Dr TIM</h1>
            <p className="text-xs text-slate-500 dark:text-[#7a9bbf] font-medium mt-1">Tableau de bord Livreur</p>
          </div>
          <nav className="flex flex-col gap-2">
            {navItems.map(({ icon, label, href, active }) => (
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

        {/* User card */}
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
                <p className="text-xs text-slate-500 truncate">{userInfo?.telephone || "---"}</p>
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

      {/* ===== MAIN ===== */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-green-100 dark:border-[#1a3a6e] bg-white dark:bg-[#0a1d38] px-4 md:px-6 py-3 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-slate-900 dark:text-white text-base md:text-lg font-bold tracking-tight">
              Missions de Livraison
            </h2>
          </div>
          <div className="flex items-center gap-2 md:gap-3">

            {/* GPS badge */}
            <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-green-50 dark:bg-[#112b52] border border-green-100 dark:border-[#1a3a6e]">
              <div className={`w-2 h-2 rounded-full mr-2 ${gpsColor}`} />
              <span className="text-xs font-bold text-slate-500">{gpsText}</span>
            </div>

            {/* Online status */}
            <div className={`flex items-center px-3 py-1.5 rounded-full border transition-colors ${isOnline
              ? "bg-green-50 dark:bg-[#2E8B57]/10 border-[#2E8B57]/20"
              : "bg-gray-100 dark:bg-[#112b52] border-gray-200 dark:border-[#1a3a6e]"
              }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              <span className={`text-xs font-bold hidden sm:inline ${isOnline ? "text-emerald-500" : "text-slate-500"}`}>
                {isOnline ? "En ligne" : "Hors ligne"}
              </span>
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
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 top-12 w-80 max-w-[90vw] z-50 rounded-xl border border-green-100 dark:border-[#1a3a6e] bg-white dark:bg-[#0d2040] shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-green-100 dark:border-[#1a3a6e]">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Notifications</span>
                    <button
                      onClick={() => { setNotifications([]); setShowNotifDropdown(false); }}
                      className="text-[11px] font-semibold text-[#2E8B57] hover:underline"
                    >
                      Effacer
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">Aucune notification pour le moment.</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                      {notifications.slice(0, 20).map((n) => (
                        <button
                          key={n.id}
                          onClick={() => { setSelectedNotif(n); setShowNotifModal(true); setShowNotifDropdown(false); }}
                          className={`w-full text-left px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.read ? "bg-[#2E8B57]/5" : "opacity-60"}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#2E8B57]/10 flex items-center justify-center mt-0.5 shrink-0">
                              <span className="material-icons text-[#2E8B57] text-sm">local_shipping</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{n.title}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{n.content}</p>
                              <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(n.created_at, now)}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-[#2E8B57] shrink-0 mt-1" />}
                          </div>
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
          <div className="max-w-4xl mx-auto flex flex-col gap-6">

            {/* Heading */}
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                Gestion des Missions
              </h1>
              <p className="text-slate-500 dark:text-[#9da6b9] text-sm mt-1 max-w-2xl">
                Activez votre statut pour recevoir des missions de livraison.
              </p>
            </div>

            {/* === ACTIVATION CARD === */}
            {appState === "idle" && (
              <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-6 shadow-sm border border-green-100 dark:border-[#1a3a6e]">
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-20 h-20 rounded-full bg-[#2E8B57]/10 flex items-center justify-center">
                    <span className="material-icons text-[#2E8B57] text-4xl">local_shipping</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Prêt à livrer ?</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-md">
                      Cliquez sur le bouton ci-dessous pour recevoir des missions de livraison.
                    </p>
                  </div>
                  <button
                    onClick={handleActivate}
                    className="w-full max-w-xs bg-[#2E8B57] hover:bg-[#20603D] text-white text-lg font-bold py-4 rounded-xl shadow-lg shadow-[#2E8B57]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    <span className="material-icons">search</span>
                    <span>Rechercher des missions</span>
                  </button>
                </div>
              </div>
            )}

            {/* === LOADING STATE === */}
            {appState === "loading" && (
              <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-8 shadow-sm border border-green-100 dark:border-[#1a3a6e]">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-[#2E8B57] rounded-full animate-spin" />
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Recherche de missions disponibles...</p>
                </div>
              </div>
            )}

            {/* === MISSION ACTIVE — DÉTAILS COMPLETS === */}
            {appState === "active" && (
              <div className="flex flex-col gap-4">
                {/* En-tête statut */}
                <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-4 shadow-sm border border-green-100 dark:border-[#1a3a6e] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-800 dark:text-white">Mission en cours</span>
                  </div>
                  <button
                    onClick={() => { localStorage.removeItem("current_mission"); setAppState("idle"); setIsOnline(false); setMissionInfo(null); }}
                    className="text-xs text-red-500 hover:underline font-semibold"
                  >
                    Terminer
                  </button>
                </div>

                {missionInfoLoading && (
                  <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-6 shadow-sm border border-green-100 dark:border-[#1a3a6e] flex items-center justify-center gap-3">
                    <div className="w-6 h-6 border-4 border-slate-200 border-t-[#2E8B57] rounded-full animate-spin" />
                    <span className="text-sm text-slate-500">Chargement des détails...</span>
                  </div>
                )}

                {missionInfo && !missionInfoLoading && (
                  <>
                    {/* Carte Officine */}
                    <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-5 shadow-sm border border-green-100 dark:border-[#1a3a6e]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#2E8B57]/10 rounded-xl">
                          <span className="material-icons text-[#2E8B57]">local_pharmacy</span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Officine de collecte</h3>
                      </div>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-[#7a9bbf]">
                        <p className="font-semibold text-slate-800 dark:text-white text-base">
                          {missionInfo.officine?.name || "Officine"}
                        </p>
                        {missionInfo.officine?.address && (
                          <p className="flex items-start gap-2">
                            <span className="material-icons text-sm shrink-0 mt-0.5">place</span>
                            {missionInfo.officine.address}
                          </p>
                        )}
                        {missionInfo.officine?.telephone && (
                          <a href={`tel:${missionInfo.officine.telephone}`} className="flex items-center gap-2 text-[#2E8B57] hover:underline">
                            <span className="material-icons text-sm">phone</span>
                            {missionInfo.officine.telephone}
                          </a>
                        )}
                        {missionInfo.officine?.latitude && missionInfo.officine?.longitude && (
                          <a
                            href={`https://maps.google.com/?q=${missionInfo.officine.latitude},${missionInfo.officine.longitude}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-blue-50 dark:bg-[#1a3a6e]/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                          >
                            <span className="material-icons text-sm">map</span>
                            Ouvrir dans Maps
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Carte Patient */}
                    <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-5 shadow-sm border border-green-100 dark:border-[#1a3a6e]">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-[#1a3a6e]/40 rounded-xl">
                          <span className="material-icons text-blue-500 dark:text-blue-400">person</span>
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white">Patient destinataire</h3>
                      </div>
                      <div className="space-y-2 text-sm text-slate-600 dark:text-[#7a9bbf]">
                        <p className="font-semibold text-slate-800 dark:text-white text-base">
                          {missionInfo.patient?.first_name} {missionInfo.patient?.last_name}
                        </p>
                        {missionInfo.patient?.address && (
                          <p className="flex items-start gap-2">
                            <span className="material-icons text-sm shrink-0 mt-0.5">home</span>
                            {missionInfo.patient.address}
                          </p>
                        )}
                        {missionInfo.patient?.telephone && (
                          <a href={`tel:${missionInfo.patient.telephone}`} className="flex items-center gap-2 text-[#2E8B57] hover:underline">
                            <span className="material-icons text-sm">phone</span>
                            {missionInfo.patient.telephone}
                          </a>
                        )}
                        {missionInfo.patient?.latitude && missionInfo.patient?.longitude && (
                          <a
                            href={`https://maps.google.com/?q=${missionInfo.patient.latitude},${missionInfo.patient.longitude}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-blue-50 dark:bg-[#1a3a6e]/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
                          >
                            <span className="material-icons text-sm">map</span>
                            Ouvrir dans Maps
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Commande */}
                    {missionInfo.order && (
                      <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-5 shadow-sm border border-green-100 dark:border-[#1a3a6e]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
                              <span className="material-icons text-amber-500">inventory_2</span>
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white">Médicaments à livrer</h3>
                          </div>
                          {missionInfo.order.total_amount && (
                            <span className="text-sm font-bold text-[#2E8B57]">
                              {missionInfo.order.total_amount} FCFA
                            </span>
                          )}
                        </div>
                        {missionInfo.order.items && missionInfo.order.items.length > 0 ? (
                          <div className="space-y-2">
                            {missionInfo.order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                                <span className="text-sm text-slate-700 dark:text-slate-300">{item.product_name || "Produit"}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-400">Aucun détail produit disponible.</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Boutons d'action */}
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href="/pickup-scan"
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#2E8B57] text-white font-bold shadow-lg shadow-[#2E8B57]/20 hover:bg-[#20603D] transition-colors"
                  >
                    <span className="material-icons text-3xl">qr_code_scanner</span>
                    <span className="text-sm text-center">Scanner QR<br />à l&apos;Officine</span>
                  </a>
                  <a
                    href={`/delivery-scan/${missionInfo?.order?.id || currentMission?.id || ""}`}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors"
                  >
                    <span className="material-icons text-3xl">local_shipping</span>
                    <span className="text-sm text-center">Scanner QR<br />Chez le Patient</span>
                  </a>
                </div>
              </div>
            )}

            {/* === NO MISSION === */}
            {appState === "no-mission" && (
              <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-8 shadow-sm border border-green-100 dark:border-[#1a3a6e]">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <span className="material-icons text-slate-400 text-3xl">hourglass_empty</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aucune mission disponible</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                      Restez en ligne, nous vous notifierons dès qu&apos;une nouvelle mission sera disponible.
                    </p>
                  </div>
                  <button
                    onClick={async () => { setAppState("loading"); await checkForMission(); }}
                    className="text-[#2E8B57] hover:underline text-sm font-medium flex items-center gap-1"
                  >
                    <span className="material-icons text-sm">refresh</span>
                    Rafraîchir
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ===== INCOMING MISSION MODAL ===== */}
      {appState === "incoming" && currentMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark/85 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#1c2620] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col relative">
            <div className="absolute -inset-1 bg-[#2E8B57]/20 blur-xl -z-10 rounded-full opacity-50" />

            {/* Header */}
            <div className="px-6 pt-8 pb-2 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2E8B57]/10 border border-[#2E8B57]/20 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E8B57] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2E8B57]" />
                </span>
                <span className="text-[#2E8B57] text-xs font-bold uppercase tracking-wide">Nouvelle Mission</span>
              </div>
              <h2 className="text-white text-2xl font-bold">Mission de Livraison</h2>
            </div>

            {/* Info card */}
            <div className="px-6 py-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-[#111714] border border-white/5">
                <div className="bg-white p-2 rounded-lg size-16 shrink-0 flex items-center justify-center">
                  <span className="material-icons text-[#2E8B57] text-3xl">local_pharmacy</span>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-white text-lg font-bold">
                    {currentMission.pharmacy_name || currentMission.title || "Mission de livraison"}
                  </h3>
                  <p className="text-[#9eb7a8] text-sm">
                    {currentMission.pickup_address || currentMission.address || "Adresse à récupérer"}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <div className="flex items-center justify-center px-2 py-0.5 rounded-md bg-[#29382f] border border-white/5">
                      <p className="text-white text-xs font-medium">#{currentMission.id?.substring(0, 8) || "---"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="px-6 py-2">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "near_me", value: currentMission.distance_km ?? "--", label: "Km" },
                  { icon: "schedule", value: currentMission.estimated_minutes ?? "--", label: "Min" },
                  { icon: "inventory_2", value: currentMission.items_count ?? currentMission.total_items ?? "1", label: "Articles" },
                ].map(({ icon, value, label }) => (
                  <div key={label} className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#29382f]/50 border border-white/5">
                    <span className="material-icons text-[#2E8B57] mb-1">{icon}</span>
                    <span className="text-white font-bold text-lg">{String(value)}</span>
                    <span className="text-[#9eb7a8] text-xs uppercase font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Countdown + actions */}
            <div className="px-6 pt-2 pb-6 flex flex-col gap-4">
              {/* Progress bar */}
              <div>
                <div className="w-full bg-[#111714] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#2E8B57] h-1.5 rounded-full shadow-[0_0_10px_rgba(46,139,87,0.5)] transition-all duration-1000"
                    style={{ width: `${countdownPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[#9eb7a8] mt-1">
                  <span>Réponse automatique dans</span>
                  <span className="font-mono text-white">{formatTime(countdown)}</span>
                </div>
              </div>

              {/* Buttons */}
              <button
                onClick={handleAccept}
                className="w-full bg-[#2E8B57] hover:bg-[#20603D] text-[#111714] text-lg font-bold py-4 rounded-xl shadow-lg shadow-[#2E8B57]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>Accepter la Mission</span>
                <span className="material-icons">arrow_forward</span>
              </button>
              <button
                onClick={handleDecline}
                className="w-full bg-transparent hover:bg-white/5 text-[#9eb7a8] hover:text-white text-sm font-medium py-3 rounded-xl transition-colors"
              >
                Refuser la mission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NOTIFICATION MODAL ===== */}
      {showNotifModal && selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifModal(false)} />
          <div className="relative bg-white dark:bg-[#0d2040] rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4 border border-green-100 dark:border-[#1a3a6e] z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2E8B57]/10 flex items-center justify-center shrink-0">
                <span className="material-icons text-[#2E8B57] text-2xl">notifications</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedNotif.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatTimeAgo(selectedNotif.created_at, now)}</p>
              </div>
              <button
                onClick={() => setShowNotifModal(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
              >
                <span className="material-icons">close</span>
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedNotif.content}</p>
            <button
              onClick={() => setShowNotifModal(false)}
              className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-[#112b52] text-gray-700 dark:text-[#7a9bbf] font-semibold text-sm hover:bg-gray-200 dark:hover:bg-[#1a3a6e] transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
