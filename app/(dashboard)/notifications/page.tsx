"use client";

/**
 * Page Notifications — e-Dr TIM Delivery
 * Affiche les notifications + bloc mission en attente avec Accept/Refus
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, BellOff, CheckCheck, RefreshCw, Loader2,
  ShoppingBag, Truck, Package, Megaphone, CheckCircle,
  XCircle, MapPin, Phone, Building2, User, Clock,
  AlertCircle, ArrowRight, ChevronDown, ChevronUp, ArrowLeft,
} from "lucide-react";
import {
  getLastMission,
  getMissionById,
  acceptMission,
  cancelMission,
  generatePickupCode,
  markNotificationAsRead,
  type MissionInfoResponse,
} from "@/lib/api-client";
import { useNotifications, type AppNotification } from "@/hooks/useNotifications";

// ─── helpers ───────────────────────────────────────────────

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffMin < 1440) return `Il y a ${Math.floor(diffMin / 60)} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
};

const isMissionNotif = (n: AppNotification) => {
  const t = (n.title + " " + n.content).toLowerCase();
  return t.includes("mission") || t.includes("livraison") || t.includes("commande") || t.includes("pickup");
};

const getNotifIcon = (n: AppNotification) => {
  const t = (n.title + " " + n.content).toLowerCase();
  if (t.includes("mission") || t.includes("livraison")) return <Truck size={16} />;
  if (t.includes("commande") || t.includes("pickup")) return <ShoppingBag size={16} />;
  if (t.includes("paiement") || t.includes("wallet")) return <Package size={16} />;
  return <Megaphone size={16} />;
};

// ─── Bloc mission en attente ──────────────────────────────

interface PendingMissionBlockProps {
  onAccepted: () => void;
  onRejected: () => void;
}

function PendingMissionBlock({ onAccepted, onRejected }: PendingMissionBlockProps) {
  const router = useRouter();
  const [missionId, setMissionId] = useState<string | null>(null);
  const [missionInfo, setMissionInfo] = useState<MissionInfoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<"accept" | "reject" | null>(null);
  const [done, setDone] = useState<"accepted" | "rejected" | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [expanded, setExpanded] = useState(true);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const mission = await getLastMission();
        if (cancelled) return;
        if (!mission) { setLoading(false); return; }
        const id = String(mission.id);
        setMissionId(id);
        startCountdown();
        // Charger les détails
        try {
          const info = await getMissionById(id);
          if (!cancelled) setMissionInfo(info);
        } catch {
          // détails optionnels
        }
      } catch {
        // pas de mission
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [startCountdown]);

  // Auto-refus quand countdown atteint 0
  useEffect(() => {
    if (countdown === 0 && missionId && !done && !acting) {
      setDone("rejected");
      cancelMission(missionId).catch(() => {});
      onRejected();
    }
  }, [countdown, missionId, done, acting, onRejected]);

  const handleAccept = async () => {
    if (!missionId || acting) return;
    try {
      setActing("accept");
      if (countdownRef.current) clearInterval(countdownRef.current);
      await acceptMission(missionId);

      // Générer le code de ramassage (best-effort — ne bloque pas l'acceptation)
      const orderId = String(
        (missionInfo?.order as Record<string, unknown> | undefined)?.id || ""
      );
      if (orderId) {
        try {
          const codeResult = await generatePickupCode(orderId);
          localStorage.setItem("delivery_pickup_code_raw", JSON.stringify(codeResult));
          const code =
            codeResult.code ??
            codeResult.qr_code ??
            codeResult.pickup_code ??
            codeResult.delivery_code ??
            "";
          if (code) localStorage.setItem("delivery_pickup_code", String(code));
        } catch {
          // Ne pas bloquer l'acceptation si la génération du code échoue
        }
      }

      // Réinitialiser la phase
      localStorage.setItem("mission_phase", "pickup");
      localStorage.removeItem("confirmed_pharmacy_ids");

      setDone("accepted");
      onAccepted();
      setTimeout(() => router.push("/mission-active"), 1500);
    } catch (err) {
      console.error("Erreur acceptation mission:", err);
      setActing(null);
    }
  };

  const handleReject = async () => {
    if (!missionId || acting) return;
    try {
      setActing("reject");
      if (countdownRef.current) clearInterval(countdownRef.current);
      await cancelMission(missionId);
      setDone("rejected");
      onRejected();
    } catch (err) {
      console.error("Erreur refus mission:", err);
      setActing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 flex items-center gap-3">
        <Loader2 size={18} className="text-[#22C55E] animate-spin shrink-0" />
        <p className="text-[13px] text-[#94A3B8]">Vérification des missions en attente…</p>
      </div>
    );
  }

  if (!missionId) return null;

  // ─ Résultat acceptation ─
  if (done === "accepted") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-5 flex items-center gap-3">
        <CheckCircle size={22} className="text-green-600 shrink-0" />
        <div>
          <p className="text-[14px] font-bold text-green-700">Mission acceptée !</p>
          <p className="text-[12px] text-green-600">Redirection vers vos missions…</p>
        </div>
      </div>
    );
  }

  // ─ Résultat refus ─
  if (done === "rejected") {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3">
        <XCircle size={22} className="text-red-500 shrink-0" />
        <div>
          <p className="text-[14px] font-bold text-red-600">Mission refusée</p>
          <p className="text-[12px] text-red-500">
            {countdown === 0 ? "Délai dépassé — mission automatiquement refusée." : "Vous avez refusé cette mission."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-[#22C55E] overflow-hidden shadow-md shadow-[#22C55E]/10">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-[#22C55E] to-[#16A34A] px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
            <Truck size={15} className="text-white" />
          </div>
          <span className="text-[14px] font-black text-white tracking-tight">
            Mission disponible !
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Countdown */}
          <div className="flex items-center gap-1.5">
            <Clock size={13} className="text-white/80" />
            <span className={`text-[13px] font-black text-white ${countdown <= 10 ? "animate-pulse" : ""}`}>
              {countdown}s
            </span>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        </div>
      </div>

      {/* Barre de progression countdown */}
      <div className="h-1 bg-[#E2E8F0]">
        <div
          className="h-full bg-[#22C55E] transition-all duration-1000"
          style={{ width: `${(countdown / 30) * 100}%` }}
        />
      </div>

      {expanded && (
        <div className="p-5">
          {/* Détails mission */}
          {missionInfo ? (
            <div className="space-y-3 mb-5">
              {/* Officine */}
              {missionInfo.officine && (
                <div className="flex items-start gap-3 p-3.5 bg-[#F0FDF4] rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-[#22C55E]/20 flex items-center justify-center shrink-0">
                    <Building2 size={15} className="text-[#22C55E]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#22C55E] uppercase tracking-wide mb-0.5">
                      Collecte — Officine
                    </p>
                    <p className="text-[13px] font-bold text-[#1E293B] truncate">
                      {missionInfo.officine.name ?? "Officine"}
                    </p>
                    {missionInfo.officine.address && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-[#94A3B8] shrink-0" />
                        <p className="text-[11px] text-[#94A3B8] truncate">{missionInfo.officine.address}</p>
                      </div>
                    )}
                    {missionInfo.officine.telephone && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-[#94A3B8] shrink-0" />
                        <p className="text-[11px] text-[#94A3B8]">{missionInfo.officine.telephone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Patient */}
              {missionInfo.patient && (
                <div className="flex items-start gap-3 p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <div className="w-8 h-8 rounded-lg bg-[#E2E8F0] flex items-center justify-center shrink-0">
                    <User size={15} className="text-[#64748B]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide mb-0.5">
                      Livraison — Patient
                    </p>
                    <p className="text-[13px] font-bold text-[#1E293B] truncate">
                      {[missionInfo.patient.first_name, missionInfo.patient.last_name].filter(Boolean).join(" ") || "Patient"}
                    </p>
                    {missionInfo.patient.address && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={11} className="text-[#94A3B8] shrink-0" />
                        <p className="text-[11px] text-[#94A3B8] truncate">{missionInfo.patient.address}</p>
                      </div>
                    )}
                    {missionInfo.patient.telephone && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Phone size={11} className="text-[#94A3B8] shrink-0" />
                        <p className="text-[11px] text-[#94A3B8]">{missionInfo.patient.telephone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Commande */}
              {missionInfo.order && (
                <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">
                      Commande
                    </p>
                    {missionInfo.order.total_amount && (
                      <span className="text-[12px] font-black text-[#22C55E]">
                        {Number(missionInfo.order.total_amount).toLocaleString("fr-FR")} FCFA
                      </span>
                    )}
                  </div>
                  {missionInfo.order.items && missionInfo.order.items.length > 0 && (
                    <div className="space-y-1">
                      {missionInfo.order.items.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[11px]">
                          <span className="text-[#64748B] truncate flex-1">
                            <span className="font-semibold">×{item.quantity}</span> {item.product_name}
                          </span>
                          {item.unit_price && (
                            <span className="text-[#94A3B8] ml-2 shrink-0">
                              {Number(item.unit_price).toLocaleString("fr-FR")} F
                            </span>
                          )}
                        </div>
                      ))}
                      {missionInfo.order.items.length > 4 && (
                        <p className="text-[10px] text-[#94A3B8]">
                          +{missionInfo.order.items.length - 4} autre(s) article(s)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-[#F8FAFC] rounded-xl mb-5">
              <AlertCircle size={14} className="text-[#94A3B8] shrink-0" />
              <p className="text-[12px] text-[#94A3B8]">
                Détails de la mission en cours de chargement…
              </p>
            </div>
          )}

          {/* Boutons Accept / Refus */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleReject}
              disabled={!!acting}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#EF4444] text-[#EF4444] font-bold text-[13px] hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {acting === "reject"
                ? <Loader2 size={16} className="animate-spin" />
                : <XCircle size={16} />
              }
              {acting === "reject" ? "Refus…" : "Refuser"}
            </button>

            <button
              onClick={handleAccept}
              disabled={!!acting}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold text-[13px] shadow-md shadow-[#22C55E]/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {acting === "accept"
                ? <Loader2 size={16} className="animate-spin" />
                : <CheckCircle size={16} />
              }
              {acting === "accept" ? "Acceptation…" : "Accepter"}
            </button>
          </div>

          {countdown <= 10 && (
            <p className="text-center text-[11px] text-[#EF4444] font-semibold mt-3 animate-pulse">
              ⚠ Refus automatique dans {countdown} seconde{countdown > 1 ? "s" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refresh,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [missionKey, setMissionKey] = useState(0); // force remount du bloc mission
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleMarkRead = useCallback(
    async (notif: AppNotification) => {
      markAsRead(notif.id);
      try {
        await markNotificationAsRead(notif.id);
      } catch {
        // local-only fallback déjà fait
      }
    },
    [markAsRead]
  );

  const handleNotifClick = (notif: AppNotification) => {
    if (!notif.read) handleMarkRead(notif);
    setExpandedId((prev) => (prev === notif.id ? null : notif.id));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl hover:bg-[#F0FDF4] text-[#64748B] transition-colors"
            title="Retour"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
            <Bell size={18} className="text-[#22C55E]" />
          </div>
          <div>
            <h1 className="text-[20px] font-black text-[#1E293B] leading-none">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-[12px] text-[#22C55E] font-semibold mt-0.5">
                {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#22C55E] hover:bg-[#F0FDF4] rounded-xl transition-colors"
            >
              <CheckCheck size={14} />
              Tout lire
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#F0FDF4] text-[#94A3B8] hover:text-[#22C55E] transition-colors disabled:opacity-50"
            title="Actualiser"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Bloc Mission en attente ── */}
      <div>
        <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">
          Mission en attente
        </p>
        <PendingMissionBlock
          key={missionKey}
          onAccepted={() => {}}
          onRejected={() => setMissionKey((k) => k + 1)}
        />
      </div>

      {/* ── Liste des notifications ── */}
      <div>
        <p className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2 px-1">
          Historique
        </p>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
          {notifications.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] flex items-center justify-center">
                <BellOff size={26} className="text-gray-200" />
              </div>
              <p className="text-[14px] font-semibold text-[#94A3B8]">Aucune notification</p>
              <p className="text-[12px] text-[#94A3B8]">Vos alertes apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F8FAFC]">
              {notifications.map((notif) => {
                const isExpanded = expandedId === notif.id;
                const isMission = isMissionNotif(notif);

                return (
                  <div key={notif.id}>
                    <div
                      onClick={() => handleNotifClick(notif)}
                      className={`px-4 py-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                        !notif.read
                          ? "bg-[#F0FDF4] border-l-[3px] border-l-[#22C55E] hover:bg-[#E8FDF0]"
                          : "hover:bg-[#F8FAFC]"
                      }`}
                    >
                      {/* Icône */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          !notif.read ? "bg-[#22C55E]/15 text-[#22C55E]" : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {getNotifIcon(notif)}
                      </div>

                      {/* Texte */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-bold text-[#1E293B] line-clamp-1">
                            {notif.title}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-[#94A3B8] whitespace-nowrap">
                              {formatDate(notif.receivedAt)}
                            </span>
                            {isMission && (
                              <span className="text-[#22C55E]">
                                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className={`text-[12px] text-[#64748B] mt-0.5 ${isExpanded ? "" : "line-clamp-2"}`}>
                          {notif.content || notif.body}
                        </p>

                        {/* Tag mission */}
                        {isMission && !isExpanded && (
                          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#22C55E] bg-[#F0FDF4] rounded-full px-2 py-0.5">
                            <Truck size={9} />
                            Mission
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Panneau étendu (mission) */}
                    {isExpanded && isMission && (
                      <div className="px-4 pb-4 bg-[#F8FAFC] border-l-[3px] border-l-[#22C55E]/30">
                        <p className="text-[12px] text-[#64748B] py-3">
                          {notif.content || notif.body}
                        </p>
                        <a
                          href="/missions"
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#22C55E] hover:bg-[#16A34A] text-white text-[12px] font-bold rounded-xl transition-colors shadow-sm"
                        >
                          <ArrowRight size={13} />
                          Voir les missions
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
