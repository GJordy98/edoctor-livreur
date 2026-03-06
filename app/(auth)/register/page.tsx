"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Clock, Banknote, HeartPulse, Mail,
  FolderOpen, Lock, Eye, EyeOff, Info, AlertCircle, Loader2,
} from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import { registerDriver } from "@/lib/api-client";
import { formatPhoneNumber, setPhone } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    const password = data.get("password") as string;
    const confirmPassword = data.get("confirm_password") as string;

    if (password !== confirmPassword) {
      setPasswordError("Les mots de passe ne correspondent pas. Veuillez réessayer.");
      (document.getElementById("password") as HTMLInputElement)?.focus();
      return;
    }
    if (password.length < 8) {
      setPasswordError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setPasswordError(null);

    const rawPhone = data.get("telephone") as string;
    data.set("telephone", formatPhoneNumber(rawPhone));
    data.delete("confirm_password");
    data.delete("terms");

    setLoading(true);
    setError(null);

    try {
      const result = await registerDriver(data);
      const phone = data.get("telephone") as string;
      setPhone(phone);
      if (result?.user_id || result?.id) {
        localStorage.setItem("delivery_user_id", String(result.user_id || result.id));
      }
      localStorage.removeItem("otp_expiry_timestamp");
      router.push("/verify-otp");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue lors de l'inscription.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "block w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-[#1E293B] focus:ring-2 focus:ring-[#22C55E] focus:border-transparent text-sm transition-all placeholder-[#94A3B8]";

  const features = [
    {
      Icon: Clock,
      colorClass: "bg-blue-100 text-blue-600",
      title: "Horaires Flexibles",
      desc: "Choisissez quand vous voulez travailler. Soyez votre propre patron.",
    },
    {
      Icon: Banknote,
      colorClass: "bg-green-100 text-green-600",
      title: "Revenus Attractifs",
      desc: "Recevez vos paiements chaque semaine avec des bonus de performance.",
    },
    {
      Icon: HeartPulse,
      colorClass: "bg-purple-100 text-purple-600",
      title: "Impact Social",
      desc: "Aidez les patients à recevoir leurs traitements rapidement et en toute sécurité.",
    },
  ];

  return (
    <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

      {/* ---- Colonne Gauche : Présentation ---- */}
      <div className="hidden lg:block lg:col-span-5 space-y-8 sticky top-24 pr-4">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#1E293B] leading-tight mb-4">
            Rejoignez l&apos;équipe <br />
            <span className="text-[#22C55E]">e-Dr Tim Delivery</span>
          </h1>
          <p className="text-lg text-[#64748B]">
            Livrez des médicaments essentiels et faites la différence. Gérez votre emploi du temps
            et gagnez des revenus compétitifs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {features.map(({ Icon, colorClass, title, desc }) => (
            <div key={title} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#E2E8F0]">
              <div className={`p-3 rounded-xl ${colorClass}`}>
                <Icon size={20} />
              </div>
              <div>
                <h3 className="font-semibold text-[#1E293B]">{title}</h3>
                <p className="text-sm text-[#94A3B8] mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Colonne Droite : Formulaire ---- */}
      <div className="lg:col-span-7 bg-white p-8 rounded-2xl shadow-xl border border-[#E2E8F0]">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#1E293B]">Créer un compte Livreur</h2>
          <p className="text-sm text-[#94A3B8] mt-2">
            Remplissez le formulaire ci-dessous avec vos informations personnelles et vos documents.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">

          {/* Infos personnelles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="last_name">
                Nom <span className="text-red-500">*</span>
              </label>
              <input id="last_name" name="last_name" type="text" placeholder="Dupont" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="first_name">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input id="first_name" name="first_name" type="text" placeholder="Jean" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="birthdate">
                Date de naissance <span className="text-red-500">*</span>
              </label>
              <input id="birthdate" name="birthdate" type="date" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="telephone">
                Numéro de téléphone <span className="text-red-500">*</span>
              </label>
              <PhoneInput
                name="telephone"
                inputProps={{ id: "telephone", required: true }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="city">
                Ville <span className="text-red-500">*</span>
              </label>
              <input id="city" name="city" type="text" placeholder="Douala" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="quater">
                Quartier <span className="text-red-500">*</span>
              </label>
              <input id="quater" name="quater" type="text" placeholder="Cité des Palmiers" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="rue">
                Rue <span className="text-red-500">*</span>
              </label>
              <input id="rue" name="rue" type="text" placeholder="Cité des Palmiers Rue 15" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="email">
                Adresse Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-[#94A3B8]" />
                </div>
                <input id="email" name="email" type="email" placeholder="votre@email.com" required className={`${inputClass} pl-10`} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="longitude">
                Longitude <span className="text-red-500">*</span>
              </label>
              <input id="longitude" name="longitude" type="text" placeholder="9.743407" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="latitude">
                Latitude <span className="text-red-500">*</span>
              </label>
              <input id="latitude" name="latitude" type="text" placeholder="4.040694" required className={inputClass} />
            </div>
          </div>

          {/* Documents */}
          <div className="pt-4 border-t border-[#E2E8F0]">
            <h3 className="text-sm font-semibold text-[#1E293B] uppercase tracking-wider mb-4 flex items-center gap-2">
              <FolderOpen size={16} className="text-[#22C55E]" />
              Documents Requis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { id: "cni_recto", label: "CNI (Recto)", accept: "image/*,.pdf" },
                { id: "cni_verso", label: "CNI (Verso)", accept: "image/*,.pdf" },
                { id: "plan_geolocalisation", label: "Plan de localisation", accept: "image/*,.pdf" },
                { id: "profile_image", label: "Photo de profil", accept: "image/*" },
              ].map(({ id, label, accept }) => (
                <div key={id}>
                  <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor={id}>
                    {label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={id} name={id} type="file" accept={accept} required
                    className="block w-full text-sm text-[#94A3B8] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-[#22C55E] file:text-white hover:file:bg-[#16A34A] border border-[#E2E8F0] rounded-xl cursor-pointer bg-[#F8FAFC] focus:outline-none"
                  />
                  {id === "cni_recto" && <p className="mt-1 text-xs text-[#94A3B8]">Format: PDF, JPG, PNG</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Mot de passe */}
          <div className="pt-4 border-t border-[#E2E8F0]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="password">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-[#94A3B8]" />
                  </div>
                  <input
                    id="password" name="password" type={showPassword ? "text" : "password"}
                    placeholder="••••••••" required onChange={() => setPasswordError(null)}
                    className={`${inputClass} pl-10 pr-10`}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#94A3B8] hover:text-[#1E293B]">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-[#94A3B8] flex items-center gap-1">
                  <Info size={12} /> Minimum 8 caractères
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1E293B] mb-1" htmlFor="confirm_password">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock size={16} className="text-[#94A3B8]" />
                  </div>
                  <input
                    id="confirm_password" name="confirm_password" type="password"
                    placeholder="••••••••" required onChange={() => setPasswordError(null)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>
            {passwordError && <p className="text-red-500 text-sm mt-2">{passwordError}</p>}
          </div>

          {/* CGU */}
          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input id="terms" name="terms" type="checkbox" required
                className="h-4 w-4 rounded border-[#E2E8F0] text-[#22C55E] focus:ring-[#22C55E]" />
            </div>
            <div className="ml-3 text-sm">
              <label className="font-medium text-[#64748B]" htmlFor="terms">
                J&apos;accepte les{" "}
                <a className="text-[#22C55E] hover:underline" href="#">conditions d&apos;utilisation</a>{" "}
                et la{" "}
                <a className="text-[#22C55E] hover:underline" href="#">politique de confidentialité</a>.
              </label>
            </div>
          </div>

          {/* Bouton submit */}
          <button type="submit" disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#22C55E] hover:bg-[#16A34A] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#22C55E] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Inscription en cours...</span>
              </>
            ) : (
              <span>Créer mon compte Livreur</span>
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-[#64748B]">
              Vous avez déjà un compte ?{" "}
              <a className="font-medium text-[#22C55E] hover:text-[#16A34A] transition-colors" href="/login">
                Se connecter
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
