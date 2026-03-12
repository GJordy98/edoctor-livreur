"use client";

import { useEffect, useState, useCallback } from "react";
import {
  User, Bell, Truck, XCircle, Calendar, Clock, MapPin,
  CheckCircle, X, ArrowDown, Building2, RefreshCw, Loader2,
  AlertCircle,
} from "lucide-react";
import {
  getNotifications,
  getDriverHistoryMissions,
  type ApiNotification,
  type DriverHistoryMission,
} from "@/lib/api-client";

// ─── Types locaux ───────────────────────────────────────────────────────────

interface Mission {
  id: string;
  status: "delivered" | "cancelled" | string;
  pharmacy_name: string;
  pharmacy_address?: string;
  client_name?: string;
  client_address?: string;
  date: string;
  price?: string;
  // Champs enrichis depuis l'API
  officine_telephone?: string;
  patient_telephone?: string;
}

type FilterTab = "all" | "delivered" | "cancelled";

// ─── Normalisation de la réponse API ────────────────────────────────────────

function normalizeStatus(raw: string): string {
  const s = (raw || "").toUpperCase();
  if (["COMPLETED", "DELIVERED", "delivered"].includes(s) || s === "COMPLETED") return "delivered";
  if (["CANCELLED", "CANCELED", "cancelled"].includes(s) || s === "CANCELLED") return "cancelled";
  return raw;
}

