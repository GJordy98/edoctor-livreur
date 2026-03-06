"use client";

/**
 * Page Scan QR Officine (Pickup) — Story 3.1
 * POST /api/v1/scan-qrcode-pickup/
 * Le livreur confirme la collecte des médicaments à l'officine.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ScanLine, CheckCircle, AlertCircle,
  Loader2, Building2, MapPin, Phone, Package,
} from "lucide-react";
import { scanQrCodePickup, type MissionInfoResponse } from "@/lib/api-client";

export default function PickupScanPage() {
  const router = useRouter();
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [missionInfo, setMissionInfo] = useState<MissionInfoResponse | null>(null);

  // Charger les infos mission depuis localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("current_mission_info");
      if (raw) {
        setMissionInfo(JSON.parse(raw) as MissionInfoResponse);
      }
    } catch { /* ignore */ }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qrCode.trim()) {
      setMessage({ type: "error", text: "Veuillez saisir ou scanner un code QR." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await scanQrCodePickup({ code: qrCode.trim() });
      setSuccess(true);
      setMessage({ type: "success", text: "Collecte confirmée ! Retour à la mission..." });
      localStorage.setItem("pickup_done", "true");
      setTimeout(() => router.push("/mission-active"), 2000);
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Code invalide ou mission déjà confirmée.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-20">

      {/* En-tête */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-[#F0FDF4] text-[#64748B] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#1E293B] tracking-tight">
            Collecte Officine
          </h1>
          <p className="text-[#94A3B8] text-sm mt-0.5">
            Récupérez les médicaments et confirmez
          </p>
        </div>
      </div>

      {/* Infos officine depuis la mission */}
      {missionInfo?.officine && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
              <Building2 size={18} className="text-[#22C55E]" />
            </div>
            <div>
              <p className="text-[11px] text-[#94A3B8] uppercase font-bold tracking-wider">Officine de collecte</p>
              <p className="font-bold text-[#1E293B] text-sm">{missionInfo.officine.name}</p>
            </div>
          </div>
          <div className="space-y-1.5 text-[13px]">
            {missionInfo.officine.address && (
              <p className="flex items-start gap-2 text-[#64748B]">
                <MapPin size={13} className="shrink-0 mt-0.5 text-[#94A3B8]" />
                {missionInfo.officine.address}
              </p>
            )}
            {missionInfo.officine.telephone && (
              <a
                href={`tel:${missionInfo.officine.telephone}`}
                className="flex items-center gap-2 text-[#22C55E] hover:underline"
              >
                <Phone size={13} />
                {missionInfo.officine.telephone}
              </a>
            )}
            {missionInfo.officine.latitude && missionInfo.officine.longitude && (
              <a
                href={`https://maps.google.com/?q=${missionInfo.officine.latitude},${missionInfo.officine.longitude}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-500 hover:underline text-[12px]"
              >
                <MapPin size={12} />Ouvrir dans Maps
              </a>
            )}
          </div>
        </div>
      )}

      {/* Liste des médicaments à récupérer */}
      {missionInfo?.order?.items && missionInfo.order.items.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-amber-500" />
            <p className="font-bold text-[#1E293B] text-sm">Médicaments à récupérer</p>
            {missionInfo.order.total_amount && (
              <span className="ml-auto text-sm font-bold text-[#22C55E]">
                {missionInfo.order.total_amount} FCFA
              </span>
            )}
          </div>
          <div className="divide-y divide-[#F8FAFC]">
            {missionInfo.order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-[13px] text-[#1E293B]">{item.product_name || "Produit"}</span>
                <span className="text-[12px] font-semibold text-[#64748B] bg-[#F8FAFC] px-2 py-0.5 rounded-full">
                  ×{item.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Message résultat */}
      {message && (
        <div
          className={`mb-5 p-4 rounded-xl flex items-center gap-3 border ${
            message.type === "success"
              ? "bg-[#F0FDF4] border-[#22C55E]/30 text-green-700"
              : "bg-red-50 border-red-100 text-red-600"
          }`}
        >
          {message.type === "success" ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      {!success && (
        <>
          {/* Zone scan */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative w-28 h-28 rounded-2xl bg-[#22C55E]/10 flex items-center justify-center border-2 border-dashed border-[#22C55E]/40">
              <ScanLine size={48} className="text-[#22C55E]" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#22C55E] rounded-full animate-pulse" />
            </div>
            <p className="text-sm text-[#94A3B8] mt-3 text-center max-w-xs">
              Scannez le QR code affiché au comptoir de l&apos;officine pour confirmer la collecte.
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E2E8F0]">
              <label className="block text-sm font-bold text-[#1E293B] mb-3">
                Code QR de l&apos;Officine
              </label>
              <input
                type="text"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Ex: QR-ABC123XYZ"
                className="block w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[#1E293B] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent text-sm transition-all placeholder-[#94A3B8]"
                autoFocus
              />
              <p className="text-xs text-[#94A3B8] mt-2">
                Ce code est affiché sur le comptoir ou la porte de l&apos;officine.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !qrCode.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#22C55E] hover:bg-[#16A34A] text-white text-lg font-bold shadow-lg shadow-[#22C55E]/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 size={20} className="animate-spin" /><span>Confirmation…</span></>
              ) : (
                <><CheckCircle size={20} /><span>Confirmer la collecte</span></>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/mission-active")}
              className="w-full py-3 rounded-2xl border border-[#E2E8F0] text-[#64748B] font-semibold text-sm hover:bg-[#F8FAFC] transition-colors"
            >
              Retour à la mission
            </button>
          </form>
        </>
      )}
    </div>
  );
}
