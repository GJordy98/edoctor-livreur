"use client";

/**
 * Page Vérification OTP — e-Dr TIM Delivery System
 * Migré fidèlement depuis verify_otp.html + verify_otp.js
 * Inclut : countdown 2min persistant, 6 inputs, auto-submit, paste, renvoi
 */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { verifyOtp, sendOtp } from "@/lib/api-client";
import { getPhone } from "@/lib/auth";
import { useOtpTimer } from "@/hooks/useOtpTimer";

export default function VerifyOtpPage() {
  const router = useRouter();
  const { formatted, isExpired, resetTimer, clearStoredTimer } = useOtpTimer();

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inputState, setInputState] = useState<"normal" | "error" | "success">("normal");

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const phone = getPhone() || "+XXX XXX XXX";

  const getOtpCode = () => digits.join("");

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function setErrorMsg(msg: string) {
    setError(msg);
    setSuccess(null);
  }

  function setSuccessMsg(msg: string) {
    setSuccess(msg);
    setError(null);
  }

  async function handleVerify(code?: string) {
    const otp = code ?? getOtpCode();

    if (isExpired) {
      setErrorMsg("Le code a expiré. Veuillez demander un nouveau code.");
      return;
    }
    if (isVerifying) return;
    if (otp.length !== 6) {
      setErrorMsg("Veuillez entrer un code à 6 chiffres.");
      setInputState("error");
      return;
    }

    setIsVerifying(true);
    clearMessages();

    try {
      const result = await verifyOtp(phone, otp);

      if (result?.status === true) {
        setInputState("success");
        setSuccessMsg("Code vérifié avec succès ! Redirection...");
        clearStoredTimer();

        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        const msg = result?.message || result?.error || "Code invalide. Veuillez réessayer.";
        setErrorMsg(msg);
        setInputState("error");
        setIsVerifying(false);
        inputRefs.current[0]?.focus();
        inputRefs.current[0]?.select();
      }
    } catch {
      setErrorMsg("Une erreur réseau est survenue. Veuillez réessayer.");
      setInputState("error");
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setResendLoading(true);
    clearMessages();
    try {
      const result = await sendOtp(phone);
      if (result?.status === true) {
        resetTimer();
        setDigits(["", "", "", "", "", ""]);
        setInputState("normal");
        setSuccessMsg("Un nouveau code a été envoyé sur WhatsApp.");
        inputRefs.current[0]?.focus();
      } else {
        setErrorMsg(result?.message || "Impossible de renvoyer le code. Veuillez réessayer.");
      }
    } catch {
      setErrorMsg("Une erreur réseau est survenue. Veuillez réessayer.");
    } finally {
      setResendLoading(false);
    }
  }

  function handleInput(index: number, value: string) {
    // Garder uniquement le dernier chiffre
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setInputState("normal");
    clearMessages();

    // Passer au suivant
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit si 6 chiffres
    const code = newDigits.join("");
    if (code.length === 6 && !newDigits.includes("") && !isVerifying && !isExpired) {
      handleVerify(code);
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newDigits = Array(6).fill("");
    pasted.split("").forEach((d, i) => {
      newDigits[i] = d;
    });
    setDigits(newDigits);
    setInputState("normal");

    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pasted.length === 6) {
      handleVerify(pasted);
    }
  }

  const inputClass = `otp-input w-10 h-12 sm:w-12 sm:h-14 text-center bg-gray-50 dark:bg-[#1a2535] border-2 rounded-lg text-xl sm:text-2xl font-mono font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-0 focus:scale-110 transition-all duration-200 caret-[#2E8B57] ${
    inputState === "error"
      ? "border-red-500 input-error"
      : inputState === "success"
      ? "border-[#13ecda] input-success"
      : "border-gray-200 dark:border-[#2d3f50] focus:border-[#2E8B57]"
  } ${isVerifying || isExpired ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-border-dark">
        
        {/* En-tête */}
        <div className="flex flex-col items-center pt-10 pb-6 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#2E8B57]/10 flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl text-[#2E8B57]">
              verified_user
            </span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
            Vérifier votre identité
          </h1>
          <p className="text-gray-500 dark:text-text-muted text-sm font-medium leading-relaxed max-w-[280px]">
            Entrez le code à 6 chiffres envoyé à<br />
            <span className="font-bold text-gray-800 dark:text-white">{phone}</span> via WhatsApp.
          </p>
        </div>

        {/* Formulaire */}
        <div className="px-8 pb-10">
          <form
            className="flex flex-col gap-8"
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
          >
            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-center">
                <p className="text-red-400 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Message de succès */}
            {success && (
              <div className="bg-[#2E8B57]/10 border border-[#2E8B57]/30 rounded-lg p-3 text-center">
                <p className="text-[#2E8B57] text-sm font-medium">{success}</p>
              </div>
            )}

            {/* 6 inputs OTP */}
            <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  aria-label={`Digit ${index + 1}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  disabled={isVerifying || isExpired}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  className={inputClass}
                  onChange={(e) => handleInput(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                />
              ))}
            </div>
          </form>

          {/* Footer timer + renvoi */}
          <div className="mt-6 flex flex-col items-center justify-center gap-2">
            {/* Timer */}
            {!isExpired ? (
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                <span className="material-symbols-outlined text-base">timer</span>
                <span>
                  Code expire dans{" "}
                  <span
                    className={`font-mono font-bold ${
                      parseInt(formatted.split(":")[1]) < 30 && formatted.startsWith("00")
                        ? "text-red-400"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {formatted}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <span className="material-symbols-outlined text-base">error</span>
                <span className="font-medium">Code expiré</span>
              </div>
            )}

            {/* Bouton renvoyer */}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="mt-2 text-sm font-medium text-[#2E8B57] hover:text-[#20603D] hover:underline underline-offset-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendLoading ? (
                <span>Envoi en cours...</span>
              ) : (
                <span>Vous n&apos;avez pas reçu le code ? Renvoyer</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600 font-medium">
          e-Doctor Pharma App © 2026
        </p>
      </div>
    </div>
  );
}