function mapApiMission(m: DriverHistoryMission): Mission {
  // Pharmacie
  const officine = m.officine;
  const pharmacy_name =
    m.pharmacy_name ||
    officine?.name ||
    "Officine";
  const adr = officine?.adresse;
  const pharmacy_address =
    m.pharmacy_address ||
    [adr?.rue, adr?.quater !== "quater" ? adr?.quater : "", adr?.city]
      .filter(Boolean)
      .join(", ") ||
    undefined;

  // Patient
  const patientFromOrder = m.order?.patient;
  const patientDirect = m.patient;
  const pat = patientFromOrder ?? patientDirect;
  const client_name =
    m.client_name ||
    (pat ? [pat.first_name, pat.last_name].filter(Boolean).join(" ") : undefined);
  const client_address = m.client_address || pat?.address || undefined;

  // Montant
  const amount = m.total_amount ?? m.order?.total_amount;
  const price = amount ? `${amount} FCFA` : undefined;

  // Date
  const date = m.completed_at || m.updated_at || m.created_at || new Date().toISOString();

  return {
    id: m.id,
    status: normalizeStatus(m.status),
    pharmacy_name,
    pharmacy_address,
    client_name,
    client_address,
    date,
    price,
    officine_telephone: officine?.telephone,
    patient_telephone: patientFromOrder?.telephone,
  };
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function HistoryPage() {

  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);

  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<ApiNotification | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ─── Chargement de l'historique depuis l'API ───────────────────────────

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiMissions = await getDriverHistoryMissions();
      if (apiMissions.length > 0) {
        // Trier par date décroissante
        const sorted = apiMissions
          .map(mapApiMission)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAllMissions(sorted);
      } else {
        // Fallback : localStorage si l'API renvoie vide
        try {
          const stored = JSON.parse(
            localStorage.getItem("delivery_mission_history") || "[]",
          ) as Mission[];
          setAllMissions(stored);
        } catch {
          setAllMissions([]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du chargement.");
      // Fallback localStorage en cas d'erreur réseau
      try {
        const stored = JSON.parse(
          localStorage.getItem("delivery_mission_history") || "[]",
        ) as Mission[];
        setAllMissions(stored);
      } catch {
        setAllMissions([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // ─── Notifications ─────────────────────────────────────────────────────

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
        return merged.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
      });
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchNotifications(), 0);
    const interval = setInterval(fetchNotifications, 30_000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [fetchNotifications]);

  // ─── Timer relatif ─────────────────────────────────────────────────────

  const [now, setNow] = useState<number>(0);
  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  function formatTimeAgo(iso: string, currentNow: number) {
    if (!iso) return "";
    const diff = Math.floor((currentNow - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `${diff} min`;
    return new Date(iso).toLocaleDateString("fr-FR");
  }



  // ─── Données filtrées ──────────────────────────────────────────────────

  const filtered = allMissions.filter((m) => {
    if (filter === "all") return true;
    return m.status === filter;
  });

  const counts = {
    all: allMissions.length,
    delivered: allMissions.filter((m) => m.status === "delivered").length,
    cancelled: allMissions.filter((m) => m.status === "cancelled").length,
  };

  // ─── Helpers UI ────────────────────────────────────────────────────────



  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Tout" },
    { key: "delivered", label: "Livrées" },
    { key: "cancelled", label: "Annulées" },
  ];

  function statusBadge(status: string) {
    const isDelivered = status === "delivered";
    return {
      color: isDelivered
        ? "bg-green-100 text-green-700"
        : "bg-red-100 text-red-700",
      Icon: isDelivered ? CheckCircle : XCircle,
      text: isDelivered ? "Livrée" : "Annulée",
    };
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* ===== MAIN ===== */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 md:px-6 py-3 z-40 shrink-0">
          <h2 className="text-[#1E293B] text-base md:text-lg font-bold tracking-tight">Historique</h2>
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={fetchHistory}
              disabled={loading}
              title="Actualiser"
              className="p-2 text-[#64748B] hover:text-[#22C55E] hover:bg-[#F0FDF4] rounded-xl transition-colors disabled:opacity-40"
            >
              <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className="relative p-2 text-[#64748B] hover:text-[#1E293B] transition-colors rounded-xl hover:bg-[#F0FDF4]">
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
                    <button onClick={() => { setNotifications([]); setShowNotifDropdown(false); }} className="text-[11px] font-semibold text-[#22C55E] hover:underline">Effacer</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-[#94A3B8]">Aucune notification pour le moment.</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-[#F1F5F9]">
                      {notifications.slice(0, 20).map((n) => (
                        <button key={n.id} onClick={() => { setSelectedNotif(n); setShowNotifModal(true); setShowNotifDropdown(false); }}
                          className={`w-full text-left px-3 py-3 hover:bg-[#F8FAFC] transition-colors ${!n.read ? "bg-[#22C55E]/5" : "opacity-60"}`}>
                          <p className="text-xs font-bold text-[#1E293B] truncate">{n.title}</p>
                          <p className="text-[11px] text-[#94A3B8] line-clamp-1 mt-0.5">{n.content}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* Titre + compteur */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-[#1E293B]">Historique des missions</h1>
                <p className="text-sm text-[#94A3B8] mt-1">
                  {loading
                    ? "Chargement en cours..."
                    : `${counts.all} mission${counts.all !== 1 ? "s" : ""} au total`}
                </p>
              </div>
            </div>

            {/* Bannière d'erreur (non bloquante si fallback dispos) */}
            {error && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-sm font-medium">{error} — Affichage des données locales.</p>
                <button onClick={fetchHistory} className="ml-auto text-sm font-bold hover:underline whitespace-nowrap">Réessayer</button>
              </div>
            )}

            {/* Onglets de filtre */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {tabs.map(({ key, label }) => (
                <button key={key} onClick={() => setFilter(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${filter === key
                    ? "bg-[#22C55E] text-white"
                    : "bg-[#F8FAFC] text-[#64748B] hover:bg-[#E2E8F0]"}`}
                >
                  {label}
                  <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${filter === key ? "bg-white/25 text-white" : "bg-[#E2E8F0] text-[#64748B]"}`}>
                    {counts[key]}
                  </span>
                </button>
              ))}
            </div>

            {/* États : loading / vide / liste */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <Loader2 size={32} className="text-[#22C55E] animate-spin" />
                <p className="text-sm text-[#94A3B8]">Chargement de l&apos;historique...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-4">
                  <Clock size={28} className="text-[#94A3B8]" />
                </div>
                <h3 className="text-lg font-bold text-[#1E293B]">Aucune mission trouvée</h3>
                <p className="text-sm text-[#94A3B8] max-w-xs mx-auto mt-1">
                  Vous n&apos;avez pas encore effectué de mission correspondant à ces critères.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((mission) => {
                  const badge = statusBadge(mission.status);
                  return (
                    <div key={mission.id}
                      onClick={() => { setSelectedMission(mission); setShowMissionModal(true); }}
                      className="bg-white rounded-2xl p-4 shadow-sm border border-[#E2E8F0] hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#F8FAFC] flex items-center justify-center">
                            {mission.status === "delivered"
                              ? <Truck size={18} className="text-[#22C55E]" />
                              : <XCircle size={18} className="text-red-500" />
                            }
                          </div>
                          <div>
                            <h3 className="font-bold text-[#1E293B] text-sm">{mission.pharmacy_name}</h3>
                            <p className="text-xs text-[#94A3B8] font-mono">#{mission.id?.substring(0, 8)}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${badge.color}`}>
                          <badge.Icon size={10} />
                          {badge.text}
                        </span>
                      </div>

                      {/* Client + date + montant */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#F1F5F9]">
                        <div className="flex flex-col gap-0.5">
                          {mission.client_name && (
                            <p className="text-xs text-[#64748B] flex items-center gap-1">
                              <User size={11} className="text-[#94A3B8]" />
                              {mission.client_name}
                            </p>
                          )}
                          <div className="flex items-center gap-1 text-xs text-[#94A3B8]">
                            <Calendar size={11} />
                            {mission.date ? new Date(mission.date).toLocaleDateString("fr-FR") : "---"}
                          </div>
                        </div>
                        <span className="font-bold text-[#1E293B] text-sm">{mission.price || "---"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ===== MISSION DETAIL MODAL ===== */}
      {showMissionModal && selectedMission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMissionModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] border border-[#E2E8F0] z-10">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#1E293B]">Détails de la mission</h3>
                <p className="text-xs text-[#94A3B8] font-mono">#{selectedMission.id?.substring(0, 8)}</p>
              </div>
              <button onClick={() => setShowMissionModal(false)} className="p-2 rounded-full hover:bg-[#F8FAFC] transition-colors">
                <X size={18} className="text-[#94A3B8]" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Statut */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${statusBadge(selectedMission?.status || "").color}`}>
                  {(() => { const b = statusBadge(selectedMission?.status || ""); return <><b.Icon size={12} />{b.text}</>; })()}
                </span>
                <span className="text-xs text-[#94A3B8]">
                  {selectedMission?.date ? new Date(selectedMission.date).toLocaleString("fr-FR") : "---"}
                </span>
              </div>

              {/* Pharmacie */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">Pharmacie</p>
                  <p className="font-bold text-[#1E293B] text-base">{selectedMission.pharmacy_name || "---"}</p>
                  {selectedMission.pharmacy_address && (
                    <p className="text-sm text-[#94A3B8] flex items-center gap-1 mt-0.5">
                      <MapPin size={11} />{selectedMission.pharmacy_address}
                    </p>
                  )}
                  {selectedMission.officine_telephone && (
                    <a href={`tel:${selectedMission.officine_telephone}`} className="text-sm text-[#22C55E] hover:underline mt-0.5 inline-block">
                      {selectedMission.officine_telephone}
                    </a>
                  )}
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-[#E2E8F0]" /></div>
                <span className="relative bg-white px-2 text-[#94A3B8]"><ArrowDown size={14} /></span>
              </div>

              {/* Client */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                  <User size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-[#94A3B8] uppercase font-bold tracking-wider">Patient</p>
                  <p className="font-bold text-[#1E293B] text-base">{selectedMission.client_name || "---"}</p>
                  {selectedMission.client_address && (
                    <p className="text-sm text-[#94A3B8] flex items-center gap-1 mt-0.5">
                      <MapPin size={11} />{selectedMission.client_address}
                    </p>
                  )}
                  {selectedMission.patient_telephone && (
                    <a href={`tel:${selectedMission.patient_telephone}`} className="text-sm text-purple-600 hover:underline mt-0.5 inline-block">
                      {selectedMission.patient_telephone}
                    </a>
                  )}
                </div>
              </div>

              {/* Montant */}
              <div className="p-4 bg-[#F0FDF4] rounded-xl flex items-center justify-between">
                <p className="text-sm text-[#64748B] font-semibold">Montant total</p>
                <p className="font-bold text-[#22C55E] text-lg">{selectedMission?.price || "---"}</p>
              </div>
            </div>

            <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
              <button onClick={() => setShowMissionModal(false)}
                className="w-full py-3 rounded-xl bg-[#22C55E] text-white font-bold hover:bg-[#16A34A] transition-colors">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NOTIFICATION MODAL ===== */}
      {showNotifModal && selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowNotifModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4 border border-[#E2E8F0] z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                <Bell size={22} className="text-[#22C55E]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-[#1E293B]">{selectedNotif?.title}</h3>
                <p className="text-xs text-[#94A3B8] mt-1">{formatTimeAgo(selectedNotif?.created_at || "", now)}</p>
              </div>
              <button onClick={() => setShowNotifModal(false)} className="p-2 rounded-full hover:bg-[#F8FAFC] text-[#94A3B8]">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-[#64748B] leading-relaxed">{selectedNotif?.content}</p>
            <button onClick={() => setShowNotifModal(false)} className="w-full py-2.5 rounded-xl bg-[#F8FAFC] text-[#64748B] font-semibold text-sm hover:bg-[#F1F5F9] transition-colors">
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
