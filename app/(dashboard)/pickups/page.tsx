"use client";

/**
 * Page Liste des Officines pour Pickup — Story 3.4
 * GET /api/v1/pickup-qr-code/
 * Affiche les officines où le livreur a des collectes à faire.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getPickupOfficines, type PickupOfficine } from "@/lib/api-client";

export default function PickupsPage() {
  const router = useRouter();
  const [officines, setOfficines] = useState<PickupOfficine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPickupOfficines();
        setOfficines(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Erreur lors du chargement.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto pb-20">
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
            Collectes en attente
          </h1>
          <p className="text-gray-500 dark:text-[#7a9bbf] text-sm mt-0.5">
            Officines où vous devez récupérer des commandes
          </p>
        </div>
      </div>

      {/* Chargement */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-[#2E8B57] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Chargement des officines...</p>
        </div>
      )}

      {/* Erreur */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 flex items-center gap-3">
          <span className="material-icons">error</span>
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Liste vide */}
      {!loading && !error && officines.length === 0 && (
        <div className="flex flex-col items-center text-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <span className="material-icons text-slate-400 text-3xl">store_mall_directory</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Aucune collecte en attente</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Toutes vos collectes sont à jour.
            </p>
          </div>
        </div>
      )}

      {/* Liste des officines */}
      {!loading && !error && officines.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-[#7a9bbf] font-medium">
            {officines.length} officine{officines.length > 1 ? "s" : ""} en attente
          </p>
          {officines.map((officine, idx) => (
            <div
              key={officine.id || idx}
              className="bg-white dark:bg-[#0d2040] rounded-2xl p-5 shadow-sm border border-green-100 dark:border-[#1a3a6e] hover:border-[#2E8B57]/40 dark:hover:border-[#2E8B57]/40 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="p-3 bg-[#2E8B57]/10 dark:bg-[#2E8B57]/20 rounded-xl shrink-0">
                    <span className="material-icons text-[#2E8B57] text-2xl">local_pharmacy</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white truncate">
                      {officine.name || `Officine #${(officine.id || "").substring(0, 8)}`}
                    </h3>
                    {officine.address && (
                      <p className="text-sm text-slate-500 dark:text-[#7a9bbf] flex items-center gap-1 mt-1">
                        <span className="material-icons text-xs">place</span>
                        <span className="truncate">{officine.address}</span>
                      </p>
                    )}
                    {officine.orders_count !== undefined && (
                      <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-xs font-bold">
                        <span className="material-icons text-xs">inventory_2</span>
                        {officine.orders_count} commande{(officine.orders_count || 0) > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href="/pickup-scan"
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2E8B57] text-white text-xs font-bold hover:bg-[#20603D] transition-colors shadow-sm shadow-[#2E8B57]/20"
                >
                  <span className="material-icons text-sm">qr_code_scanner</span>
                  Scanner
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
