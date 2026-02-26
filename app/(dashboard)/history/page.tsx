"use client";

/**
 * Page Historique Missions — e-Dr TIM Delivery System
 * Migré fidèlement depuis mission_history.html + mission_history.js
 * Données depuis localStorage (delivery_mission_history)
 * Filtres : Tout / Livrées / Annulées + modal de détail
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getNotifications, type ApiNotification } from "@/lib/api-client";
import { getUserInfo, clearAuth, type UserInfo } from "@/lib/auth";

// ---- Types ----
interface Mission {
  id: string;
  status: "delivered" | "cancelled" | string;
  pharmacy_name: string;
  pharmacy_address?: string;
  client_name?: string;
  client_address?: string;
  date: string;
  price?: string;
}

type FilterTab = "all" | "delivered" | "cancelled";

// ---- Component ----
export default function HistoryPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  // Charger userInfo côté client uniquement (évite la mismatch SSR/localStorage)
  useEffect(() => {
    setUserInfo(getUserInfo());
  }, []);

  const [allMissions, setAllMissions] = useState<Mission[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [showMissionModal, setShowMissionModal] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<ApiNotification | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ---- Load history from localStorage ----
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem("delivery_mission_history") || "[]") as Mission[];
        setAllMissions([...stored].reverse()); // newest first
      } catch {
        setAllMissions([]);
      }
    }, 0);
    return () => clearTimeout(timer);
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
    const timer = setTimeout(() => fetchNotifications(), 0);
    const interval = setInterval(fetchNotifications, 30_000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchNotifications]);

  const [now, setNow] = useState<number>(0);

  useEffect(() => {
    const timer = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // ---- Helpers ----
  function formatTimeAgo(iso: string, currentNow: number) {
    if (!iso) return "";
    const diff = Math.floor((currentNow - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "À l'instant";
    if (diff < 60) return `${diff} min`;
    return new Date(iso).toLocaleDateString("fr-FR");
  }

  function logout() {
    clearAuth();
    router.push("/login");
  }

  // ---- Filtered missions ----
  const filtered = allMissions.filter((m) => {
    if (filter === "all") return true;
    return m.status === filter;
  });

  // ---- Sidebar nav ----
  const navItems = [
    { icon: "location_on", label: "Géolocalisation", href: "/geolocation" },
    { icon: "inventory_2", label: "Missions actives", href: "/missions" },
    { icon: "schedule", label: "Historique", href: "/history", active: true },
    { icon: "shopping_cart", label: "Livraison", href: "/orders/incoming" },
    { icon: "settings", label: "Paramètres", href: "/settings" },
  ];

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Tout" },
    { key: "delivered", label: "Livrées" },
    { key: "cancelled", label: "Annulées" },
  ];

  function statusBadge(status: string) {
    const isDelivered = status === "delivered";
    return {
      color: isDelivered ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      icon: isDelivered ? "check_circle" : "cancel",
      text: isDelivered ? "Livrée" : "Annulée",
    };
  }

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
          <h2 className="text-slate-900 dark:text-white text-base md:text-lg font-bold tracking-tight">Historique</h2>
          <div className="flex items-center gap-2">
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
                    <button onClick={() => { setNotifications([]); setShowNotifDropdown(false); }} className="text-[11px] font-semibold text-[#2E8B57] hover:underline">Effacer</button>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-3 py-4 text-xs text-slate-500 dark:text-slate-400">Aucune notification pour le moment.</div>
                  ) : (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                      {notifications.slice(0, 20).map((n) => (
                        <button key={n.id} onClick={() => { setSelectedNotif(n); setShowNotifModal(true); setShowNotifDropdown(false); }}
                          className={`w-full text-left px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.read ? "bg-[#2E8B57]/5" : "opacity-60"}`}>
                          <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{n.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{n.content}</p>
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
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* Title */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Historique des missions</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Consultez vos livraisons terminées et annulées.</p>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {tabs.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors whitespace-nowrap ${filter === key
                    ? "bg-[#2E8B57] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#112b52] dark:text-[#7a9bbf] dark:hover:bg-[#1a3a6e]"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mission list */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <span className="material-icons text-slate-400 text-3xl">history</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aucune mission trouvée</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                  Vous n&apos;avez pas encore effectué de mission correspondant à ces critères.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((mission) => {
                  const badge = statusBadge(mission.status);
                  return (
                    <div
                      key={mission.id}
                      onClick={() => { setSelectedMission(mission); setShowMissionModal(true); }}
                      className="bg-white dark:bg-[#0d2040] rounded-2xl p-4 shadow-sm border border-green-100 dark:border-[#1a3a6e] hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <span className="material-icons text-slate-500">
                              {mission.status === "delivered" ? "local_shipping" : "block"}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm">{mission.pharmacy_name}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">#{mission.id?.substring(0, 8)}</p>
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${badge.color}`}>
                          <span className="material-icons text-[12px]">{badge.icon}</span>
                          {badge.text}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#1a3a6e]">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <span className="material-icons text-[14px]">calendar_today</span>
                          {mission.date ? new Date(mission.date).toLocaleDateString("fr-FR") : "---"}
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{mission.price || "---"}</span>
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
          <div className="relative bg-white dark:bg-[#0d2040] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] border border-green-100 dark:border-[#1a3a6e] z-10">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-[#1a3a6e] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Détails de la mission</h3>
                <p className="text-xs text-slate-500 font-mono">#{selectedMission.id?.substring(0, 8)}</p>
              </div>
              <button onClick={() => setShowMissionModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                <span className="material-icons text-slate-500">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge(selectedMission?.status || "").color}`}>
                  {statusBadge(selectedMission?.status || "").text}
                </span>
              </div>

              {/* Pharmacy */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                  <span className="material-icons text-blue-600 dark:text-blue-400">local_pharmacy</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Pharmacie</p>
                  <p className="font-bold text-slate-900 dark:text-white text-base">{selectedMission.pharmacy_name || "---"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMission.pharmacy_address || "---"}</p>
                </div>
              </div>

              {/* Separator */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-dashed border-slate-200 dark:border-slate-700" /></div>
                <span className="relative bg-white dark:bg-[#1e293b] px-2 text-slate-400">
                  <span className="material-icons text-sm">arrow_downward</span>
                </span>
              </div>

              {/* Client */}
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                  <span className="material-icons text-purple-600 dark:text-purple-400">person</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Client</p>
                  <p className="font-bold text-slate-900 dark:text-white text-base">{selectedMission.client_name || "---"}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMission.client_address || "---"}</p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-[#071324] rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Date</p>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">
                    {selectedMission?.date ? new Date(selectedMission.date).toLocaleString("fr-FR") : "---"}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-[#071324] rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Montant</p>
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{selectedMission?.price || "---"}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-[#1a3a6e] bg-gray-50 dark:bg-[#071324]/50">
              <button
                onClick={() => setShowMissionModal(false)}
                className="w-full py-3 rounded-xl bg-[#2E8B57] dark:bg-[#2E8B57] text-white dark:text-white font-bold hover:bg-[#20603D] transition-colors"
              >
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
          <div className="relative bg-white dark:bg-[#0d2040] rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-4 border border-green-100 dark:border-[#1a3a6e] z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#2E8B57]/10 flex items-center justify-center shrink-0">
                <span className="material-icons text-[#2E8B57] text-2xl">notifications</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedNotif?.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{formatTimeAgo(selectedNotif?.created_at || "", now)}</p>
              </div>
              <button onClick={() => setShowNotifModal(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400">
                <span className="material-icons">close</span>
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{selectedNotif?.content}</p>
            <button onClick={() => setShowNotifModal(false)} className="w-full py-2.5 rounded-xl bg-gray-100 dark:bg-[#112b52] text-gray-700 dark:text-[#7a9bbf] font-semibold text-sm hover:bg-gray-200 dark:hover:bg-[#1a3a6e] transition-colors">
              Fermer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
