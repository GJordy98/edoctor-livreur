"use client";

/**
 * Page Inscription Livreur — e-Dr TIM Delivery System
 * Migré fidèlement depuis delivery_registration.html + delivery_registration.js
 * FormData POST → /api/v1/delivery/ → redirect /verify-otp
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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

    // Validation mot de passe
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

    // Formater le numéro de téléphone
    const rawPhone = data.get("telephone") as string;
    data.set("telephone", formatPhoneNumber(rawPhone));

    // Supprimer les champs non attendus par l'API
    data.delete("confirm_password");
    data.delete("terms");

    setLoading(true);
    setError(null);

    try {
      const result = await registerDriver(data);

      // Stocker le téléphone pour l'OTP
      const phone = data.get("telephone") as string;
      setPhone(phone);

      // Stocker l'ID utilisateur si retourné
      if (result?.user_id || result?.id) {
        localStorage.setItem("delivery_user_id", String(result.user_id || result.id));
      }

      // Réinitialiser le timestamp OTP
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
    "block w-full rounded-lg border border-gray-200 dark:border-[#334155] bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent text-sm transition-all placeholder-gray-400";

  return (
    <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
      
      {/* ---- Colonne Gauche : Présentation ---- */}
      <div className="hidden lg:block lg:col-span-5 space-y-8 sticky top-24 pr-4">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
            Rejoignez l&apos;équipe <br />
            <span className="text-[#2E8B57]">e-Dr Tim Delivery</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Livrez des médicaments essentiels et faites la différence. Gérez votre emploi du temps
            et gagnez des revenus compétitifs.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {[
            {
              icon: "schedule",
              colorClass: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
              title: "Horaires Flexibles",
              desc: "Choisissez quand vous voulez travailler. Soyez votre propre patron.",
            },
            {
              icon: "payments",
              colorClass: "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400",
              title: "Revenus Attractifs",
              desc: "Recevez vos paiements chaque semaine avec des bonus de performance.",
            },
            {
              icon: "medical_services",
              colorClass: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
              title: "Impact Social",
              desc: "Aidez les patients à recevoir leurs traitements rapidement et en toute sécurité.",
            },
          ].map(({ icon, colorClass, title, desc }) => (
            <div
              key={title}
              className="flex items-start gap-4 p-4 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-[#334155]"
            >
              <div className={`p-3 rounded-lg ${colorClass}`}>
                <span className="material-symbols-outlined">{icon}</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Colonne Droite : Formulaire ---- */}
      <div className="lg:col-span-7 bg-white dark:bg-[#1E293B] p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-[#334155]">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Créer un compte Livreur
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Remplissez le formulaire ci-dessous avec vos informations personnelles et vos documents.
          </p>
        </div>

        {/* Erreur globale */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="material-icons text-red-500">error</span>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
          
          {/* Infos personnelles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="last_name">
                Nom <span className="text-red-500">*</span>
              </label>
              <input id="last_name" name="last_name" type="text" placeholder="Dupont" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="first_name">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input id="first_name" name="first_name" type="text" placeholder="Jean" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="birthdate">
                Date de naissance <span className="text-red-500">*</span>
              </label>
              <input id="birthdate" name="birthdate" type="date" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="telephone">
                Numéro de téléphone <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">smartphone</span>
                </div>
                <input
                  id="telephone" name="telephone" type="tel" placeholder="Ex: +237699999999" required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="city">
                Ville <span className="text-red-500">*</span>
              </label>
              <input id="city" name="city" type="text" placeholder="Douala" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="quater">
                Quartier <span className="text-red-500">*</span>
              </label>
              <input id="quater" name="quater" type="text" placeholder="Cité des Palmiers" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="rue">
                Rue <span className="text-red-500">*</span>
              </label>
              <input id="rue" name="rue" type="text" placeholder="Cité des Palmiers Rue 15" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="email">
                Adresse Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-symbols-outlined text-gray-400 text-[20px]">mail</span>
                </div>
                <input
                  id="email" name="email" type="email" placeholder="votre@email.com" required
                  className={`${inputClass} pl-10`}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="longitude">
                Longitude <span className="text-red-500">*</span>
              </label>
              <input id="longitude" name="longitude" type="text" placeholder="9.743407" required className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="latitude">
                Latitude <span className="text-red-500">*</span>
              </label>
              <input id="latitude" name="latitude" type="text" placeholder="4.040694" required className={inputClass} />
            </div>
          </div>

          {/* Documents */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2E8B57]">folder_open</span>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor={id}>
                    {label} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id={id} name={id} type="file" accept={accept} required
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#2E8B57] file:text-white hover:file:bg-[#20603D] border border-gray-200 dark:border-[#334155] rounded-lg cursor-pointer bg-gray-50 dark:bg-slate-800 dark:text-gray-400 focus:outline-none"
                  />
                  {id === "cni_recto" && <p className="mt-1 text-xs text-gray-400">Format: PDF, JPG, PNG</p>}
                </div>
              ))}
            </div>
          </div>

          {/* Mot de passe */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="password">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">lock</span>
                  </div>
                  <input
                    id="password" name="password" type={showPassword ? "text" : "password"}
                    placeholder="••••••••" required onChange={() => setPasswordError(null)}
                    className={`${inputClass} pl-10 pr-10`}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? "visibility" : "visibility_off"}
                    </span>
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">info</span> Minimum 8 caractères
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="confirm_password">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-gray-400 text-[20px]">lock_reset</span>
                  </div>
                  <input
                    id="confirm_password" name="confirm_password" type="password"
                    placeholder="••••••••" required onChange={() => setPasswordError(null)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>
            {passwordError && (
              <p className="text-red-500 text-sm mt-2">{passwordError}</p>
            )}
          </div>

          {/* CGU */}
          <div className="flex items-start">
            <div className="flex h-5 items-center">
              <input
                id="terms" name="terms" type="checkbox" required
                className="h-4 w-4 rounded border-gray-300 text-[#2E8B57] focus:ring-[#2E8B57] dark:border-gray-600 dark:bg-slate-700"
              />
            </div>
            <div className="ml-3 text-sm">
              <label className="font-medium text-gray-700 dark:text-gray-300" htmlFor="terms">
                J&apos;accepte les{" "}
                <a className="text-[#2E8B57] hover:underline" href="#">conditions d&apos;utilisation</a>{" "}
                et la{" "}
                <a className="text-[#2E8B57] hover:underline" href="#">politique de confidentialité</a>.
              </label>
            </div>
          </div>

          {/* Bouton submit */}
          <button
            type="submit" disabled={loading}
            className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#2E8B57] hover:bg-[#20603D] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2E8B57] transition-all duration-200 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="loader" />
                <span>Inscription en cours...</span>
              </>
            ) : (
              <span>Créer mon compte Livreur</span>
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vous avez déjà un compte ?{" "}
              <a className="font-medium text-[#2E8B57] hover:text-[#20603D] transition-colors" href="/login">
                Se connecter
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
