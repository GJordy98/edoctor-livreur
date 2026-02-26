"use client";

/**
 * Page Scan QR Patient (Livraison) — Story 3.2
 * POST /api/v1/scan-qrcode-order/{order_id}/delivery
 * Le livreur scanne le QR du patient pour confirmer la livraison finale.
 */

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { scanOrderDelivery } from "@/lib/api-client";

export default function DeliveryScanPage({ params }: { params: Promise<{ order_id: string }> }) {
  const { order_id } = use(params);
  const router = useRouter();
  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!qrCode.trim()) {
      setMessage({ type: "error", text: "Veuillez saisir ou scanner le code QR du patient." });
      return;
    }
    if (!order_id) {
      setMessage({ type: "error", text: "Identifiant de commande manquant." });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await scanOrderDelivery(order_id, { qr_code: qrCode.trim() });
      setSuccess(true);
      setMessage({ type: "success", text: "Livraison confirmée ! Mission accomplie." });
      // Nettoyer localStorage
      localStorage.removeItem("current_mission");
      localStorage.removeItem("pickup_done");
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Code invalide ou livraison déjà confirmée.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "block w-full rounded-xl border border-gray-200 dark:border-[#1a3a6e] bg-white dark:bg-[#0d1e3a] px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent text-sm transition-all placeholder-gray-400 dark:placeholder-[#4a6a8a]";

  return (
    <div className="max-w-lg mx-auto pb-20">
      {/* En-tête */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-green-50 dark:hover:bg-[#1a3a6e] text-slate-500 dark:text-[#7a9bbf] transition-colors"
        >
          <span className="material-icons">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Scanner le QR — Patient
          </h1>
          <p className="text-gray-500 dark:text-[#7a9bbf] text-sm mt-0.5">
            Confirmez la livraison chez le patient
          </p>
        </div>
      </div>

      {/* Écran succès */}
      {success ? (
        <div className="flex flex-col items-center text-center gap-6 py-8">
          <div className="w-24 h-24 rounded-full bg-[#2E8B57]/10 flex items-center justify-center">
            <span className="material-icons text-[#2E8B57] text-5xl">check_circle</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Livraison complète !</h2>
            <p className="text-gray-500 dark:text-[#7a9bbf] mt-2">
              Commande #{order_id?.substring(0, 8)} livrée avec succès au patient.
            </p>
          </div>
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => router.push("/missions")}
              className="w-full py-3 rounded-2xl bg-[#2E8B57] text-white font-bold hover:bg-[#20603D] transition-colors"
            >
              Retour aux missions
            </button>
            <button
              onClick={() => router.push("/history")}
              className="w-full py-3 rounded-2xl border border-gray-200 dark:border-[#1a3a6e] text-gray-600 dark:text-[#7a9bbf] font-semibold text-sm hover:bg-gray-50 dark:hover:bg-[#0d2040] transition-colors"
            >
              Voir l&apos;historique
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Icône */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-32 h-32 rounded-2xl bg-blue-50 dark:bg-[#1a3a6e]/40 flex items-center justify-center border-2 border-dashed border-blue-300 dark:border-[#1a3a6e]">
              <span className="material-icons text-blue-500 dark:text-blue-400 text-6xl">local_shipping</span>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <p className="text-sm text-slate-500 dark:text-[#7a9bbf] mt-4 text-center max-w-xs">
              Demandez au patient de présenter son QR code de commande, puis saisissez ou scannez le code.
            </p>
            {order_id && (
              <p className="text-xs text-slate-400 mt-2">
                Commande : #{order_id.substring(0, 12)}
              </p>
            )}
          </div>

          {/* Message retour */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-[#2E8B57]/10 border-green-200 dark:border-[#2E8B57]/30 text-green-700 dark:text-green-400"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
              }`}
            >
              <span className="material-icons">
                {message.type === "success" ? "check_circle" : "error"}
              </span>
              <p className="text-sm font-semibold">{message.text}</p>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white dark:bg-[#0d2040] rounded-2xl p-6 shadow-sm border border-green-100 dark:border-[#1a3a6e]">
              <label className="block text-sm font-bold text-gray-700 dark:text-[#7a9bbf] mb-3">
                Code QR du Patient
              </label>
              <input
                type="text"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Ex: ORD-XYZ789..."
                className={inputClass}
                autoFocus
              />
              <p className="text-xs text-slate-400 dark:text-[#4a6a8a] mt-2">
                Le patient peut afficher ce code depuis son application.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !qrCode.trim()}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Confirmation...</span>
                </>
              ) : (
                <>
                  <span className="material-icons">verified</span>
                  <span>Confirmer la livraison</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => router.push("/missions")}
              className="w-full py-3 rounded-2xl border border-gray-200 dark:border-[#1a3a6e] text-gray-600 dark:text-[#7a9bbf] font-semibold text-sm hover:bg-gray-50 dark:hover:bg-[#0d2040] transition-colors"
            >
              Annuler
            </button>
          </form>
        </>
      )}
    </div>
  );
}
