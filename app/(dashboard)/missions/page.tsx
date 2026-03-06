"use client";

/**
 * Page Missions — e-Dr TIM Delivery System
 * Affiche la dernière mission assignée au livreur (last_mission_assigned).
 * Le livreur peut Accepter ou Refuser la mission.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Truck, MapPin, Package, Clock, Settings, User, LogOut,
  RefreshCw, Bell, Building2, Phone, HourglassIcon, Loader2,
  CheckCircle, XCircle, ArrowRight, AlertTriangle, X, ScanLine,
  Hash, ChevronRight,
} from "lucide-react";
import {
  getLastMission,
  getLastMissionDebug,
  acceptMission,
  cancelMission,
  generatePickupCode,
  getPickupOfficinesForMission,
  getMissionById,
  getNotifications,
  type ApiNotification,
  type MissionInfoResponse,
  type PickupOfficine,
} from "@/lib/api-client";
import { getUserInfo, clearAuth, getDeliveryStatus, type UserInfo } from "@/lib/auth";

// ─── types ────────────────────────────────────────────────────────────────────

interface RawMission {
  id: string;
  status?: string;
  created_at?: string;
  [key: string]: unknown;
}

type AppState = "loading" | "no-mission" | "pending" | "accepting" | "active";

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(iso: string, now: number) {
  if (!iso) return "";
  const diff = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "À l'instant";
  if (diff < 60) return `${diff} min`;
  if (diff < 1440) return `${Math.floor(diff / 60)} h`;
  return new Date(iso).toLocaleDateString("fr-FR");
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MissionsPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [appState, setAppState] = useState<AppState>("loading");
  const [driverStatus, setDriverStatus] = useState<string | null>(null);

  // Mission data
  const [mission, setMission] = useState<RawMission | null>(null);
  const [missionInfo, setMissionInfo] = useState<MissionInfoResponse | null>(null);
  const [officines, setOfficines] = useState<PickupOfficine[]>([]);
  const [missionLoading, setMissionLoading] = useState(false);

  // Debug
  const [debugInfo, setDebugInfo] = useState<{ status: number; raw: unknown; error?: string } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // Accept/Refuse UI
  const [showRefuseConfirm, setShowRefuseConfirm] = useState(false);
  const [refuseLoading, setRefuseLoading] = useState(false);
  const [refuseError, setRefuseError] = useState("");

  // GPS
  const [gpsStatus, setGpsStatus] = useState<"inactive" | "searching" | "active" | "error">("inactive");

  // Notifications
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const listIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gpsWatchRef = useRef<number | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    setUserInfo(getUserInfo());
    setDriverStatus(getDeliveryStatus());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) { setGpsStatus("error"); return; }
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

  // Si current_mission dans localStorage → vérifier avec le backend avant de rediriger
  useEffect(() => {
    const saved = localStorage.getItem("current_mission");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as RawMission;
        // Seulement rediriger si la mission a un statut actif
        const st = String(parsed.status || "").toUpperCase();
        const isActive =
          st === "ACCEPTED" || st === "IN_PROGRESS" ||
          st === "IN_PICKUP" || st === "IN_DELIVERY";
        if (isActive) {
          router.replace("/mission-active");
          return;
        } else {
          // Mission sauvegardée mais statut non-actif → effacer et continuer
          localStorage.removeItem("current_mission");
        }
      } catch {
        localStorage.removeItem("current_mission");
      }
    }
    fetchLastMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch last mission ────────────────────────────────────────────────────

  const fetchLastMission = useCallback(async () => {
    setAppState("loading");
    try {
      const result = await getLastMissionDebug();
      setDebugInfo({ status: result.httpStatus, raw: result.rawResponse, error: result.error });
      console.log("[Missions] last_mission_assigned →", result);

      const raw = result.mission;
      if (!raw || !raw.id) {
        setMission(null);
        setMissionInfo(null);
        setOfficines([]);
        setAppState("no-mission");
        return;
      }

      const m = raw as unknown as RawMission;
      setMission(m);

      // Detect if already accepted (status)
      const status = String(m.status || "").toUpperCase();
      const alreadyAccepted =
        status === "ACCEPTED" ||
        status === "IN_PROGRESS" ||
        status === "IN_PICKUP" ||
        status === "IN_DELIVERY";

      if (alreadyAccepted) {
        // Mission déjà acceptée → enregistrer et rediriger
        localStorage.setItem("current_mission", JSON.stringify(m));
        localStorage.setItem("mission_phase", "pickup");
        router.replace("/mission-active");
        return;
      }

      setAppState("pending");
      setMissionLoading(true);

      // Fetch extended info
      try {
        const [info, offs] = await Promise.all([
          getMissionById(m.id).catch(() => null),
          getPickupOfficinesForMission(m.id).catch(() => [] as PickupOfficine[]),
        ]);
        if (info) setMissionInfo(info);
        setOfficines(offs);
      } catch { /* silent */ }

      setMissionLoading(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setDebugInfo({ status: 0, raw: null, error: msg });
      setMission(null);
      setMissionInfo(null);
      setOfficines([]);
      setAppState("no-mission");
    }
  }, [router]);

  // Polling toutes les 15 s
  useEffect(() => {
    if (appState === "pending" || appState === "no-mission") {
      listIntervalRef.current = setInterval(fetchLastMission, 15_000);
    }
    return () => { if (listIntervalRef.current) clearInterval(listIntervalRef.current); };
  }, [appState, fetchLastMission]);

  // Notifications polling
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications((prev) => {
        const ids = new Set(prev.map((n) => n.id));
        const merged = [...prev];
        data.forEach((n) => {
          if (!ids.has(n.id)) merged.push(n);
          else { const idx = merged.findIndex((x) => x.id === n.id); if (idx !== -1) merged[idx] = n; }
        });
        return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      });
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    notifIntervalRef.current = setInterval(fetchNotifications, 30_000);
    return () => { if (notifIntervalRef.current) clearInterval(notifIntervalRef.current); };
  }, [fetchNotifications]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (listIntervalRef.current) clearInterval(listIntervalRef.current);
      if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
    };
  }, []);

  // ── Accept mission ────────────────────────────────────────────────────────

  async function handleAccept() {
    if (!mission) return;
    setAppState("accepting");
    try {
      // L'API acceptMission retourne les infos de la mission acceptée (dont le code)
      const acceptResponse = await acceptMission(mission.id);

      // Extraire le code de ramassage depuis la réponse d'acceptation
      const resp = (acceptResponse ?? {}) as Record<string, unknown>;
      const pickupCode =
        String(resp.code ?? resp.pickup_code ?? resp.qr_code ?? resp.delivery_code ?? "");
      if (pickupCode) {
        localStorage.setItem("delivery_pickup_code", pickupCode);
      }
      localStorage.setItem("delivery_pickup_code_raw", JSON.stringify(resp));

      // Sauvegarder la mission et ses infos
      localStorage.setItem("current_mission", JSON.stringify(mission));
      if (missionInfo) localStorage.setItem("current_mission_info", JSON.stringify(missionInfo));
      localStorage.setItem("mission_phase", "pickup");
      localStorage.removeItem("confirmed_pharmacy_ids");

      // Rediriger vers la carte pour voir le trajet livreur → pharmacie
      router.push("/tracking");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      window.alert(`Impossible d'accepter la mission.\n\n${msg}`);
      setAppState("pending");
    }
  }

  // ── Refuse mission ────────────────────────────────────────────────────────

  async function handleRefuse() {
    if (!mission) return;
    setRefuseLoading(true);
    setRefuseError("");
    try {
      await cancelMission(mission.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setRefuseError(msg);
    } finally {
      setRefuseLoading(false);
      setShowRefuseConfirm(false);
    }
    setMission(null);
    setMissionInfo(null);
    setOfficines([]);
    // Recharger après refus
    fetchLastMission();
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  function logout() {
    if (listIntervalRef.current) clearInterval(listIntervalRef.current);
    if (notifIntervalRef.current) clearInterval(notifIntervalRef.current);
    clearAuth();
    router.push("/login");
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.read).length;
  const gpsColor =
    gpsStatus === "active" ? "bg-emerald-500" :
      gpsStatus === "searching" ? "bg-amber-400 animate-pulse" :
        gpsStatus === "error" ? "bg-red-500" : "bg-slate-400";
  const gpsText =
    gpsStatus === "active" ? "GPS Actif" :
      gpsStatus === "searching" ? "Recherche..." :
        gpsStatus === "error" ? "Erreur GPS" : "GPS Inactif";

  const navItems = [
    { icon: MapPin, label: "Géolocalisation", href: "/geolocation" },
    { icon: Package, label: "Missions", href: "/missions", active: true },
    { icon: Clock, label: "Historique", href: "/history" },
    { icon: Settings, label: "Paramètres", href: "/settings" },
  ];

  // ── Mission display helpers ───────────────────────────────────────────────

  const officineFromInfo = missionInfo?.officine;
  const patientFromInfo = missionInfo?.patient;
  const orderFromInfo = missionInfo?.order;

  // Fallback: officines from pickup endpoint or from mission info
  const displayOfficines: PickupOfficine[] = officines.length > 0
    ? officines
    : officineFromInfo
      ? [{ id: "main", name: officineFromInfo.name, address: officineFromInfo.address, telephone: officineFromInfo.telephone }]
      : [];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F8FAFC] text-[#1E293B]">

      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 h-full flex-col justify-between border-r border-[#E2E8F0] bg-white p-4">
        <div className="flex flex-col gap-6">
          <div className="px-2">
            <h1 className="text-xl font-bold text-[#1E293B]">e-Dr TIM</h1>
            <p className="text-xs text-[#94A3B8] font-medium mt-1">Tableau de bord Livreur</p>
          </div>
          <nav className="flex flex-col gap-1">
            {navItems.map(({ icon: Icon, label, href, active }) => (
              <a
                key={label}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${active ? "bg-[#22C55E]/10 text-[#22C55E] font-semibold" : "hover:bg-[#F0FDF4] text-[#64748B] hover:text-[#22C55E]"
                  }`}
              >
                <Icon size={18} className={active ? "text-[#22C55E]" : "text-[#94A3B8]"} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </div>
        <div className="flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full ring-2 ring-[#22C55E]/20 bg-[#22C55E]/10 flex items-center justify-center">
                <User size={18} className="text-[#22C55E]" />
              </div>
              <div className="flex flex-col overflow-hidden flex-1">
                <p className="text-sm font-bold truncate text-[#1E293B]">
                  {userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : "Chargement..."}
                </p>
                <p className="text-xs text-[#94A3B8] truncate">{userInfo?.telephone || "---"}</p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <LogOut size={16} />
            <span className="text-sm font-medium">Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 md:px-6 py-3 z-40 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-[#1E293B] text-base md:text-lg font-bold tracking-tight">
              {appState === "pending" ? "Mission disponible" :
                appState === "accepting" ? "Acceptation…" :
                  "Missions"}
            </h2>
            {/* Badge statut du livreur */}
            {driverStatus && (
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${driverStatus === "IS_FREE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${driverStatus === "IS_FREE"
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-slate-400"
                    }`}
                />
                {driverStatus === "IS_FREE" ? "Disponible" : "Occupé"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-[#F0FDF4] border border-[#E2E8F0]">
              <div className={`w-2 h-2 rounded-full mr-2 ${gpsColor}`} />
              <span className="text-xs font-bold text-[#94A3B8]">{gpsText}</span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 text-[#64748B] hover:text-[#1E293B] transition-colors rounded-xl hover:bg-[#F0FDF4]"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 top-12 w-80 max-w-[90vw] z-50 rounded-xl border border-[#E2E8F0] bg-white shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#E2E8F0]">
                    <span className="text-xs font-bold text-[#1E293B]">Notifications</span>
                    <button
                      onClick={() => { setNotifications([]); setShowNotifDropdown(false); }}
                      className="text-[11px] font-semibold text-[#22C55E] hover:underline"
                    >
                      Effacer
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-[#94A3B8]">Aucune notification.</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#F1F5F9]">
                      {notifications.slice(0, 20).map((n) => (
                        <div
                          key={n.id}
                          className={`px-3 py-3 ${!n.read ? "bg-[#22C55E]/5" : "opacity-60"}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#22C55E]/10 flex items-center justify-center mt-0.5 shrink-0">
                              <Truck size={14} className="text-[#22C55E]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#1E293B] truncate">{n.title}</p>
                              <p className="text-[11px] text-[#94A3B8] line-clamp-2">{n.content}</p>
                              <p className="text-[10px] text-[#94A3B8] mt-1">{formatTimeAgo(n.created_at, now)}</p>
                            </div>
                            {!n.read && <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0 mt-1" />}
                          </div>
                        </div>
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
          <div className="max-w-2xl mx-auto flex flex-col gap-4">

            {/* ── LOADING ── */}
            {(appState === "loading" || appState === "accepting") && (
              <div className="bg-white rounded-2xl p-10 shadow-sm border border-[#E2E8F0] flex flex-col items-center gap-4">
                <Loader2 size={32} className="text-[#22C55E] animate-spin" />
                <p className="text-[#94A3B8] text-sm">
                  {appState === "accepting" ? "Acceptation de la mission…" : "Chargement de votre mission…"}
                </p>
              </div>
            )}

            {/* ── NO MISSION ── */}
            {appState === "no-mission" && (
              <div className="bg-white rounded-2xl p-10 shadow-sm border border-[#E2E8F0]">
                <div className="flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                    <HourglassIcon size={28} className="text-[#94A3B8]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1E293B]">En attente d'une mission</h3>
                    <p className="text-[#94A3B8] text-sm mt-1">
                      Vous serez notifié dès qu'une mission vous sera assignée.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchLastMission()}
                    className="text-[#22C55E] hover:underline text-sm font-medium flex items-center gap-1"
                  >
                    <RefreshCw size={14} />Rafraîchir
                  </button>
                </div>
              </div>
            )}

            {/* ── MISSION PENDING ── */}
            {appState === "pending" && mission && (
              <div className="flex flex-col gap-4">

                {/* Bannière mission disponible */}
                <div className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] rounded-2xl p-5 text-white shadow-lg shadow-[#22C55E]/20">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
                    <span className="text-xs font-bold uppercase tracking-wider opacity-90">Nouvelle mission assignée</span>
                  </div>
                  <div className="flex items-end justify-between mt-1">
                    <div>
                      <p className="text-2xl font-black leading-tight">Mission disponible</p>
                      <p className="text-white/70 text-xs mt-1 font-mono">
                        #{mission.id.substring(0, 12)}
                      </p>
                    </div>
                    {mission.created_at && (
                      <span className="text-white/70 text-xs">{formatTimeAgo(mission.created_at, now)}</span>
                    )}
                  </div>
                </div>

                {/* Chargement des détails */}
                {missionLoading && (
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0] flex items-center justify-center gap-2">
                    <Loader2 size={18} className="text-[#22C55E] animate-spin" />
                    <span className="text-sm text-[#94A3B8]">Chargement des détails…</span>
                  </div>
                )}

                {/* ID mission */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                    <Hash size={16} className="text-[#22C55E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">ID Mission</p>
                    <p className="font-mono font-bold text-[#1E293B] text-sm truncate">{mission.id}</p>
                  </div>
                  {mission.status && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                      {mission.status}
                    </span>
                  )}
                </div>

                {/* Officines de collecte */}
                {displayOfficines.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center gap-2">
                      <Building2 size={15} className="text-[#22C55E]" />
                      <span className="text-sm font-bold text-[#1E293B]">
                        Officines à visiter ({displayOfficines.length})
                      </span>
                    </div>
                    <div className="divide-y divide-[#F8FAFC]">
                      {displayOfficines.map((off, idx) => (
                        <div key={off.id ?? idx} className="p-4 flex items-start gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#22C55E]/10 flex items-center justify-center text-xs font-black text-[#22C55E] shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-[#1E293B] text-sm truncate">
                              {off.name ?? `Officine ${idx + 1}`}
                            </p>
                            {off.address && (
                              <p className="text-xs text-[#94A3B8] flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="shrink-0" />
                                <span className="truncate">{off.address}</span>
                              </p>
                            )}
                            {off.telephone && (
                              <a
                                href={`tel:${off.telephone}`}
                                className="text-xs text-[#22C55E] flex items-center gap-1 mt-0.5 hover:underline"
                              >
                                <Phone size={10} />{off.telephone}
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Patient */}
                {patientFromInfo && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                        <User size={16} className="text-blue-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#94A3B8] uppercase font-bold tracking-wider">Patient destinataire</p>
                        <p className="font-bold text-[#1E293B] text-sm">
                          {[patientFromInfo.first_name, patientFromInfo.last_name].filter(Boolean).join(" ") || "—"}
                        </p>
                      </div>
                    </div>
                    {patientFromInfo.address && (
                      <p className="text-xs text-[#64748B] flex items-start gap-1.5">
                        <MapPin size={11} className="shrink-0 mt-0.5 text-[#94A3B8]" />
                        {patientFromInfo.address}
                      </p>
                    )}
                    {patientFromInfo.telephone && (
                      <a href={`tel:${patientFromInfo.telephone}`} className="text-xs text-[#22C55E] flex items-center gap-1.5 mt-1.5 hover:underline">
                        <Phone size={11} />{patientFromInfo.telephone}
                      </a>
                    )}
                  </div>
                )}

                {/* Commande */}
                {orderFromInfo && (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Package size={15} className="text-amber-500" />
                        <span className="text-sm font-bold text-[#1E293B]">Commande</span>
                      </div>
                      {orderFromInfo.total_amount && (
                        <span className="text-sm font-black text-[#22C55E]">
                          {Number(orderFromInfo.total_amount).toLocaleString("fr-FR")} FCFA
                        </span>
                      )}
                    </div>
                    {orderFromInfo.items && orderFromInfo.items.length > 0 && (
                      <div className="space-y-1.5">
                        {orderFromInfo.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-[#1E293B]">{item.product_name || "Produit"}</span>
                            <span className="text-[#94A3B8] bg-[#F8FAFC] px-2 py-0.5 rounded-full font-semibold">
                              ×{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {orderFromInfo.status && (
                      <p className="text-[10px] text-[#94A3B8] mt-2 uppercase font-semibold tracking-wide">
                        Statut : {orderFromInfo.status}
                      </p>
                    )}
                  </div>
                )}

                {/* Erreur refus */}
                {refuseError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-2 text-red-600 text-sm">
                    <AlertTriangle size={14} />
                    <span>{refuseError}</span>
                    <button onClick={() => setRefuseError("")} className="ml-auto">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Boutons Accept / Refuse */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowRefuseConfirm(true)}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-red-200 text-red-500 font-bold text-sm hover:bg-red-50 transition-all active:scale-[0.98]"
                  >
                    <XCircle size={20} />
                    Refuser
                  </button>
                  <button
                    onClick={handleAccept}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#22C55E] text-white font-bold text-sm shadow-lg shadow-[#22C55E]/25 hover:bg-[#16A34A] transition-all active:scale-[0.98]"
                  >
                    <CheckCircle size={20} />
                    Accepter
                    <ArrowRight size={16} />
                  </button>
                </div>

                {/* Instructions */}
                <div className="bg-[#F8FAFC] rounded-2xl p-4 border border-[#E2E8F0]">
                  <p className="text-xs font-bold text-[#1E293B] mb-2 flex items-center gap-2">
                    <ScanLine size={13} className="text-[#22C55E]" />
                    Déroulement de la mission
                  </p>
                  <div className="space-y-2">
                    {[
                      { step: "1", text: "Acceptez la mission" },
                      { step: "2", text: "Récupérez les médicaments dans chaque officine (code QR généré automatiquement)" },
                      { step: "3", text: "Livrez le patient et scannez son QR code" },
                    ].map((s) => (
                      <div key={s.step} className="flex items-start gap-2 text-xs text-[#64748B]">
                        <span className="w-5 h-5 rounded-full bg-[#22C55E]/10 text-[#22C55E] font-black flex items-center justify-center text-[10px] shrink-0">{s.step}</span>
                        <span>{s.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="flex md:hidden border-t border-[#E2E8F0] bg-white shrink-0">
          {navItems.map(({ icon: Icon, label, href, active }) => (
            <a
              key={label}
              href={href}
              className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[10px] font-semibold transition-colors ${active ? "text-[#22C55E]" : "text-[#94A3B8]"
                }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

      </main>

      {/* MODAL Confirmation refus */}
      {showRefuseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-[#1E293B]">Refuser cette mission ?</p>
                <p className="text-sm text-[#94A3B8] mt-1">
                  La mission sera libérée pour un autre livreur. Cette action est irréversible.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRefuseConfirm(false)}
                disabled={refuseLoading}
                className="flex-1 py-3 rounded-xl border border-[#E2E8F0] text-[#64748B] font-semibold text-sm hover:bg-[#F8FAFC] transition-colors disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleRefuse}
                disabled={refuseLoading}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {refuseLoading
                  ? <><Loader2 size={14} className="animate-spin" />Refus…</>
                  : <><XCircle size={14} />Confirmer le refus</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fermer notif dropdown au click externe */}
      {showNotifDropdown && (
        <div className="fixed inset-0 z-30" onClick={() => setShowNotifDropdown(false)} />
      )}
    </div>
  );
}

// Sub-component kept for future listing use (currently unused)
function MissionCard({ mission, onSelect }: { mission: RawMission; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="w-full bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] flex items-center gap-4 text-left hover:border-[#22C55E]/40 hover:shadow-md transition-all active:scale-[0.99]"
    >
      <div className="w-11 h-11 rounded-xl bg-[#22C55E]/10 flex items-center justify-center shrink-0">
        <Truck size={20} className="text-[#22C55E]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#1E293B] text-sm truncate">Mission #{mission.id.substring(0, 12)}</p>
        {mission.created_at && (
          <p className="text-xs text-[#94A3B8] mt-0.5">{mission.created_at}</p>
        )}
      </div>
      <ChevronRight size={18} className="text-[#94A3B8] shrink-0" />
    </button>
  );
}

// Suppress unused warning
void MissionCard;
