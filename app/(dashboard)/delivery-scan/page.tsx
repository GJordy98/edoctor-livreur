"use client";

/**
 * Page Confirmation Livraison Patient — Story 3.2
 * POST /api/v1/scan-qrcode-order/{order_id}/delivery
 * Le livreur saisit le code fourni par le patient pour confirmer la réception du colis.
 * Payload: { code: "649655" }
 * Réponse OK: { message: "Order confirmed. Payment released successfully." }
 *
 * Note: le paramètre de route peut recevoir le missionId en fallback depuis mission-active.
 * Ce composant résout toujours le vrai order.id avant d'appeler l'endpoint.
 */

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  PackageCheck,
  CheckCircle,
  AlertCircle,
  Loader2,
  KeyRound,
} from "lucide-react";
import {
  confirmDeliveryReception,
  completeMission,
  getMissionById,
  type MissionInfoResponse,
} from "@/lib/api-client";

export default function DeliveryScanPage({
  params,
}: {
  params: Promise<{ order_id: string }>;
}) {
  const { order_id: routeParam } = use(params);
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // IDs résolus de façon fiable
  const [resolvedOrderId, setResolvedOrderId] = useState<string>("");
  const [missionIdForComplete, setMissionIdForComplete] = useState<string>("");
  const [resolving, setResolving] = useState(true);

  /**
   * Au montage, on s'assure d'avoir le vrai order.id.
   * Si le param de route était le missionId (fallback de mission-active),
   * on lit current_mission_info depuis le localStorage, ou on appelle l'API.
   */
  useEffect(() => {
    async function resolveIds() {
      setResolving(true);
      try {
        let orderId = routeParam;
        let missionId = "";

        // 1. Lire les données stockées pendant la mission active
        try {
          const missionRaw = localStorage.getItem("current_mission");
          if (missionRaw) {
            const m = JSON.parse(missionRaw) as Record<string, unknown>;
            missionId = String(m.id || "");
          }
        } catch { /* ignore */ }

        try {
          const infoRaw = localStorage.getItem("current_mission_info");
          if (infoRaw) {
            const info = JSON.parse(infoRaw) as MissionInfoResponse;
            const oid = String(
              (info.order as Record<string, unknown> | undefined)?.id || ""
            );
            if (oid) orderId = oid;
          }
        } catch { /* ignore */ }

        // 2. Si on n'a toujours pas l'order.id (ou si c'est le missionId en fallback),
        //    on appelle l'API avec le missionId pour récupérer le vrai order.id.
        if (missionId && (!orderId || orderId === missionId)) {
          try {
            const info = await getMissionById(missionId);
            const oid = String(
              (info.order as Record<string, unknown> | undefined)?.id || ""
            );
            if (oid) {
              orderId = oid;
              // Mettre à jour le cache localStorage
              localStorage.setItem("current_mission_info", JSON.stringify(info));
            }
          } catch { /* ignore */ }
        }

        setResolvedOrderId(orderId || routeParam);
        setMissionIdForComplete(missionId || routeParam);
      } finally {
        setResolving(false);
      }
    }

    resolveIds();
  }, [routeParam]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setMessage({
        type: "error",
        text: "Veuillez saisir le code de confirmation fourni par le patient.",
      });
      return;
    }
    if (!resolvedOrderId) {
      setMessage({ type: "error", text: "Identifiant de commande manquant." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // Confirmation de réception — POST /scan-qrcode-order/{order_id}/delivery
      const result = await confirmDeliveryReception(resolvedOrderId, trimmed);

      // Complétion de mission (non bloquante) — utilise le missionId, pas l'order.id
      try {
        await completeMission(missionIdForComplete || resolvedOrderId);
      } catch (err) {
        console.warn("completeMission a échoué (non bloquant):", err);
      }

      // Sauvegarder dans l'historique local
      try {
        const missionRaw = localStorage.getItem("current_mission");
        const missionInfoRaw = localStorage.getItem("current_mission_info");
        const missionBase = missionRaw
          ? (JSON.parse(missionRaw) as Record<string, unknown>)
          : {};
        const missionInfo = missionInfoRaw
          ? (JSON.parse(missionInfoRaw) as Record<string, unknown>)
          : {};
        const officine =
          (missionInfo.officine as Record<string, unknown>) ?? {};
        const patient = (missionInfo.patient as Record<string, unknown>) ?? {};
        const order = (missionInfo.order as Record<string, unknown>) ?? {};
        const historyEntry = {
          id: resolvedOrderId,
          status: "delivered",
          pharmacy_name: String(
            officine.name ??
            missionBase.pharmacy_name ??
            missionBase.title ??
            "Officine",
          ),
          pharmacy_address: String(
            officine.address ??
            missionBase.pickup_address ??
            missionBase.address ??
            "",
          ),
          client_name: [patient.first_name, patient.last_name]
            .filter(Boolean)
            .join(" "),
          client_address: String(patient.address ?? ""),
          date: new Date().toISOString(),
          price: order.total_amount ? `${order.total_amount} FCFA` : "",
        };
        const history = JSON.parse(
          localStorage.getItem("delivery_mission_history") || "[]",
        ) as unknown[];
        history.unshift(historyEntry);
        localStorage.setItem(
          "delivery_mission_history",
          JSON.stringify(history.slice(0, 100)),
        );
      } catch {
        // ignore
      }

      // Nettoyer le storage de mission
      localStorage.removeItem("current_mission");
      localStorage.removeItem("current_mission_info");
      localStorage.removeItem("pickup_done");

      setSuccessMessage(
        result.message || "Commande confirmée. Paiement libéré avec succès.",
      );
      setSuccess(true);
    } catch (err: unknown) {
      const text =
        err instanceof Error
          ? err.message
          : "Code invalide ou livraison déjà confirmée.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-[#F0FDF4] text-[#64748B] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#1E293B] tracking-tight">
            Confirmer la livraison
          </h1>
          <p className="text-[#94A3B8] text-sm mt-0.5">
            Validation de réception chez le patient
          </p>
        </div>
      </div>

      {/* Écran succès */}
      {success ? (
        <div className="flex flex-col items-center text-center gap-6 py-8">
          <div className="w-24 h-24 rounded-full bg-[#22C55E]/10 flex items-center justify-center animate-bounce-once">
            <CheckCircle size={52} className="text-[#22C55E]" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#1E293B]">
              Livraison confirmée !
            </h2>
            <p className="text-[#22C55E] font-semibold mt-2 text-sm">
              {successMessage}
            </p>
            <p className="text-[#94A3B8] mt-1 text-sm">
              Commande #{resolvedOrderId?.substring(0, 8)} livrée avec succès.
            </p>
          </div>
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => router.push("/missions")}
              className="w-full py-3 rounded-2xl bg-[#22C55E] text-white font-bold hover:bg-[#16A34A] transition-colors"
            >
              Retour aux missions
            </button>
            <button
              onClick={() => router.push("/history")}
              className="w-full py-3 rounded-2xl border border-[#E2E8F0] text-[#64748B] font-semibold text-sm hover:bg-[#F8FAFC] transition-colors"
            >
              Voir l&apos;historique
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Icône + description */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-32 h-32 rounded-2xl bg-blue-50 flex items-center justify-center border-2 border-dashed border-blue-300">
              <PackageCheck size={56} className="text-blue-500" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <p className="text-sm text-[#94A3B8] mt-4 text-center max-w-xs">
              Demandez au patient son <strong>code de confirmation</strong> et
              saisissez-le ci-dessous pour valider la réception du colis.
            </p>
            {/* Résolution de l'order ID en cours */}
            {resolving ? (
              <p className="text-xs text-[#94A3B8] mt-2 flex items-center gap-1">
                <Loader2 size={11} className="animate-spin" />
                Chargement des informations…
              </p>
            ) : resolvedOrderId ? (
              <p className="text-xs text-[#94A3B8] mt-2">
                Commande : #{resolvedOrderId.substring(0, 12)}
              </p>
            ) : null}
          </div>

          {/* Message retour API */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${message.type === "success"
                ? "bg-[#F0FDF4] border-[#22C55E]/30 text-green-700"
                : "bg-red-50 border-red-100 text-red-600"
                }`}
            >
              {message.type === "success" ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <p className="text-sm font-semibold">{message.text}</p>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E2E8F0]">
              <label className="block text-sm font-bold text-[#1E293B] mb-3 flex items-center gap-2">
                <KeyRound size={16} className="text-blue-500" />
                Code de confirmation du patient
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/[^0-9]/g, ""))
                }
                placeholder="Ex: 649655"
                maxLength={12}
                className="block w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-[#1E293B] focus:ring-2 focus:ring-blue-500 focus:border-transparent text-2xl font-bold tracking-widest text-center transition-all placeholder-[#CBD5E1] placeholder:text-base placeholder:tracking-normal placeholder:font-normal"
                autoFocus
              />
              <p className="text-xs text-[#94A3B8] mt-2 text-center">
                Le patient dispose de ce code dans son application.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || resolving || !code.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Confirmation...</span>
                </>
              ) : (
                <>
                  <CheckCircle size={20} />
                  <span>Valider la réception</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/missions")}
              className="w-full py-3 rounded-2xl border border-[#E2E8F0] text-[#64748B] font-semibold text-sm hover:bg-[#F8FAFC] transition-colors"
            >
              Annuler
            </button>
          </form>
        </>
      )}
    </div>
  );
}
