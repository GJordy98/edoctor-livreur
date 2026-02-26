"use client";

/**
 * useOtpTimer hook — e-Dr TIM Delivery System
 * Migré depuis verify_otp.js
 * Compte à rebours persistant de 2 minutes pour l'OTP
 */

import { useState, useEffect, useRef, useCallback } from "react";

const OTP_EXPIRY_DURATION = 2 * 60 * 1000; // 2 minutes
const STORAGE_KEY = "otp_expiry_timestamp";

export function useOtpTimer() {
  const [timeLeft, setTimeLeft] = useState<number>(OTP_EXPIRY_DURATION);
  const [isExpired, setIsExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(
    (expiryTime: number) => {
      clearTimer();

      const update = () => {
        const remaining = expiryTime - Date.now();
        if (remaining <= 0) {
          setTimeLeft(0);
          setIsExpired(true);
          clearTimer();
        } else {
          setTimeLeft(remaining);
        }
      };

      update();
      intervalRef.current = setInterval(update, 1000);
    },
    [clearTimer]
  );

  const resetTimer = useCallback(() => {
    const newExpiry = Date.now() + OTP_EXPIRY_DURATION;
    localStorage.setItem(STORAGE_KEY, newExpiry.toString());
    setIsExpired(false);
    startCountdown(newExpiry);
  }, [startCountdown]);

  const clearStoredTimer = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Initialisation : reprendre le timer persistant s'il existe
  useEffect(() => {
    let expiryTime = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);

    if (!expiryTime || expiryTime <= Date.now()) {
      // Créer un nouveau timer
      expiryTime = Date.now() + OTP_EXPIRY_DURATION;
      localStorage.setItem(STORAGE_KEY, expiryTime.toString());
    }

    startCountdown(expiryTime);
    return clearTimer;
  }, [startCountdown, clearTimer]);

  // Formatage mm:ss
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const formatted = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return { timeLeft, isExpired, formatted, resetTimer, clearStoredTimer };
}
