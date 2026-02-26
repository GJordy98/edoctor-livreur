"use client";

/**
 * Page Commandes Entrantes — e-Dr TIM Delivery System
 * Migré depuis incoming_order_notification.html
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getUserInfo } from "@/lib/auth";

interface IncomingMission {
  id: string;
  pharmacy_name: string;
  pharmacy_address: string;
  order_number: string;
  distance: string;
  time: string;
  earnings: string;
  priority: boolean;
  priority_text?: string;
}

export default function IncomingOrderPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(30);
  const [mission, setMission] = useState<IncomingMission | null>(null);

  useEffect(() => {
    // Avoid synchronous setState lint
    const timerId = setTimeout(() => {
      // Prefetch info
      getUserInfo();
      
      const missionData: IncomingMission = {
        id: "MED-4921",
        pharmacy_name: "Walgreens - 4th St.",
        pharmacy_address: "2450 4th Street, Downtown",
        order_number: "MED-4921",
        distance: "2.4",
        time: "15",
        earnings: "$12.50",
        priority: true,
        priority_text: "Livraison prioritaire. Doit être livré avant 14:30. Contient des articles sensibles à la température."
      };

      setMission(missionData);
    }, 0);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/missions");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timerId);
      clearInterval(timer);
    };
  }, [router]);

  function handleAccept() {
    if (mission) {
      router.push(`/orders/${mission.order_number}`);
    }
  }

  function handleDecline() {
    router.push("/missions");
  }

  if (!mission) return (
    <div className="flex-1 flex items-center justify-center bg-background-dark/80 backdrop-blur-sm">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const countdownPct = (countdown / 30) * 100;

  return (
    <div className="flex-1 relative flex flex-col h-full overflow-hidden bg-background-dark/85 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-md mx-auto my-auto bg-[#1c2620] rounded-2xl shadow-2xl border border-white/10 overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
        {/* Pulse Effect */}
        <div className="absolute -inset-1 bg-[#2E8B57]/20 blur-xl -z-10 rounded-full opacity-50" />
        
        {/* Header */}
        <div className="px-6 pt-8 pb-2 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2E8B57]/10 border border-[#2E8B57]/20 mb-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2E8B57] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#2E8B57]" />
            </span>
            <span className="text-[#2E8B57] text-xs font-bold uppercase tracking-wide">Requête Entrante</span>
          </div>
          <h2 className="text-white text-2xl font-bold leading-tight">Demande de Livraison</h2>
        </div>

        {/* Pharmacy Info */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[#111714] border border-white/5">
            <div className="bg-white p-2 rounded-lg size-16 shrink-0 flex items-center justify-center">
              <span className="material-icons text-red-600 text-[32px]">local_pharmacy</span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-white text-lg font-bold">{mission.pharmacy_name}</h3>
              <p className="text-[#9eb7a8] text-sm">{mission.pharmacy_address}</p>
              <div className="flex gap-2 mt-2">
                <div className="flex items-center justify-center px-2 py-0.5 rounded-md bg-[#29382f] border border-white/5">
                  <p className="text-white text-xs font-medium">#{mission.order_number}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="px-6 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#29382f]/50 border border-white/5">
              <span className="material-icons text-[#2E8B57] mb-1">near_me</span>
              <span className="text-white font-bold text-lg">{mission.distance}</span>
              <span className="text-[#9eb7a8] text-[10px] uppercase font-medium">Km</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#29382f]/50 border border-white/5">
              <span className="material-icons text-[#2E8B57] mb-1">schedule</span>
              <span className="text-white font-bold text-lg">{mission.time}</span>
              <span className="text-[#9eb7a8] text-[10px] uppercase font-medium">Min</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#29382f]/50 border border-white/5">
              <span className="material-icons text-[#2E8B57] mb-1">payments</span>
              <span className="text-white font-bold text-lg">{mission.earnings}</span>
              <span className="text-[#9eb7a8] text-[10px] uppercase font-medium">Gains</span>
            </div>
          </div>
        </div>

        {/* Priority Warning */}
        {mission.priority && (
          <div className="px-6 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <span className="material-icons text-orange-400 text-sm mt-0.5">warning</span>
              <div className="flex flex-col">
                <span className="text-orange-200 text-sm font-medium">Livraison Prioritaire</span>
                <span className="text-orange-200/70 text-xs">{mission.priority_text}</span>
              </div>
            </div>
          </div>
        )}

        {/* Timer Progress */}
        <div className="px-6 pt-2 pb-6 flex flex-col gap-4">
          <div className="w-full bg-[#111714] rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-[#2E8B57] h-1.5 rounded-full transition-all duration-1000" 
              style={{ width: `${countdownPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#9eb7a8]">
            <span>Déclin automatique dans</span>
            <span className="font-mono text-white">00:{countdown.toString().padStart(2, "0")}</span>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={handleAccept}
              className="w-full bg-[#2E8B57] hover:bg-[#20603D] text-[#111714] text-lg font-bold py-4 rounded-xl shadow-lg shadow-[#2E8B57]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Voir la Commande</span>
              <span className="material-icons">arrow_forward</span>
            </button>
            <button
              onClick={handleDecline}
              className="w-full bg-transparent hover:bg-white/5 text-[#9eb7a8] hover:text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Décliner la requête
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
