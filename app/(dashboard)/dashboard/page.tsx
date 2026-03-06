"use client";

/**
 * Page Dashboard — e-Dr TIM Delivery System
 */

import { useEffect, useState } from "react";
import { getUserInfo, UserInfo } from "@/lib/auth";
import { CheckCircle, Clock, ArrowRight, RefreshCw, Bike, Check, Timer, Lock, TrendingUp, Headphones, ShieldCheck } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const info = getUserInfo();
    if (info) setUser(info);
  }, []);

  const isOnboardingComplete = user?.onboardingStatus === "COMPLETED";

  const cardBase = "rounded-2xl border border-green-100 bg-white shadow-sm";

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ---- Status Hero ---- */}
      <div className="w-full">
        <div
          className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-6 rounded-2xl border p-6 relative overflow-hidden ${isOnboardingComplete
              ? "border-green-200 bg-green-50"
              : "border-amber-200 bg-amber-50"
            }`}
        >
          <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-2xl pointer-events-none ${isOnboardingComplete ? "bg-[#2E8B57]/20" : "bg-amber-400/10"
            }`} />

          <div className="flex flex-col gap-2 z-10">
            <div className={`flex items-center gap-2 mb-1 ${isOnboardingComplete ? "text-[#2E8B57]" : "text-amber-500"
              }`}>
              {isOnboardingComplete ? <CheckCircle size={20} /> : <Clock size={20} />}
              <span className="text-xs font-black uppercase tracking-wider">Statut du compte</span>
            </div>
            <h2 className="text-gray-900 text-2xl font-bold leading-tight">
              {isOnboardingComplete ? "Compte Activé ✓" : "Vérification en cours…"}
            </h2>
            <p className="text-gray-600 text-sm max-w-2xl">
              {isOnboardingComplete
                ? "Votre compte est validé ! Vous pouvez maintenant accepter des missions et commencer à livrer."
                : "Vos documents sont en cours de révision. Ce processus prend généralement 24-48 heures."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 z-10 w-full md:w-auto">
            <button className="flex items-center justify-center gap-2 rounded-xl bg-white border border-gray-200 px-4 py-2.5 text-gray-700 hover:border-[#2E8B57] hover:text-[#2E8B57] transition font-semibold text-sm">
              <span>Voir la FAQ</span>
              <ArrowRight size={18} />
            </button>
            {!isOnboardingComplete && (
              <button className="flex items-center justify-center gap-2 rounded-xl bg-[#2E8B57] text-white px-4 py-2.5 hover:bg-[#20603D] transition shadow-lg shadow-[#2E8B57]/25 font-semibold text-sm">
                <span>Actualiser</span>
                <RefreshCw size={18} />
              </button>
            )}
            {isOnboardingComplete && (
              <a href="/geolocation" className="flex items-center justify-center gap-2 rounded-xl bg-[#2E8B57] text-white px-4 py-2.5 hover:bg-[#20603D] transition shadow-lg shadow-[#2E8B57]/25 font-semibold text-sm">
                <span>Commencer</span>
                <Bike size={18} />
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
              <h3 className="text-lg font-bold text-gray-900">Parcours d&apos;inscription</h3>
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
                Étape {isOnboardingComplete ? "4" : "3"} sur 4
              </span>
            </div>

            <div className="grid grid-cols-[40px_1fr] gap-x-4">
              {/* Étape 1 */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <CheckCircle size={24} className="text-[#2E8B57]" />
                <div className="w-[2px] bg-[#2E8B57] h-full min-h-[40px]" />
              </div>
              <div className="flex flex-col pb-8">
                <p className="font-semibold text-gray-900">Inscription</p>
                <p className="text-gray-400 text-sm">Compte créé avec succès</p>
              </div>

              {/* Étape 2 */}
              <div className="flex flex-col items-center gap-1">
                <CheckCircle size={24} className="text-[#2E8B57]" />
                <div className="w-[2px] bg-[#2E8B57] h-full min-h-[40px]" />
              </div>
              <div className="flex flex-col pb-8">
                <p className="font-semibold text-gray-900">Détails du profil</p>
                <p className="text-gray-400 text-sm">Informations personnelles soumises</p>
              </div>

              {/* Étape 3 */}
              <div className="flex flex-col items-center gap-1">
                {isOnboardingComplete ? (
                  <>
                    <CheckCircle size={24} className="text-[#2E8B57]" />
                    <div className="w-[2px] bg-[#2E8B57] h-full min-h-[40px]" />
                  </>
                ) : (
                  <>
                    <Clock size={24} className="text-amber-500 animate-pulse" />
                    <div className="w-[2px] bg-gray-200 h-full min-h-[40px]" />
                  </>
                )}
              </div>
              <div className="flex flex-col pb-8">
                <p className="font-semibold text-gray-900">Vérification des documents</p>
                <p className={`text-sm font-medium ${isOnboardingComplete ? "text-gray-400" : "text-amber-500"}`}>
                  {isOnboardingComplete ? "Documents vérifiés et approuvés" : "En cours — Fin estimée : 24h"}
                </p>
                {!isOnboardingComplete && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 space-y-2">
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-[#2E8B57]" />
                      <span>Permis de conduire</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Timer size={16} className="text-amber-500" />
                      <span>Assurance (En cours)</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Étape 4 */}
              <div className="flex flex-col items-center gap-1">
                {isOnboardingComplete ? (
                  <CheckCircle size={24} className="text-[#2E8B57]" />
                ) : (
                  <Lock size={24} className="text-gray-300" />
                )}
              </div>
              <div className="flex flex-col">
                <p className={`font-semibold ${isOnboardingComplete ? "text-gray-900" : "text-gray-400"}`}>
                  Activation du compte
                </p>
                <p className="text-gray-400 text-sm">
                  {isOnboardingComplete ? "Compte prêt pour les livraisons" : "En attente de vérification"}
                </p>
              </div>
            </div>
          </div>

          {/* Bannière info */}
          <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5 flex gap-4 items-start">
            <ShieldCheck size={24} className="text-blue-500 mt-1 shrink-0" />
            <div>
              <h4 className="text-blue-700 font-bold text-sm">Sécurité et Conformité</h4>
              <p className="text-gray-500 text-sm mt-1">
                Assurez-vous de consulter les directives de sécurité relatives au transport médical.
                La conformité est obligatoire pour tous les coursiers actifs.
              </p>
              <a className="text-blue-500 text-sm font-bold mt-2 inline-flex items-center gap-1 hover:underline" href="#">
                Voir la formation <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Complétion profil */}
          <div className={cardBase + " p-6"}>
            <div className="flex justify-between items-end mb-3">
              <p className="font-bold text-gray-900">Complétion du profil</p>
              <p className="text-[#2E8B57] font-black text-lg">{isOnboardingComplete ? "100%" : "75%"}</p>
            </div>
            <div className="h-2.5 w-full rounded-full bg-gray-100 mb-4 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#2E8B57] transition-all duration-1000 ease-out shadow-sm shadow-[#2E8B57]/30"
                style={{ width: isOnboardingComplete ? "100%" : "75%" }}
              />
            </div>
            <p className="text-gray-400 text-sm mb-5">
              {isOnboardingComplete
                ? "Votre profil est complet. Bonne route !"
                : "Terminez la formation pour activer votre compte plus rapidement."}
            </p>
            <a
              href="/profile"
              className="block text-center w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:border-[#2E8B57] hover:text-[#2E8B57] transition-all"
            >
              Modifier le profil
            </a>
          </div>

          {/* Stats */}
          <div className={cardBase + " p-6 relative overflow-hidden"}>
            {!isOnboardingComplete && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-4 rounded-2xl">
                <Lock size={40} className="text-gray-300 mb-2" />
                <p className="text-gray-700 font-bold text-sm">Stats Verrouillées</p>
                <p className="text-gray-400 text-xs mt-1">Disponible après activation</p>
              </div>
            )}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Revenus</h3>
              <TrendingUp size={20} className="text-[#2E8B57]" />
            </div>
            <div className="space-y-4">
              {[
                { label: "Aujourd'hui", value: "0 FCFA" },
                { label: "Cette semaine", value: "0 FCFA" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">{label}</span>
                  <span className="font-bold text-gray-900">{value}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Total Missions</span>
                  <span className="font-bold text-gray-900">0</span>
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
                  <Headphones size={20} className="text-white" />
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
