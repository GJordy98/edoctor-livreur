"use client";

/**
 * Page Mot de Passe Oublié — Story 3.6
 * Étape 1: POST /api/v1/send-otp/ (déjà intégré)
 * Étape 2: POST /api/v1/valid-otp/ (déjà intégré)
 * Étape 3: POST /api/v1/change-fogot-password/ ← Nouveau
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendOtp, verifyOtp, changeForgotPassword } from "@/lib/api-client";
import { formatPhoneNumber } from "@/lib/auth";

type Step = 1 | 2 | 3;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [telephone, setTelephone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Étape 1 — Envoyer OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const phone = formatPhoneNumber(telephone);
    if (!phone) {
      setError("Veuillez saisir un numéro de téléphone valide.");
      return;
    }
    setLoading(true);
    try {
      await sendOtp(phone);
      setStep(2);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi de l'OTP.");
    } finally {
      setLoading(false);
    }
  }

  // Étape 2 — Vérifier OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!otp || otp.length < 4) {
      setError("Veuillez saisir le code OTP reçu.");
      return;
    }
    setLoading(true);
    try {
      const phone = formatPhoneNumber(telephone);
      const res = await verifyOtp(phone, otp);
      if (res.status === false || res.error) {
        throw new Error(res.message || res.error || "Code OTP invalide.");
      }
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Code OTP invalide ou expiré.");
    } finally {
      setLoading(false);
    }
  }

  // Étape 3 — Réinitialiser le mot de passe
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const phone = formatPhoneNumber(telephone);
      await changeForgotPassword({ telephone: phone, password: newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur lors de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2E8B57] focus:border-transparent transition-all";

  const stepLabels = ["Téléphone", "Code OTP", "Nouveau mot de passe"];

  return (
    <div className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-[#1e293b] border border-gray-100 dark:border-gray-700">
      <div className="p-8 sm:p-10">
        {/* En-tête */}
        <div className="mb-8">
          <a href="/login" className="inline-flex items-center gap-1 text-sm text-[#2E8B57] hover:underline font-medium mb-6">
            <span className="material-icons text-sm">arrow_back</span>
            Retour à la connexion
          </a>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Mot de passe oublié
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Réinitialisez votre mot de passe en 3 étapes.
          </p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 mb-8">
          {stepLabels.map((label, idx) => {
            const stepNum = (idx + 1) as Step;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <div key={label} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isDone ? "bg-[#2E8B57] text-white" : isActive ? "bg-[#2E8B57]/20 text-[#2E8B57] border-2 border-[#2E8B57]" : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                }`}>
                  {isDone ? <span className="material-icons text-xs">check</span> : stepNum}
                </div>
                <span className={`text-xs font-medium truncate ${isActive ? "text-[#2E8B57]" : isDone ? "text-gray-600 dark:text-gray-300" : "text-gray-400"}`}>
                  {label}
                </span>
                {idx < stepLabels.length - 1 && (
                  <div className={`h-0.5 flex-1 rounded-full ${isDone ? "bg-[#2E8B57]" : "bg-gray-200 dark:bg-gray-700"}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* Succès */}
        {success && (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <div className="w-16 h-16 rounded-full bg-[#2E8B57]/10 flex items-center justify-center">
              <span className="material-icons text-[#2E8B57] text-4xl">check_circle</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mot de passe réinitialisé !</h2>
            <p className="text-gray-500 text-sm">Redirection vers la connexion...</p>
          </div>
        )}

        {/* Erreur */}
        {error && !success && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <span className="material-icons text-red-500 text-sm">error</span>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {/* Étape 1 — Téléphone */}
        {step === 1 && !success && (
          <form onSubmit={handleSendOtp} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Numéro de téléphone
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-icons text-gray-400 text-lg">phone</span>
                </div>
                <input
                  type="tel"
                  placeholder="+237640111308"
                  required
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-medium text-white bg-[#2E8B57] hover:bg-[#20603D] focus:outline-none focus:ring-2 focus:ring-[#2E8B57] transition-all disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-icons text-sm">send</span>
              )}
              {loading ? "Envoi..." : "Recevoir le code"}
            </button>
          </form>
        )}

        {/* Étape 2 — OTP */}
        {step === 2 && !success && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Un code a été envoyé au <strong className="text-gray-800 dark:text-white">{formatPhoneNumber(telephone)}</strong>
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Code OTP
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-icons text-gray-400 text-lg">pin</span>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/, ""))}
                  maxLength={6}
                  className={inputClass}
                  autoFocus
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-medium text-white bg-[#2E8B57] hover:bg-[#20603D] focus:outline-none focus:ring-2 focus:ring-[#2E8B57] transition-all disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-icons text-sm">verified</span>
              )}
              {loading ? "Vérification..." : "Vérifier le code"}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-sm text-[#2E8B57] hover:underline font-medium"
            >
              Changer de numéro
            </button>
          </form>
        )}

        {/* Étape 3 — Nouveau mot de passe */}
        {step === 3 && !success && (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-icons text-gray-400 text-lg">lock</span>
                </div>
                <input
                  type="password"
                  placeholder="Min. 6 caractères"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  autoFocus
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="material-icons text-gray-400 text-lg">lock_reset</span>
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-medium text-white bg-[#2E8B57] hover:bg-[#20603D] focus:outline-none focus:ring-2 focus:ring-[#2E8B57] transition-all disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span className="material-icons text-sm">lock_reset</span>
              )}
              {loading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
