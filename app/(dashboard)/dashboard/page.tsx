"use client";

/**
 * Page Dashboard — e-Dr TIM Delivery System
 * Mode clair : vert pâle + blanc + accents verts
 * Mode sombre : bleu nuit + accents verts
 */

import { useEffect, useState } from "react";
import { getUserInfo, UserInfo } from "@/lib/auth";

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const info = getUserInfo();
    if (info) setUser(info);
  }, []);

  const isOnboardingComplete = user?.onboardingStatus === "COMPLETED";

  const cardBase =
    "rounded-2xl border border-green-100 dark:border-[#1a3a6e] bg-white dark:bg-[#0d2040] shadow-sm";

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ---- Status Hero ---- */}
      <div className="w-full">
        <div
          className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-2xl border p-6 relative overflow-hidden ${isOnboardingComplete
              ? "border-green-200 dark:border-[#2E8B57]/30 bg-green-50 dark:bg-[#2E8B57]/10"
              : "border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20"
            }`}
        >
          <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none ${isOnboardingComplete ? "bg-[#2E8B57]/20" : "bg-amber-400/10"
            }`} />

          <div className="flex flex-col gap-2 z-10">
            <div className={`flex items-center gap-2 mb-1 ${isOnboardingComplete ? "text-[#2E8B57]" : "text-amber-500"
              }`}>
              <span className="material-symbols-outlined">
                {isOnboardingComplete ? "verified" : "pending"}
              </span>
              <span className="text-xs font-black uppercase tracking-wider">Statut du compte</span>
            </div>
            <h2 className="text-gray-900 dark:text-white text-2xl font-bold leading-tight">
              {isOnboardingComplete ? "Compte Activé ✓" : "Vérification en cours…"}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm max-w-2xl">
              {isOnboardingComplete
                ? "Votre compte est validé ! Vous pouvez maintenant accepter des missions et commencer à livrer."
                : "Vos documents sont en cours de révision. Ce processus prend généralement 24-48 heures."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 z-10 w-full md:w-auto">
            <button className="flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-[#0d2040] border border-gray-200 dark:border-[#1a3a6e] px-4 py-2.5 text-gray-700 dark:text-[#7a9bbf] hover:border-[#2E8B57] hover:text-[#2E8B57] transition font-semibold text-sm">
              <span>Voir la FAQ</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            {!isOnboardingComplete && (
              <button className="flex items-center justify-center gap-2 rounded-xl bg-[#2E8B57] text-white px-4 py-2.5 hover:bg-[#20603D] transition shadow-lg shadow-[#2E8B57]/25 font-semibold text-sm">
                <span>Actualiser</span>
                <span className="material-symbols-outlined text-[18px]">refresh</span>
              </button>
            )}
            {isOnboardingComplete && (
              <a href="/geolocation" className="flex items-center justify-center gap-2 rounded-xl bg-[#2E8B57] text-white px-4 py-2.5 hover:bg-[#20603D] transition shadow-lg shadow-[#2E8B57]/25 font-semibold text-sm">
                <span>Commencer</span>
                <span className="material-symbols-outlined text-[18px]">directions_bike</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ---- Two Column Layout ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left Column: Timeline (2 colonnes) */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* Parcours */}
          <div className={cardBase + " p-6"}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Parcours d&apos;inscription</h3>
              <span className="px-3 py-1 rounded-full bg-gray-100 dark:bg-[#112b52] text-gray-500 dark:text-[#7a9bbf] text-xs font-bold">
                Étape {isOnboardingComplete ? "4" : "3"} sur 4
              </span>
            </div>

            <div className="grid grid-cols-[40px_1fr] gap-x-4">
              {/* Étape 1 */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <span className="material-symbols-outlined text-[#2E8B57] text-[24px]">check_circle</span>
                <div className="w-[2px] bg-[#2E8B57] h-full min-h-[40px]" />
              </div>
              <div className="flex flex-col pb-8">
                <p className="font-semibold text-gray-900 dark:text-white">Inscription</p>
                <p className="text-gray-400 dark:text-[#4a6a8a] text-sm">Compte créé avec succès</p>
              </div>

              {/* Étape 2 */}
              <div className="flex flex-col items-center gap-1">
                <span className="material-symbols-outlined text-[#2E8B57] text-[24px]">check_circle</span>
                <div className="w-[2px] bg-[#2E8B57] h-full min-h-[40px]" />
              </div>
              <div className="flex flex-col pb-8">
                <p className="font-semibold text-gray-900 dark:text-white">Détails du profil</p>
                <p className="text-gray-400 dark:text-[#4a6a8a] text-sm">Informations personnelles soumises</p>
              </div>

              {/* Étape 3 */}
              <div className="flex flex-col items-center gap-1">
                {isOnboardingComplete ? (
                  <>
                    <span className="material-symbols-outlined text-[#2E8B57] text-[24px]">check_circle</span>
                    <div className="w-[2px] bg-[#2E8B57] h-full min-h-[40px]" />
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-amber-500 animate-pulse text-[24px]">schedule</span>
                    <div className="w-[2px] bg-gray-200 dark:bg-[#1a3a6e] h-full min-h-[40px]" />
                  </>
                )}
              </div>
              <div className="flex flex-col pb-8">
                <p className="font-semibold text-gray-900 dark:text-white">Vérification des documents</p>
                <p className={`text-sm font-medium ${isOnboardingComplete ? "text-gray-400 dark:text-[#4a6a8a]" : "text-amber-500"}`}>
                  {isOnboardingComplete ? "Documents vérifiés et approuvés" : "En cours — Fin estimée : 24h"}
                </p>
                {!isOnboardingComplete && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-[#071324] rounded-xl border border-gray-100 dark:border-[#1a3a6e] text-xs text-gray-500 dark:text-[#4a6a8a] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-[#2E8B57]">check</span>
                      <span>Permis de conduire</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-amber-500">hourglass_top</span>
                      <span>Assurance (En cours)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Étape 4 */}
              <div className="flex flex-col items-center gap-1">
                <span className={`material-symbols-outlined text-[24px] ${isOnboardingComplete ? "text-[#2E8B57]" : "text-gray-300 dark:text-[#1a3a6e]"
                  }`}>
                  {isOnboardingComplete ? "check_circle" : "lock"}
                </span>
              </div>
              <div className="flex flex-col">
                <p className={`font-semibold ${isOnboardingComplete ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-[#4a6a8a]"}`}>
                  Activation du compte
                </p>
                <p className="text-gray-400 dark:text-[#4a6a8a] text-sm">
                  {isOnboardingComplete ? "Compte prêt pour les livraisons" : "En attente de vérification"}
                </p>
              </div>
            </div>
          </div>

          {/* Bannière info */}
          <div className="rounded-2xl bg-blue-50 dark:bg-[#0d1e3a] border border-blue-100 dark:border-[#1a3a6e] p-5 flex gap-4 items-start">
            <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 mt-1">verified_user</span>
            <div>
              <h4 className="text-blue-700 dark:text-blue-200 font-bold text-sm">Sécurité et Conformité</h4>
              <p className="text-gray-500 dark:text-[#7a9bbf] text-sm mt-1">
                Assurez-vous de consulter les directives de sécurité relatives au transport médical.
                La conformité est obligatoire pour tous les coursiers actifs.
              </p>
              <a className="text-blue-500 text-sm font-bold mt-2 inline-flex items-center gap-1 hover:underline" href="#">
                Voir la formation <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Complétion profil */}
          <div className={cardBase + " p-6"}>
            <div className="flex justify-between items-end mb-3">
              <p className="font-bold text-gray-900 dark:text-white">Complétion du profil</p>
              <p className="text-[#2E8B57] font-black text-lg">{isOnboardingComplete ? "100%" : "75%"}</p>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-[#112b52] mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#2E8B57] transition-all duration-1000 ease-out shadow-sm shadow-[#2E8B57]/30"
                style={{ width: isOnboardingComplete ? "100%" : "75%" }}
              />
            </div>
            <p className="text-gray-400 dark:text-[#4a6a8a] text-sm mb-5">
              {isOnboardingComplete
                ? "Votre profil est complet. Bonne route !"
                : "Terminez la formation pour activer votre compte plus rapidement."}
            </p>
            <a
              href="/profile"
              className="block text-center w-full py-2.5 rounded-xl border border-gray-200 dark:border-[#1a3a6e] text-gray-700 dark:text-[#7a9bbf] font-semibold text-sm hover:border-[#2E8B57] hover:text-[#2E8B57] transition-all"
            >
              Modifier le profil
            </a>
          </div>

          {/* Stats */}
          <div className={cardBase + " p-6 relative overflow-hidden"}>
            {!isOnboardingComplete && (
              <div className="absolute inset-0 bg-white/80 dark:bg-[#0d2040]/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-4 rounded-2xl">
                <span className="material-symbols-outlined text-gray-300 dark:text-[#1a3a6e] text-4xl mb-2">lock</span>
                <p className="text-gray-700 dark:text-white font-bold text-sm">Stats Verrouillées</p>
                <p className="text-gray-400 dark:text-[#4a6a8a] text-xs mt-1">Disponible après activation</p>
              </div>
            )}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Revenus</h3>
              <span className="material-symbols-outlined text-[#2E8B57]">trending_up</span>
            </div>
            <div className="space-y-4">
              {[
                { label: "Aujourd'hui", value: "0 FCFA" },
                { label: "Cette semaine", value: "0 FCFA" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-400 dark:text-[#4a6a8a] text-sm">{label}</span>
                  <span className="font-bold text-gray-900 dark:text-white">{value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 dark:border-[#1a3a6e]">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 dark:text-[#4a6a8a] text-sm">Total Missions</span>
                  <span className="font-bold text-gray-900 dark:text-white">0</span>
                </div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="rounded-2xl bg-gradient-to-br from-[#2E8B57] to-[#1a5e37] p-6 text-white relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <span className="material-symbols-outlined text-white">support_agent</span>
                </div>
                <h3 className="font-bold text-base">Besoin d&apos;aide ?</h3>
              </div>
              <p className="text-white/80 text-sm mb-4">
                Notre équipe support est disponible 24/7 pour vous assister.
              </p>
              <button className="w-full py-2.5 rounded-xl bg-white text-[#2E8B57] font-black text-sm hover:bg-green-50 transition shadow-md">
                Contacter le support
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
