"use client";

import { useState, useEffect } from "react";
import { User, CreditCard, Scale, Upload, Camera, CheckCircle, AlertCircle, Loader2, Pencil } from "lucide-react";
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
    "block w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-[#1E293B] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent text-sm transition-all placeholder-[#94A3B8]";
  const labelClass = "block text-sm font-semibold text-[#1E293B] mb-1.5";
  const sectionClass = "bg-white border border-[#E2E8F0] rounded-2xl p-6 md:p-8 shadow-sm";

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="flex flex-col gap-1 mb-8">
        <h1 className="text-3xl font-black text-[#1E293B] tracking-tight">Mon Profil</h1>
        <p className="text-[#94A3B8] text-sm">
          Gérez vos informations personnelles et vos documents de vérification.
        </p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
          message.type === "success"
            ? "bg-[#F0FDF4] border-[#22C55E]/30 text-green-700"
            : "bg-red-50 border-red-100 text-red-600"
        }`}>
          {message.type === "success"
            ? <CheckCircle size={16} />
            : <AlertCircle size={16} />
          }
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1 : Détails personnels */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-[#22C55E]/10 rounded-xl">
              <User size={22} className="text-[#22C55E]" />
            </div>
            <h2 className="text-lg font-bold text-[#1E293B]">Détails Personnels</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass} htmlFor="first_name">Prénom</label>
              <input id="first_name" name="first_name" type="text" defaultValue={user?.firstName || ""} placeholder="Votre prénom" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="last_name">Nom</label>
              <input id="last_name" name="last_name" type="text" defaultValue={user?.lastName || ""} placeholder="Votre nom" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">Email</label>
              <input id="email" name="email" type="email" defaultValue={user?.email || ""} placeholder="votre@email.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="telephone">Téléphone</label>
              <input id="telephone" name="telephone" type="tel" defaultValue={user?.telephone || ""} placeholder="+237 ..." className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass} htmlFor="address">Adresse de résidence</label>
              <textarea id="address" name="address" rows={2} defaultValue={user?.address || ""} placeholder="Votre adresse complète" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Section 2 : Identification */}
        <div className={sectionClass}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <CreditCard size={22} className="text-blue-500" />
            </div>
            <h2 className="text-lg font-bold text-[#1E293B]">Identification &amp; Documents</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* CNI */}
            <div className="space-y-3">
              <p className="font-semibold text-[#1E293B] text-sm">Pièce d&apos;identité (CNI/Passeport)</p>
              <div className="relative group">
                <div className="border-2 border-dashed border-[#E2E8F0] rounded-2xl p-8 flex flex-col items-center justify-center bg-[#F8FAFC] group-hover:border-[#22C55E]/50 transition-all cursor-pointer">
                  <Upload size={36} className="text-[#94A3B8] mb-3" />
                  <p className="text-[#94A3B8] text-xs text-center">
                    Glissez-déposez ou cliquez<br />pour télécharger le recto
                  </p>
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Photo profil */}
            <div className="space-y-3">
              <p className="font-semibold text-[#1E293B] text-sm">Photo de Profil</p>
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-[#F8FAFC] border-2 border-[#E2E8F0] flex items-center justify-center text-[#94A3B8] overflow-hidden relative group cursor-pointer hover:border-[#22C55E] transition-all">
                  {user?.profileImage ? (
                    <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera size={36} />
                  )}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                <div className="flex-1">
                  <p className="text-[#94A3B8] text-xs leading-relaxed mb-3">
                    Photo claire requise pour votre badge numérique.
                  </p>
                  <button type="button" className="text-[#22C55E] text-xs font-bold hover:underline flex items-center gap-1">
                    <Camera size={14} />
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
            <div className="p-2.5 bg-amber-50 rounded-xl">
              <Scale size={22} className="text-amber-500" />
            </div>
            <h2 className="text-lg font-bold text-[#1E293B]">Informations du Garant</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <label className={labelClass} htmlFor="guarantor_name">Nom du Garant</label>
              <input id="guarantor_name" name="guarantor_name" type="text" placeholder="Nom complet" className={inputClass} />
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
              <input id="guarantor_phone" name="guarantor_phone" type="tel" placeholder="+237 ..." className={inputClass} />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 pt-2">
          <button type="button" className="px-6 py-2.5 rounded-xl text-[#94A3B8] font-semibold hover:text-[#1E293B] transition-colors">
            Annuler
          </button>
          <button type="submit" disabled={loading}
            className="px-8 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white font-bold shadow-lg shadow-[#22C55E]/25 transition-all active:scale-95 disabled:opacity-70 flex items-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </form>
    </div>
  );
}
