"use client";

import { useState, useEffect } from "react";
import { User, Bike, Shield, BellRing, BellOff, CheckCircle, AlertCircle, Pencil } from "lucide-react";
import { getUserInfo, setUserInfo, UserInfo } from "@/lib/auth";
import { setAvailability, updateDelivery, changePassword, updateProfile } from "@/lib/api-client";

export default function SettingsPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");

  const [vehicleType, setVehicleType] = useState("bike");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [vehicleLoading, setVehicleLoading] = useState(false);
  const [vehicleMsg, setVehicleMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const info = getUserInfo();
      if (info) {
        setUser(info);
        setFirstName(info.firstName || "");
        setLastName(info.lastName || "");
        setEmail(info.email || "");
        setTelephone(info.telephone || "");
      }
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
    if (!user) return;
    setLoading(true);
    setMessage(null);
    try {
      const deliveryId = localStorage.getItem("delivery_account") || String(user.id);
      await updateProfile(deliveryId, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        telephone: telephone.trim(),
      });
      const updated: UserInfo = { ...user, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), telephone: telephone.trim() };
      setUser(updated);
      setUserInfo(updated);
      setMessage({ type: "success", text: "Profil mis à jour avec succès !" });
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Erreur lors de la mise à jour du profil." });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setVehicleLoading(true);
    setVehicleMsg(null);
    try {
      const deliveryId = localStorage.getItem("delivery_id") || String(user?.id || "");
      if (!deliveryId) throw new Error("ID livreur introuvable. Reconnectez-vous.");
      await updateDelivery(deliveryId, { vehicle_type: vehicleType, plate_number: vehiclePlate });
      setVehicleMsg({ type: "success", text: "Informations véhicule mises à jour !" });
    } catch (err: unknown) {
      setVehicleMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur lors de la mise à jour." });
    } finally {
      setVehicleLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPwdMsg(null);
    if (newPassword.length < 6) { setPwdMsg({ type: "error", text: "Le nouveau mot de passe doit contenir au moins 6 caractères." }); return; }
    if (newPassword !== confirmPassword) { setPwdMsg({ type: "error", text: "Les mots de passe ne correspondent pas." }); return; }
    if (newPassword === oldPassword) { setPwdMsg({ type: "error", text: "Le nouveau mot de passe doit être différent de l'ancien." }); return; }
    setPwdLoading(true);
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      setPwdMsg({ type: "success", text: "Mot de passe changé avec succès !" });
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: unknown) {
      setPwdMsg({ type: "error", text: err instanceof Error ? err.message : "Erreur lors du changement." });
    } finally {
      setPwdLoading(false);
    }
  }

  const inputClass = "block w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-[#1E293B] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent text-sm transition-all placeholder-[#94A3B8]";
  const labelClass = "block text-sm font-semibold text-[#1E293B] mb-1.5";
  const sectionClass = "bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm";
  const sectionHeaderClass = "p-5 border-b border-[#E2E8F0] flex items-center gap-3";

  function MsgBanner({ msg }: { msg: { type: "success" | "error"; text: string } | null }) {
    if (!msg) return null;
    return (
      <div className={`mx-5 mt-4 p-3 rounded-xl flex items-center gap-2 border text-sm font-semibold ${
        msg.type === "success" ? "bg-[#F0FDF4] border-[#22C55E]/30 text-green-700" : "bg-red-50 border-red-100 text-red-600"
      }`}>
        {msg.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
        {msg.text}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-[#1E293B] tracking-tight">Paramètres</h1>
        <p className="text-[#94A3B8] text-sm">Gérez vos préférences de compte, votre véhicule et votre sécurité.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          message.type === "success" ? "bg-[#F0FDF4] border-[#22C55E]/30 text-green-700" : "bg-red-50 border-red-100 text-red-600"
        }`}>
          {message.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <p className="text-sm font-semibold">{message.text}</p>
        </div>
      )}

      {/* Disponibilité */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${isAvailable ? "bg-[#22C55E]/10 text-[#22C55E]" : "bg-[#F8FAFC] text-[#94A3B8]"}`}>
            {isAvailable ? <BellRing size={24} /> : <BellOff size={24} />}
          </div>
          <div>
            <h3 className="font-bold text-[#1E293B]">Statut de Disponibilité</h3>
            <p className="text-sm text-[#94A3B8]">Activez pour recevoir de nouvelles missions.</p>
          </div>
        </div>
        <button
          onClick={handleToggleAvailability}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#22C55E] focus:ring-offset-2 ${isAvailable ? "bg-[#22C55E]" : "bg-[#E2E8F0]"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${isAvailable ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Profil */}
        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="p-2 bg-[#22C55E]/10 rounded-xl">
              <User size={18} className="text-[#22C55E]" />
            </div>
            <h3 className="font-bold text-[#1E293B]">Profil Livreur</h3>
          </div>
          <form className="p-5 space-y-6" onSubmit={handleUpdateProfile}>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-[#F8FAFC] flex items-center justify-center text-[#94A3B8] overflow-hidden border-2 border-[#E2E8F0]">
                  <User size={32} />
                </div>
                <button type="button" className="absolute -bottom-2 -right-2 bg-[#22C55E] text-white p-1.5 rounded-lg border-2 border-white hover:bg-[#16A34A] transition shadow-sm">
                  <Pencil size={12} />
                </button>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                <div>
                  <label className={labelClass}>Prénom</label>
                  <input className={inputClass} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom" />
                </div>
                <div>
                  <label className={labelClass}>Nom</label>
                  <input className={inputClass} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Votre nom" />
                </div>
                <div>
                  <label className={labelClass}>Numéro de téléphone</label>
                  <input className={inputClass} value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+237 6XX XXX XXX" />
                </div>
                <div>
                  <label className={labelClass}>Adresse Email</label>
                  <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#16A34A] text-white text-sm font-bold transition-all shadow-md shadow-[#22C55E]/20 disabled:opacity-60 active:scale-95">
                {loading ? "Mise à jour..." : "Enregistrer"}
              </button>
            </div>
          </form>
        </section>

        {/* Véhicule */}
        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="p-2 bg-blue-50 rounded-xl">
              <Bike size={18} className="text-blue-500" />
            </div>
            <h3 className="font-bold text-[#1E293B]">Véhicule</h3>
          </div>
          <MsgBanner msg={vehicleMsg} />
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
              <button type="submit" disabled={vehicleLoading}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60 active:scale-95 flex items-center gap-2">
                {vehicleLoading && <div className="w-4 h-4 border-4 border-white/30 border-t-white rounded-full animate-spin" />}
                {vehicleLoading ? "Enregistrement..." : "Enregistrer le véhicule"}
              </button>
            </div>
          </form>
        </section>

        {/* Sécurité */}
        <section className={sectionClass}>
          <div className={sectionHeaderClass}>
            <div className="p-2 bg-red-50 rounded-xl">
              <Shield size={18} className="text-red-500" />
            </div>
            <h3 className="font-bold text-[#1E293B]">Sécurité</h3>
          </div>
          <MsgBanner msg={pwdMsg} />
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
              <a href="/forgot-password" className="text-xs text-[#22C55E] hover:underline font-semibold">
                Mot de passe oublié ?
              </a>
              <button type="submit" disabled={pwdLoading}
                className="px-6 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-all shadow-md disabled:opacity-60 active:scale-95 flex items-center gap-2">
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
