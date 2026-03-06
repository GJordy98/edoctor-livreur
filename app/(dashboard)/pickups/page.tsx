"use client";

/**
 * Page Liste des Officines pour Pickup — Story 3.4
 * GET /api/v1/pickup-qr-code/get_all_qr_code_order/?mission=<id>
 * Affiche les pharmacies où le livreur doit récupérer les commandes,
 * avec le code-barres de pickup pour chaque pharmacie.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Barcode from "react-barcode";
import {
  getPickupOfficinesForMission,
  getPickupOfficines,
  type PickupOfficine,
} from "@/lib/api-client";
import {
  ArrowLeft, AlertCircle, Store, MapPin, Phone,
  ScanLine, ArrowRight, Navigation, Eye, EyeOff,
} from "lucide-react";

export default function PickupsPage() {
  const router = useRouter();
  const [officines, setOfficines] = useState<PickupOfficine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Visibilité du code en clair par index d'officine
  const [showCode, setShowCode] = useState<Record<number, boolean>>({});

  function toggleCode(idx: number) {
    setShowCode((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        let missionId = "";
        const missionRaw = localStorage.getItem("current_mission");
        if (missionRaw) {
          try {
            const m = JSON.parse(missionRaw) as Record<string, unknown>;
            missionId = String(m.id || "");
          } catch { /* ignore */ }
        }

        const data = missionId
          ? await getPickupOfficinesForMission(missionId)
          : await getPickupOfficines();
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
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl hover:bg-[#F0FDF4] text-[#64748B] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-[#1E293B] tracking-tight">
            Collectes en attente
          </h1>
          <p className="text-[#94A3B8] text-sm mt-0.5">
            Pharmacies où vous devez récupérer des commandes
          </p>
        </div>
      </div>

      {/* Raccourci vers la page mission active */}
      <a
        href="/mission-active"
        className="flex items-center justify-between p-4 mb-5 rounded-2xl bg-[#22C55E] text-white shadow-lg shadow-[#22C55E]/20 hover:bg-[#16A34A] transition-colors"
      >
        <div>
          <p className="font-bold text-sm">Voir le flux complet de la mission</p>
          <p className="text-xs text-white/80 mt-0.5">Code ramassage + carte + toutes les officines</p>
        </div>
        <ArrowRight size={20} className="shrink-0" />
      </a>

      {/* Chargement */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 border-4 border-[#E2E8F0] border-t-[#22C55E] rounded-full animate-spin" />
          <p className="text-sm text-[#94A3B8]">Chargement des pharmacies...</p>
        </div>
      )}

      {/* Erreur */}
      {error && !loading && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center gap-3">
          <AlertCircle size={20} className="shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* Liste vide */}
      {!loading && !error && officines.length === 0 && (
        <div className="flex flex-col items-center text-center py-16 gap-4">
          <div className="w-16 h-16 rounded-full bg-[#F8FAFC] flex items-center justify-center">
            <Store size={28} className="text-[#94A3B8]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#1E293B]">Aucune collecte en attente</h3>
            <p className="text-[#94A3B8] text-sm mt-1">Toutes vos collectes sont à jour.</p>
          </div>
        </div>
      )}

      {/* Liste des pharmacies */}
      {!loading && !error && officines.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-[#94A3B8] font-medium">
            {officines.length} pharmacie{officines.length > 1 ? "s" : ""} en attente
          </p>

          {officines.map((officine, idx) => {
            const qrCode = officine.qr_code as string | undefined;
            const isQrImage = qrCode?.startsWith("http") || qrCode?.startsWith("data:image");

            return (
              <div
                key={officine.id || idx}
                className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] overflow-hidden"
              >
                {/* Header pharmacie */}
                <div className="flex items-start gap-4 p-5">
                  {/* Numéro */}
                  <div className="w-11 h-11 rounded-xl bg-[#22C55E] flex items-center justify-center text-white font-black text-lg shrink-0 shadow-md shadow-[#22C55E]/30">
                    {idx + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#1E293B] text-base leading-tight">
                      {officine.name || `Pharmacie #${(officine.id || "").substring(0, 8)}`}
                    </h3>

                    {officine.address && (
                      <p className="text-sm text-[#64748B] flex items-center gap-1.5 mt-1.5">
                        <MapPin size={13} className="shrink-0 text-[#94A3B8]" />
                        <span className="truncate">{officine.address}</span>
                      </p>
                    )}

                    {officine.telephone && (
                      <a
                        href={`tel:${officine.telephone}`}
                        className="text-sm text-[#22C55E] flex items-center gap-1.5 mt-1 hover:underline"
                      >
                        <Phone size={13} className="shrink-0" />
                        {officine.telephone}
                      </a>
                    )}
                  </div>

                  {/* Bouton Maps si GPS dispo */}
                  {officine.latitude && officine.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${officine.latitude},${officine.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 flex flex-col items-center gap-1 p-2 rounded-xl bg-[#F0FDF4] text-[#22C55E] hover:bg-[#DCFCE7] transition-colors"
                      title="Naviguer vers cette pharmacie"
                    >
                      <Navigation size={16} />
                      <span className="text-[10px] font-bold">Maps</span>
                    </a>
                  )}
                </div>

                {/* Code de ramassage — barcode ou image QR */}
                {qrCode && (
                  <div className="border-t border-[#F1F5F9] mx-5 pt-4 pb-5">
                    <p className="text-[11px] text-[#94A3B8] uppercase font-bold tracking-wider mb-3 flex items-center gap-1.5">
                      <ScanLine size={12} />
                      Code de ramassage — à montrer à la pharmacie
                    </p>

                    <div className="bg-[#F8FAFC] rounded-xl p-4 flex flex-col items-center gap-3">
                      {isQrImage ? (
                        // URL d'image → affichage direct
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={qrCode}
                          alt={`Code pharmacie ${idx + 1}`}
                          className="max-h-36 rounded-lg"
                        />
                      ) : (
                        // Code numérique → code-barres scannable
                        <div className="flex flex-col items-center w-full gap-1">
                          <div className="bg-white rounded-lg p-2 shadow-sm border border-[#E2E8F0] w-full flex justify-center overflow-hidden">
                            <Barcode
                              value={qrCode}
                              format="CODE128"
                              width={2}
                              height={80}
                              displayValue={false}
                              margin={6}
                              background="#ffffff"
                              lineColor="#1E293B"
                            />
                          </div>

                          {/* Bouton œil */}
                          <button
                            type="button"
                            onClick={() => toggleCode(idx)}
                            className="flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg text-[#64748B] hover:text-[#1E293B] hover:bg-[#E2E8F0] transition-colors text-xs font-semibold"
                            title={showCode[idx] ? "Masquer le code" : "Afficher le code"}
                          >
                            {showCode[idx]
                              ? <><EyeOff size={14} /><span>Masquer le code</span></>
                              : <><Eye size={14} /><span>Voir le code</span></>}
                          </button>

                          {/* Code en clair (conditionnel) */}
                          {showCode[idx] && (
                            <p className="font-mono text-2xl font-black text-[#1E293B] tracking-[0.3em] mt-1 select-all">
                              {qrCode}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Action scanner */}
                <div className="px-5 pb-5">
                  <a
                    href="/pickup-scan"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#22C55E] text-white text-sm font-bold hover:bg-[#16A34A] transition-colors shadow-sm shadow-[#22C55E]/20"
                  >
                    <ScanLine size={16} />
                    Scanner le QR code de la pharmacie
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
