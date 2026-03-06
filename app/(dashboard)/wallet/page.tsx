"use client";

/**
 * Page Portefeuille — e-Dr TIM Delivery System
 * Affiche le solde du livreur et son historique de transactions.
 * Données exclusivement issues du backend.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Wallet, CheckCircle, Lock, History, TrendingUp, TrendingDown,
  ClipboardList, RefreshCw, Loader2,
} from "lucide-react";
import {
  getDeliveryWallet,
  getDeliveryTransactions,
  type DeliveryWallet,
  type DeliveryTransaction,
} from "@/lib/api-client";

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("fr-FR").format(Math.round(amount)) + " FCFA";

const statusLabel: Record<string, string> = {
  COMPLETED: "Complété",
  PENDING:   "En attente",
  FAILED:    "Échoué",
};

const statusColors: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700",
  PENDING:   "bg-orange-100 text-orange-700",
  FAILED:    "bg-red-100 text-red-700",
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<DeliveryWallet | null>(null);
  const [transactions, setTransactions] = useState<DeliveryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [walletData, txData] = await Promise.all([
        getDeliveryWallet(),
        getDeliveryTransactions(),
      ]);
      setWallet(walletData);
      setTransactions(txData);
    } catch {
      // silently fail — état géré par les null checks
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 size={32} className="text-[#22C55E] animate-spin" />
        <p className="text-[#94A3B8] text-sm">Chargement du portefeuille…</p>
      </div>
    );
  }

  const availableBalance = wallet ? wallet.balance - wallet.locked_amount : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Cartes solde ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Solde principal */}
        <div className="md:col-span-2 bg-gradient-to-br from-[#22C55E] to-[#16A34A] p-7 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <span className="text-[11px] font-bold uppercase tracking-widest opacity-80">
                Mon portefeuille
              </span>
              <div className="flex items-center gap-2">
                <Wallet size={22} className="opacity-60" />
                <button
                  onClick={fetchData}
                  className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                  title="Actualiser"
                >
                  <RefreshCw size={13} />
                </button>
              </div>
            </div>

            {wallet ? (
              <p className="text-4xl font-black tracking-tight mb-2">
                {formatPrice(wallet.balance)}
              </p>
            ) : (
              <div className="mb-2">
                <p className="text-2xl font-black opacity-60">Portefeuille indisponible</p>
                <p className="text-[12px] opacity-70 mt-1">
                  Contactez le support si le problème persiste.
                </p>
              </div>
            )}
            <p className="text-[12px] opacity-70">Solde total disponible</p>
          </div>
        </div>

        {/* Détail disponible / bloqué */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col justify-between">
          {wallet ? (
            <>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3.5 bg-green-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-green-600" />
                    <span className="text-[12px] font-bold text-green-700">Disponible</span>
                  </div>
                  <span className="text-[13px] font-black text-green-700">
                    {formatPrice(availableBalance)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-orange-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-orange-600" />
                    <span className="text-[12px] font-bold text-orange-700">En attente</span>
                  </div>
                  <span className="text-[13px] font-black text-orange-700">
                    {formatPrice(wallet.locked_amount)}
                  </span>
                </div>
              </div>
              <p className="text-[10px] text-[#94A3B8] text-center mt-3 italic">
                Paiements reçus à la validation des livraisons.
              </p>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-4">
              <Wallet size={32} className="text-gray-200" />
              <p className="text-[12px] text-[#94A3B8] text-center">
                Aucun portefeuille trouvé
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Historique des transactions ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F1F5F9] flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-[#1E293B] flex items-center gap-2">
            <History size={16} className="text-[#22C55E]" />
            Historique des transactions
          </h3>
          {transactions.length > 0 && (
            <span className="text-[11px] text-[#94A3B8]">
              {transactions.length} transaction{transactions.length > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#F8FAFC] flex items-center justify-center">
              <ClipboardList size={24} className="text-gray-200" />
            </div>
            <p className="text-[14px] font-semibold text-[#94A3B8]">Aucune transaction</p>
            <p className="text-[12px] text-[#94A3B8]">
              Vos paiements de course apparaîtront ici après chaque livraison confirmée.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#F8FAFC]">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="px-5 py-4 flex items-center justify-between hover:bg-[#F8FAFC] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === "CREDIT"
                        ? "bg-green-100 text-green-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {tx.type === "CREDIT"
                      ? <TrendingUp size={18} />
                      : <TrendingDown size={18} />
                    }
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#1E293B]">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-[#94A3B8]">
                        {new Date(tx.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {tx.reference && (
                        <span className="text-[10px] text-[#CBD5E1] font-mono">
                          #{tx.reference.substring(0, 8)}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          statusColors[tx.status] ?? "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {statusLabel[tx.status] ?? tx.status}
                      </span>
                    </div>
                  </div>
                </div>
                <span
                  className={`text-[14px] font-black ${
                    tx.type === "CREDIT" ? "text-green-600" : "text-[#1E293B]"
                  }`}
                >
                  {tx.type === "CREDIT" ? "+" : "−"}
                  {formatPrice(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
