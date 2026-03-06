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
import { ShieldCheck, Clock, AlertCircle } from "lucide-react";

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
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setInputState("normal");
    clearMessages();

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

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

  const inputClass = `otp-input w-10 h-12 sm:w-12 sm:h-14 text-center bg-[#F8FAFC] border-2 rounded-lg text-xl sm:text-2xl font-mono font-bold text-[#1E293B] focus:outline-none focus:ring-0 focus:scale-110 transition-all duration-200 caret-[#22C55E] ${
    inputState === "error"
      ? "border-red-500 input-error"
      : inputState === "success"
      ? "border-[#22C55E] input-success"
      : "border-[#E2E8F0] focus:border-[#22C55E]"
  } ${isVerifying || isExpired ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className="w-full max-w-md animate-fade-in-up">
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-[#E2E8F0]">

        {/* En-tête */}
        <div className="flex flex-col items-center pt-10 pb-6 px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#22C55E]/10 flex items-center justify-center mb-6">
            <ShieldCheck size={36} className="text-[#22C55E]" />
          </div>
          <h1 className="text-3xl font-black text-[#1E293B] mb-3 tracking-tight">
            Vérifier votre identité
          </h1>
          <p className="text-[#94A3B8] text-sm font-medium leading-relaxed max-w-[280px]">
            Entrez le code à 6 chiffres envoyé à<br />
            <span className="font-bold text-[#1E293B]">{phone}</span> via WhatsApp.
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <p className="text-red-600 text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Message de succès */}
            {success && (
              <div className="bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg p-3 text-center">
                <p className="text-[#22C55E] text-sm font-medium">{success}</p>
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
              <div className="flex items-center gap-2 text-[#94A3B8] text-sm">
                <Clock size={16} />
                <span>
                  Code expire dans{" "}
                  <span
                    className={`font-mono font-bold ${
                      parseInt(formatted.split(":")[1]) < 30 && formatted.startsWith("00")
                        ? "text-red-400"
                        : "text-[#1E293B]"
                    }`}
                  >
                    {formatted}
                  </span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <AlertCircle size={16} />
                <span className="font-medium">Code expiré</span>
              </div>
            )}

            {/* Bouton renvoyer */}
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              className="mt-2 text-sm font-medium text-[#22C55E] hover:text-[#16A34A] hover:underline underline-offset-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <p className="text-xs text-[#94A3B8] font-medium">
          e-Doctor Pharma App © 2026
        </p>
      </div>
    </div>
  );
}
