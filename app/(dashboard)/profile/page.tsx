"use client";

/**
 * Page Profil Livreur — e-Dr TIM Delivery System
 * Mode clair : fond vert pâle + blanc + accents verts
 * Mode sombre : bleu nuit + accents verts
 */

import { useState, useEffect } from "react";
import { getUserInfo, UserInfo } from "@/lib/auth";

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const info = getUserInfo();
    if (info) setUser(info);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setTimeout(() => {
      setLoading(false);
      setMessage({ type: "success", text: "Profil mis à jour avec succès !" });
    }, 1500);
  }

  const inputClass =
    "block w-full rounded-xl border border-gray-200 dark:border-[#1a3a6e] bg-white dark:bg-[#0d1e3a] px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent text-sm transition-all placeholder-gray-400 dark:placeholder-[#4a6a8a]";
  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-[#7a9bbf] mb-1.5";
  const sectionClass =
    "bg-white dark:bg-[#0d2040] border border-green-100 dark:border-[#1a3a6e] rounded-2xl p-6 md:p-8 shadow-sm transition-all hover:shadow-md hover:border-green-200 dark:hover:border-[#2E8B57]/40";

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Mon Profil
        </h1>
        <p className="text-gray-500 dark:text-[#7a9bbf] text-sm">
          Gérez vos informations personnelles et vos documents de vérification.
        </p>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${message.type === "success"
              ? "bg-green-50 dark:bg-[#2E8B57]/10 border-green-200 dark:border-[#2E8B57]/30 text-green-700 dark:text-green-400"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
            }`}
        >
          <span className="material-symbols-outlined">
            {message.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 : Détails personnels */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-[#2E8B57]/10 dark:bg-[#2E8B57]/20 rounded-xl">
              <span className="material-symbols-outlined text-[#2E8B57] text-2xl">person</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Détails Personnels</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass} htmlFor="first_name">Prénom</label>
              <input id="first_name" name="first_name" type="text"
                defaultValue={user?.firstName || ""} placeholder="Votre prénom"
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="last_name">Nom</label>
              <input id="last_name" name="last_name" type="text"
                defaultValue={user?.lastName || ""} placeholder="Votre nom"
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">Email</label>
              <input id="email" name="email" type="email"
                defaultValue={user?.email || ""} placeholder="votre@email.com"
                className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="telephone">Téléphone</label>
              <input id="telephone" name="telephone" type="tel"
                defaultValue={user?.telephone || ""} placeholder="+237 ..."
                className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="address">Adresse de résidence</label>
              <textarea id="address" name="address" rows={2}
                defaultValue={user?.address || ""} placeholder="Votre adresse complète"
                className={inputClass} />
            </div>
          </div>
        </div>

        {/* Section 2 : Identification */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 dark:bg-[#1a3a6e]/40 rounded-xl">
              <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 text-2xl">
                badge
              </span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Identification &amp; Documents
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CNI */}
            <div className="space-y-3">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">
                Pièce d&apos;identité (CNI/Passeport)
              </p>
              <div className="relative group">
                <div className="border-2 border-dashed border-gray-200 dark:border-[#1a3a6e] rounded-2xl p-8 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0d1e3a] group-hover:border-[#2E8B57]/50 transition-all cursor-pointer">
                  <span className="material-symbols-outlined text-gray-300 dark:text-[#4a6a8a] text-4xl mb-3">cloud_upload</span>
                  <p className="text-gray-400 dark:text-[#4a6a8a] text-xs text-center">
                    Glissez-déposez ou cliquez<br />pour télécharger le recto
                  </p>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Photo profil */}
            <div className="space-y-3">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">Photo de Profil</p>
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-[#0d1e3a] border-2 border-gray-200 dark:border-[#1a3a6e] flex items-center justify-center text-gray-300 dark:text-[#4a6a8a] overflow-hidden relative group cursor-pointer hover:border-[#2E8B57] transition-all">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="flex-1">
                  <p className="text-gray-400 dark:text-[#4a6a8a] text-xs leading-relaxed mb-3">
                    Photo claire requise pour votre badge numérique.
                  </p>
                  <button
                    type="button"
                    className="text-[#2E8B57] text-xs font-bold hover:underline flex items-center gap-1"
                  >
                    <span className="material-icons text-sm">photo_camera</span>
                    Changer la photo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 : Garant */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
              <span className="material-symbols-outlined text-amber-500 text-2xl">gavel</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              Informations du Garant
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <label className={labelClass} htmlFor="guarantor_name">Nom du Garant</label>
              <input id="guarantor_name" name="guarantor_name" type="text"
                placeholder="Nom complet" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="guarantor_relation">Relation</label>
              <select id="guarantor_relation" name="guarantor_relation" className={inputClass}>
                <option value="parent">Parent</option>
                <option value="sibling">Frère / Sœur</option>
                <option value="friend">Ami</option>
                <option value="other">Autre</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="guarantor_phone">Téléphone Garant</label>
              <input id="guarantor_phone" name="guarantor_phone" type="tel"
                placeholder="+237 ..." className={inputClass} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button
            type="button"
            className="px-6 py-2.5 rounded-xl text-gray-500 dark:text-[#7a9bbf] font-semibold hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-2.5 rounded-xl bg-[#2E8B57] hover:bg-[#20603D] text-white font-bold shadow-lg shadow-[#2E8B57]/25 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <div className="loader w-4 h-4" />}
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
}
