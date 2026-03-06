"use client";

/**
 * Page Mission Active — e-Dr TIM Delivery
 * Orchestre le flux complet après acceptation :
 *   Phase 1 (COLLECTE)  : code ramassage + carte pharmacies + liste officines
 *   Phase 2 (LIVRAISON) : infos patient + carte + bouton scan QR patient
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

// react-barcode — import dynamique (utilise SVG/canvas, incompatible SSR)
const Barcode = dynamic(() => import("react-barcode"), { ssr: false });
import {
  User, Package, Loader2, X, AlertTriangle,
  ScanLine, Copy, Check, Phone, MapPin, Truck,
  Store, ChevronRight, Home, Map, RefreshCw, Building2,
} from "lucide-react";
import {
  getPickupOfficinesForMission,
  getMissionById,
  cancelMission,
  type PickupOfficine,
  type MissionInfoResponse,
} from "@/lib/api-client";
import type { PharmacyMarker } from "@/app/(dashboard)/tracking/PharmaciesMapView";

const PharmaciesMapView = dynamic(
  () => import("@/app/(dashboard)/tracking/PharmaciesMapView"),
  { ssr: false }
);

type Phase = "pickup" | "delivery";

// ─── helpers localStorage ────────────────────────────────────────────────────

function savePhase(p: Phase) {
  localStorage.setItem("mission_phase", p);
}

function saveConfirmed(ids: string[]) {
  localStorage.setItem("confirmed_pharmacy_ids", JSON.stringify(ids));
}

// ─── Composant principal ─────────────────────────────────────────────────────

export default function MissionActivePage() {
  const router = useRouter();

  // ── state ──────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>("pickup");
  const [missionId, setMissionId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [pickupOfficines, setPickupOfficines] = useState<PickupOfficine[]>([]);
  const [missionInfo, setMissionInfo] = useState<MissionInfoResponse | null>(null);
  const [loadingOfficines, setLoadingOfficines] = useState(true);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const gpsRef = useRef<number | null>(null);

  // ── Chargement initial depuis localStorage ─────────────────────────────────
  useEffect(() => {
    let mId = "";
    let oId = "";

    const missionRaw = localStorage.getItem("current_mission");
    if (missionRaw) {
      try {
        const m = JSON.parse(missionRaw) as Record<string, unknown>;
        mId = String(m.id || "");
      } catch { /* ignore */ }
    }

    const code = localStorage.getItem("delivery_pickup_code") || "";
    setPickupCode(code);

    // Try to get orderId from missionInfo saved
    const infoRaw = localStorage.getItem("current_mission_info");
    if (infoRaw) {
      try {
        const info = JSON.parse(infoRaw) as MissionInfoResponse;
        setMissionInfo(info);
        oId = String((info.order as Record<string, unknown>)?.id || "");
      } catch { /* ignore */ }
    }

    const savedPhase = (localStorage.getItem("mission_phase") as Phase) || "pickup";
    setPhase(savedPhase);

    const savedConfirmed = localStorage.getItem("confirmed_pharmacy_ids");
    if (savedConfirmed) {
      try { setConfirmedIds(JSON.parse(savedConfirmed) as string[]); } catch { /* ignore */ }
    }

    if (!mId) {
      router.replace("/missions");
      return;
    }

    setMissionId(mId);
    setOrderId(oId);

    // Récupérer les officines + infos mission
    const fetchAll = async () => {
      setLoadingOfficines(true);
      try {
        const [officines, info] = await Promise.all([
          getPickupOfficinesForMission(mId).catch(() => [] as PickupOfficine[]),
          getMissionById(mId).catch(() => null as MissionInfoResponse | null),
        ]);
        setPickupOfficines(officines);
        if (info) {
          setMissionInfo(info);
          const oid = String((info.order as Record<string, unknown>)?.id || "");
          if (oid) setOrderId(oid);
          // Si aucune officine depuis l'endpoint dédié, utiliser celle de la mission
          if (officines.length === 0 && info.officine) {
            setPickupOfficines([{
              id: "mission-officine",
              name: info.officine.name,
              address: info.officine.address,
              telephone: info.officine.telephone,
              latitude: info.officine.latitude,
              longitude: info.officine.longitude,
            }]);
          }
        }
      } finally {
        setLoadingOfficines(false);
      }
    };
    fetchAll();
  }, [router]);

  // ── GPS watch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    gpsRef.current = navigator.geolocation.watchPosition(
      (p) => setDriverPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => { },
      { enableHighAccuracy: true, timeout: 10000 }
    );
    return () => {
      if (gpsRef.current !== null) navigator.geolocation.clearWatch(gpsRef.current);
    };
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const copyCode = useCallback(async () => {
    if (!pickupCode) return;
    await navigator.clipboard.writeText(pickupCode).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pickupCode]);

  const confirmPharmacy = useCallback((id: string) => {
    setConfirmedIds((prev) => {
      const next = prev.includes(id) ? prev : [...prev, id];
      saveConfirmed(next);
      return next;
    });
  }, []);

  const switchToDelivery = () => {
    setPhase("delivery");
    savePhase("delivery");
  };

  const switchToPickup = () => {
    setPhase("pickup");
    savePhase("pickup");
  };

  const handleCancel = async () => {
    if (!missionId) return;
    setCancelLoading(true);
    try { await cancelMission(missionId); } catch { /* ignore */ }
    finally { setCancelLoading(false); }
    const keys = [
      "current_mission", "current_mission_info", "delivery_pickup_code",
      "delivery_pickup_code_raw", "mission_phase", "confirmed_pharmacy_ids", "pickup_done",
    ];
    keys.forEach((k) => localStorage.removeItem(k));
    router.replace("/missions");
  };

  const refreshOfficines = useCallback(async () => {
    if (!missionId) return;
    setLoadingOfficines(true);
    try {
      const officines = await getPickupOfficinesForMission(missionId);
      setPickupOfficines(officines);
    } catch { /* silent */ }
    finally { setLoadingOfficines(false); }
  }, [missionId]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const allConfirmed =
    pickupOfficines.length > 0 &&
    pickupOfficines.every((o) => confirmedIds.includes(o.id || ""));

  const confirmedCount = pickupOfficines.filter((o) =>
    confirmedIds.includes(o.id || "")
  ).length;

  const pharmacyMarkers: PharmacyMarker[] = pickupOfficines
    .map((o) => ({
      id: o.id || "",
      name: o.name,
      lat: Number(o.latitude),
      lng: Number(o.longitude),
      confirmed: confirmedIds.includes(o.id || ""),
    }))
    .filter((p) => !isNaN(p.lat) && !isNaN(p.lng) && p.lat !== 0 && p.lng !== 0);

  // Position GPS du patient : en priorité depuis order.delivery_address (vraie donnée backend),
  // fallback sur patient.latitude/longitude si l'ancien format est retourné.
  const deliveryAddr = missionInfo?.order?.delivery_address;
  const patientPos = (() => {
    const lat = deliveryAddr?.latitude ?? missionInfo?.patient?.latitude ?? null;
    const lng = deliveryAddr?.longitude ?? missionInfo?.patient?.longitude ?? null;
    if (lat != null && lng != null && lat !== 0 && lng !== 0) {
      return { lat: Number(lat), lng: Number(lng) };
    }
    return undefined;
  })();

  // Priorité : order.id depuis missionInfo (source fraîche du backend)
  //            puis orderId (state), puis missionId en dernier recours.
  const deliveryOrderId =
    String((missionInfo?.order as Record<string, unknown> | undefined)?.id || "") ||
    orderId ||
    missionId;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto pb-24">

      {/* ── Indicateur de phase ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-xs font-bold text-[#22C55E] uppercase tracking-wide">
            Mission en cours
          </span>
          {missionId && (
            <span className="text-xs text-[#94A3B8] font-mono ml-auto">
              #{missionId.substring(0, 8)}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={switchToPickup}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${phase === "pickup"
              ? "bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/20"
              : "bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0] hover:bg-[#F0FDF4]"
              }`}
          >
            <Store size={14} />
            Phase 1 — Collecte
          </button>
          <button
            onClick={switchToDelivery}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${phase === "delivery"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
              : "bg-[#F8FAFC] text-[#94A3B8] border border-[#E2E8F0] hover:bg-[#EFF6FF]"
              }`}
          >
            <Truck size={14} />
            Phase 2 — Livraison
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          PHASE 1 : COLLECTE
         ═══════════════════════════════════════════════════════════════════════ */}
      {phase === "pickup" && (
        <div className="space-y-4">

          {/* Code de ramassage */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#22C55E]/10 flex items-center justify-center">
                <ScanLine size={18} className="text-[#22C55E]" />
              </div>
              <div>
                <p className="text-[11px] text-[#94A3B8] uppercase font-bold tracking-wider">
                  Code de ramassage
                </p>
                <p className="text-xs text-[#64748B]">
                  Montrez ce code à chaque pharmacie
                </p>
              </div>
            </div>

            {pickupCode ? (
              <div className="bg-[#F0FDF4] rounded-xl p-4 border border-[#22C55E]/20">
                {pickupCode.startsWith("data:image") ? (
                  // Image base64 (QR code retourné directement par le backend)
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pickupCode}
                    alt="QR Code ramassage"
                    className="mx-auto max-w-[200px] max-h-[200px] rounded-xl"
                  />
                ) : (
                  // Code numérique → affichage code-barres scannable
                  <div className="flex flex-col items-center gap-3">
                    {/* Code-barres SVG scannable */}
                    <div className="bg-white rounded-xl p-3 shadow-inner w-full flex justify-center">
                      <Barcode
                        value={pickupCode}
                        format="CODE128"
                        width={2}
                        height={80}
                        displayValue={false}
                        background="#ffffff"
                        lineColor="#1E293B"
                        margin={8}
                      />
                    </div>
                    {/* Code en clair, plus petit */}
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-base font-bold text-[#1E293B] tracking-[0.25em] bg-white px-3 py-1 rounded-lg border border-[#E2E8F0] shadow-sm">
                        {pickupCode}
                      </span>
                      <button
                        onClick={copyCode}
                        title="Copier"
                        className="p-1.5 rounded-lg border border-[#22C55E]/30 text-[#22C55E] hover:bg-[#22C55E]/10 transition-colors"
                      >
                        {copied ? <Check size={13} /> : <Copy size={13} />}
                      </button>
                    </div>
                    {copied && (
                      <p className="text-xs text-[#22C55E] font-semibold">Copié !</p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#F8FAFC] rounded-xl p-4 text-center border border-[#E2E8F0]">
                <Package size={28} className="text-[#94A3B8] mx-auto mb-2" />
                <p className="text-sm text-[#94A3B8]">
                  Code non disponible — utilisez votre ID mission
                </p>
                <p className="font-mono text-lg font-black text-[#1E293B] mt-2 break-all">
                  {missionId}
                </p>
              </div>
            )}
          </div>

          {/* Carte des officines */}
          {pharmacyMarkers.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center gap-2">
                <Map size={15} className="text-[#22C55E]" />
                <span className="text-sm font-bold text-[#1E293B]">
                  Carte des officines
                </span>
                <span className="ml-auto text-xs text-[#94A3B8]">
                  {confirmedCount}/{pharmacyMarkers.length} collectés
                </span>
              </div>
              <div className="relative" style={{ height: 220 }}>
                <PharmaciesMapView
                  userPosition={driverPos}
                  pharmacies={pharmacyMarkers}
                />
              </div>
            </div>
          )}

          {/* Liste des officines */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center gap-2">
              <Building2 size={15} className="text-[#22C55E]" />
              <span className="text-sm font-bold text-[#1E293B]">Officines à visiter</span>
              <button
                onClick={refreshOfficines}
                disabled={loadingOfficines}
                className="ml-auto text-[#94A3B8] hover:text-[#22C55E] transition-colors"
                title="Actualiser"
              >
                <RefreshCw size={13} className={loadingOfficines ? "animate-spin" : ""} />
              </button>
            </div>

            {loadingOfficines ? (
              <div className="py-8 flex items-center justify-center gap-2">
                <Loader2 size={18} className="text-[#22C55E] animate-spin" />
                <span className="text-sm text-[#94A3B8]">Chargement...</span>
              </div>
            ) : pickupOfficines.length === 0 ? (
              <div className="py-8 text-center">
                <Store size={28} className="text-[#94A3B8] mx-auto mb-2" />
                <p className="text-sm text-[#94A3B8]">Aucune officine trouvée</p>
                <p className="text-xs text-[#94A3B8] mt-1">
                  Consultez votre mission pour les détails
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F8FAFC]">
                {pickupOfficines.map((officine, idx) => {
                  const isConfirmed = confirmedIds.includes(officine.id || "");
                  return (
                    <div
                      key={officine.id || idx}
                      className={`p-4 transition-colors ${isConfirmed ? "bg-[#F0FDF4]" : "bg-white"}`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Numéro */}
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0 ${isConfirmed
                            ? "bg-[#22C55E] text-white"
                            : "bg-[#22C55E]/10 text-[#22C55E]"
                            }`}
                        >
                          {isConfirmed ? "✓" : idx + 1}
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1E293B] text-sm truncate">
                            {officine.name || `Officine ${idx + 1}`}
                          </p>
                          {officine.address && (
                            <p className="text-xs text-[#94A3B8] flex items-center gap-1 mt-0.5">
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">{officine.address}</span>
                            </p>
                          )}
                          {officine.telephone && (
                            <a
                              href={`tel:${officine.telephone}`}
                              className="text-xs text-[#22C55E] flex items-center gap-1 mt-0.5 hover:underline"
                            >
                              <Phone size={10} />{officine.telephone}
                            </a>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {!isConfirmed ? (
                            <>
                              {/* Naviguer vers pickup-scan */}
                              <a
                                href="/pickup-scan"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#22C55E] text-white text-xs font-bold hover:bg-[#16A34A] transition-colors"
                              >
                                <ScanLine size={12} />
                                Scanner
                              </a>
                              {/* Marquer manuellement comme collecté */}
                              <button
                                onClick={() => confirmPharmacy(officine.id || `ph-${idx}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#22C55E]/40 text-[#22C55E] text-xs font-semibold hover:bg-[#F0FDF4] transition-colors"
                              >
                                <Check size={12} />
                                Récupéré
                              </button>
                            </>
                          ) : (
                            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#22C55E]/10 text-[#22C55E] text-xs font-bold">
                              <Check size={12} />
                              Collecté
                            </span>
                          )}
                          {/* Ouvrir Maps si coordonnées dispo */}
                          {officine.latitude && officine.longitude && (
                            <a
                              href={`https://maps.google.com/?q=${officine.latitude},${officine.longitude}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] text-blue-500 hover:bg-blue-50 transition-colors"
                            >
                              <MapPin size={10} />Maps
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bouton passer en phase livraison */}
          <button
            onClick={switchToDelivery}
            className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-base font-bold shadow-lg transition-all active:scale-[0.98] ${allConfirmed || pickupOfficines.length === 0
              ? "bg-blue-600 text-white shadow-blue-600/20 hover:bg-blue-700"
              : "bg-[#F8FAFC] text-[#64748B] border-2 border-[#E2E8F0] hover:bg-[#F1F5F9]"
              }`}
          >
            <Truck size={20} />
            {allConfirmed || pickupOfficines.length === 0
              ? "Tous collectés — Aller livrer le patient"
              : `Passer à la livraison (${confirmedCount}/${pickupOfficines.length})`}
            <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          PHASE 2 : LIVRAISON
         ═══════════════════════════════════════════════════════════════════════ */}
      {phase === "delivery" && (
        <div className="space-y-4">

          {/* Carte patient */}
          {patientPos && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center gap-2">
                <Map size={15} className="text-blue-500" />
                <span className="text-sm font-bold text-[#1E293B]">
                  Position du patient
                </span>
              </div>
              <div className="relative" style={{ height: 240 }}>
                <PharmaciesMapView
                  userPosition={driverPos}
                  pharmacies={[]}
                  patientPosition={patientPos}
                />
              </div>
            </div>
          )}

          {/* Infos patient */}
          {(missionInfo?.patient || deliveryAddr) && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <User size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-[11px] text-[#94A3B8] uppercase font-bold tracking-wider">
                    Patient — Destinataire
                  </p>
                  <p className="font-bold text-[#1E293B] text-sm">
                    {[missionInfo?.patient?.first_name, missionInfo?.patient?.last_name]
                      .filter(Boolean)
                      .join(" ") || "Patient"}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                {/* Adresse depuis delivery_address */}
                {(() => {
                  const addr = deliveryAddr;
                  const parts = [addr?.rue, addr?.quater, addr?.city].filter(Boolean);
                  const fullAddr = parts.join(", ") || missionInfo?.patient?.address;
                  return fullAddr ? (
                    <p className="flex items-start gap-2 text-[#64748B]">
                      <Home size={14} className="shrink-0 mt-0.5 text-[#94A3B8]" />
                      {fullAddr}
                    </p>
                  ) : null;
                })()}
                {/* Téléphone */}
                {missionInfo?.patient?.telephone && (
                  <a
                    href={`tel:${missionInfo.patient.telephone}`}
                    className="flex items-center gap-2 text-[#22C55E] hover:underline font-semibold"
                  >
                    <Phone size={14} />
                    {missionInfo.patient.telephone}
                  </a>
                )}
                {/* Coordonnées GPS */}
                {patientPos && (
                  <div className="mt-3 pt-3 border-t border-[#F1F5F9] space-y-2">
                    <p className="text-[11px] text-[#94A3B8] uppercase font-bold tracking-wider">
                      Coordonnées GPS
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-center">
                        <p className="text-[10px] text-[#94A3B8] font-bold uppercase">Latitude</p>
                        <p className="font-mono text-sm font-bold text-[#1E293B]">{patientPos.lat.toFixed(5)}</p>
                      </div>
                      <div className="bg-[#F8FAFC] rounded-xl p-2.5 text-center">
                        <p className="text-[10px] text-[#94A3B8] font-bold uppercase">Longitude</p>
                        <p className="font-mono text-sm font-bold text-[#1E293B]">{patientPos.lng.toFixed(5)}</p>
                      </div>
                    </div>
                    <a
                      href={`https://maps.google.com/?q=${patientPos.lat},${patientPos.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-sm font-semibold"
                    >
                      <MapPin size={14} />
                      Ouvrir l&apos;itinéraire dans Google Maps
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}


          {/* Commande */}
          {missionInfo?.order && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-amber-500" />
                  <span className="text-sm font-bold text-[#1E293B]">Commande à livrer</span>
                </div>
                {missionInfo.order.total_amount && (
                  <span className="text-sm font-black text-[#22C55E]">
                    {Number(missionInfo.order.total_amount).toLocaleString("fr-FR")} FCFA
                  </span>
                )}
              </div>
              {missionInfo.order.items && missionInfo.order.items.length > 0 && (
                <div className="space-y-1.5">
                  {missionInfo.order.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 border-b border-[#F8FAFC] last:border-0"
                    >
                      <span className="text-sm text-[#1E293B]">
                        {item.product_name || "Produit"}
                      </span>
                      <span className="text-xs font-semibold text-[#64748B] bg-[#F8FAFC] px-2 py-0.5 rounded-full">
                        ×{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bouton confirmer livraison (scan QR patient) */}
          <a
            href={`/delivery-scan/${deliveryOrderId}`}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
          >
            <ScanLine size={20} />
            Scanner le QR du patient
          </a>

          {/* Retour collecte */}
          <button
            onClick={switchToPickup}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-[#E2E8F0] text-[#64748B] text-sm font-semibold hover:bg-[#F8FAFC] transition-colors"
          >
            <Store size={16} />← Retour collecte officines
          </button>
        </div>
      )}

      {/* ── Annulation mission ── */}
      {!showCancel ? (
        <button
          onClick={() => setShowCancel(true)}
          className="w-full mt-4 py-3 rounded-2xl border-2 border-red-200 text-red-500 text-sm font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <X size={16} />Annuler la mission
        </button>
      ) : (
        <div className="mt-4 rounded-2xl border-2 border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700">Annuler cette mission ?</p>
              <p className="text-xs text-red-500 mt-0.5">
                Cette action est irréversible. La mission sera libérée.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCancel(false)}
              className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-500 text-sm font-semibold hover:bg-red-100 transition-colors"
            >
              Retour
            </button>
            <button
              onClick={handleCancel}
              disabled={cancelLoading}
              className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {cancelLoading
                ? <><Loader2 size={14} className="animate-spin" />Annulation...</>
                : "Confirmer l'annulation"
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

