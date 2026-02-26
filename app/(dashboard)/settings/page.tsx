"use client";

/**
 * Page Paramètres — e-Dr TIM Delivery System
 * Mode clair : fond vert pâle + blanc + accents verts
 * Mode sombre : fond bleu nuit + accents verts
 */

import { useState, useEffect } from "react";
import { getUserInfo, UserInfo } from "@/lib/auth";
import { setAvailability, updateDelivery, changePassword } from "@/lib/api-client";

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Véhicule (Story 3.5)
  const [vehicleType, setVehicleType] = useState("bike");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleMsg, setVehicleMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Mot de passe (Story 3.7)
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const info = getUserInfo();
      if (info) setUser(info);
      setIsAvailable(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleToggleAvailability = async () => {
    const newStatus = !isAvailable;
    setIsAvailable(newStatus);
    try {
      await setAvailability(newStatus);
    } catch (error) {
      console.error("Erreur statut disponibilité:", error);
      setIsAvailable(!newStatus);
    }
  };

  async function handleUpdateProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setMessage({ type: "success", text: "Paramètres mis à jour avec succès !" });
    }, 1000);
  }

  // Story 3.5 — Mise à jour infos véhicule
  async function handleUpdateVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVehicleLoading(true);
    setVehicleMsg(null);
    try {
      const deliveryId = localStorage.getItem("delivery_id") || String(user?.id || "");
      if (!deliveryId) throw new Error("ID livreur introuvable. Reconnectez-vous.");
      await updateDelivery(deliveryId, {
        vehicle_type: vehicleType,
        plate_number: vehiclePlate,
      });
      setVehicleMsg({ type: "success", text: "Informations véhicule mises à jour !" });
    } catch (err: unknown) {
      setVehicleMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur lors de la mise à jour." });
    } finally {
      setVehicleLoading(false);
    }
  }

  // Story 3.7 — Changement de mot de passe
  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword.length < 6) {
      setPwdMsg({ type: "error", text: "Le nouveau mot de passe doit contenir au moins 6 caractères." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg({ type: "error", text: "Les mots de passe ne correspondent pas." });
      return;
    }
    if (newPassword === oldPassword) {
      setPwdMsg({ type: "error", text: "Le nouveau mot de passe doit être différent de l'ancien." });
      return;
    }
    setPwdLoading(true);
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      setPwdMsg({ type: "success", text: "Mot de passe changé avec succès !" });
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwdMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur lors du changement." });
    } finally {
      setPwdLoading(false);
    }
  }

  /* ---- Classes réutilisables ---- */
  const inputClass =
    "block w-full rounded-xl border border-gray-200 dark:border-[#1a3a6e] bg-white dark:bg-[#0d1e3a] px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent text-sm transition-all placeholder-gray-400 dark:placeholder-[#4a6a8a]";
  const labelClass = "block text-sm font-semibold text-gray-700 dark:text-[#7a9bbf] mb-1.5";
  const sectionClass =
    "bg-white dark:bg-[#0d2040] border border-green-100 dark:border-[#1a3a6e] rounded-2xl overflow-hidden shadow-sm";
  const sectionHeaderClass =
    "p-5 border-b border-green-100 dark:border-[#1a3a6e] flex items-center gap-3";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Page header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          Paramètres
        </h1>
        <p className="text-gray-500 dark:text-[#7a9bbf] text-sm">
          Gérez vos préférences de compte, votre véhicule et votre sécurité.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border ${message.type === "success"
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

      {/* Disponibilité */}
      <div className="bg-white dark:bg-[#0d2040] border border-green-100 dark:border-[#1a3a6e] rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${isAvailable
                ? "bg-[#2E8B57]/10 text-[#2E8B57]"
                : "bg-gray-100 dark:bg-[#1a3a6e]/50 text-gray-400 dark:text-[#4a6a8a]"
              }`}
          >
            <span className="material-icons text-2xl">
              {isAvailable ? "notifications_active" : "notifications_off"}
            </span>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Statut de Disponibilité</h3>
            <p className="text-sm text-gray-500 dark:text-[#7a9bbf]">
              Activez pour recevoir de nouvelles missions.
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleAvailability}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#2E8B57] focus:ring-offset-2 ${isAvailable ? "bg-[#2E8B57]" : "bg-gray-200 dark:bg-[#1a3a6e]"
            }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${isAvailable ? "translate-x-6" : "translate-x-1"
              }`}
          />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profil */}
        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="p-2 bg-[#2E8B57]/10 rounded-xl">
              <span className="material-icons text-[#2E8B57]">account_circle</span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Profil Livreur</h3>
          </div>
          <form className="p-5 space-y-6" onSubmit={handleUpdateProfile}>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-[#0d1e3a] flex items-center justify-center text-gray-400 dark:text-[#4a6a8a] overflow-hidden border-2 border-green-100 dark:border-[#1a3a6e]">
                  <span className="material-icons text-3xl">person</span>
                </div>
                <button
                  type="button"
                  className="absolute -bottom-2 -right-2 bg-[#2E8B57] text-white p-1.5 rounded-lg border-2 border-white dark:border-[#0d2040] hover:bg-[#20603D] transition shadow-sm"
                >
                  <span className="material-icons text-[14px]">edit</span>
                </button>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div>
                  <label className={labelClass}>Nom complet</label>
                  <input
                    className={inputClass}
                    defaultValue={`${user?.firstName || ""} ${user?.lastName || ""}`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Numéro de téléphone</label>
                  <input className={inputClass} defaultValue={user?.telephone || ""} />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Adresse Email</label>
                  <input className={inputClass} type="email" defaultValue={user?.email || ""} />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#2E8B57] hover:bg-[#20603D] text-white text-sm font-bold transition-all shadow-md shadow-[#2E8B57]/20 disabled:opacity-60 active:scale-95"
              >
                {loading ? "Mise à jour..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </section>

        {/* Véhicule (Story 3.5) */}
        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="p-2 bg-blue-50 dark:bg-[#1a3a6e]/40 rounded-xl">
              <span className="material-icons text-blue-500 dark:text-blue-400">directions_bike</span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Véhicule</h3>
          </div>
          {vehicleMsg && (
            <div className={`mx-5 mt-4 p-3 rounded-xl flex items-center gap-2 border text-sm font-semibold ${
              vehicleMsg.type === "success"
                ? "bg-green-50 dark:bg-[#2E8B57]/10 border-green-200 dark:border-[#2E8B57]/30 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
            }`}>
              <span className="material-icons text-sm">{vehicleMsg.type === "success" ? "check_circle" : "error"}</span>
              {vehicleMsg.text}
            </div>
          )}
          <form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleUpdateVehicle}>
            <div>
              <label className={labelClass}>Type de véhicule</label>
              <select className={inputClass} value={vehicleType} onChange={(e) => setVehicleType(e.target.value)}>
                <option value="bike">Moto / Scooter</option>
                <option value="car">Voiture</option>
                <option value="bicycle">Vélo</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Numéro d&apos;immatriculation</label>
              <input className={inputClass} placeholder="Ex: LT 123 AB" value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex justify-end pt-1">
              <button
                type="submit"
                disabled={vehicleLoading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60 active:scale-95 flex items-center gap-2"
              >
                {vehicleLoading && <div className="w-4 h-4 border-4 border-white/30 border-t-white rounded-full animate-spin" />}
                {vehicleLoading ? "Enregistrement..." : "Enregistrer le véhicule"}
              </button>
            </div>
          </form>
        </section>

        {/* Sécurité (Story 3.7) */}
        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-xl">
              <span className="material-icons text-red-500">shield</span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white">Sécurité</h3>
          </div>
          {pwdMsg && (
            <div className={`mx-5 mt-4 p-3 rounded-xl flex items-center gap-2 border text-sm font-semibold ${
              pwdMsg.type === "success"
                ? "bg-green-50 dark:bg-[#2E8B57]/10 border-green-200 dark:border-[#2E8B57]/30 text-green-700 dark:text-green-400"
                : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400"
            }`}>
              <span className="material-icons text-sm">{pwdMsg.type === "success" ? "check_circle" : "error"}</span>
              {pwdMsg.text}
            </div>
          )}
          <form className="p-5 space-y-4" onSubmit={handleChangePassword}>
            <div>
              <label className={labelClass}>Mot de passe actuel</label>
              <input className={inputClass} type="password" placeholder="••••••••" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Nouveau mot de passe</label>
                <input className={inputClass} type="password" placeholder="Min. 6 caractères" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Confirmer le mot de passe</label>
                <input className={inputClass} type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
              <a href="/forgot-password" className="text-xs text-[#2E8B57] hover:underline font-semibold">
                Mot de passe oublié ?
              </a>
              <button
                type="submit"
                disabled={pwdLoading}
                className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60 active:scale-95 flex items-center gap-2"
              >
                {pwdLoading && <div className="w-4 h-4 border-4 border-white/30 border-t-white rounded-full animate-spin" />}
                {pwdLoading ? "Modification..." : "Changer le mot de passe"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
