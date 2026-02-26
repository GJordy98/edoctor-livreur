"use client";

/**
 * Page Suivi en direct — e-Dr TIM Delivery System
 * Migré depuis live_delivery_tracking_map.html
 */

import { useState, useEffect } from "react";
import { getActiveMissions } from "@/lib/api-client";

interface Mission {
  id: number | string;
  order_number?: string;
  delivery_address?: string;
  status?: string;
}

export default function TrackingPage() {
  const [activeMission, setActiveMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActive() {
      try {
        const missions = await getActiveMissions() as Mission[];
        if (missions && missions.length > 0) {
          setActiveMission(missions[0]); 
        }
      } catch (error) {
        console.error("Erreur fetching active mission:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchActive();
  }, []);

  if (loading) {
    return <div className="text-slate-500 animate-pulse p-6">Initialisation du suivi...</div>;
  }

  return (
    <div className="relative h-[calc(100vh-140px)] -m-4 md:-m-6 overflow-hidden bg-slate-950">
      {/* Map Container Placeholder */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <div className="text-center opacity-20">
          <span className="material-symbols-outlined text-white text-[120px]">map</span>
          <p className="text-white text-xl font-bold mt-4">Carte en chargement...</p>
        </div>
        
        {/* Fake Route SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" viewBox="0 0 1000 1000">
           <path d="M 200 800 Q 400 700 500 500 T 800 200" fill="none" stroke="#3b82f6" strokeWidth="6" strokeDasharray="12 8" className="animate-[dash_20s_linear_infinite]" />
        </svg>

        {/* Markers Placeholders */}
        <div className="absolute top-1/4 left-1/4 group cursor-pointer">
           <div className="bg-white p-1 rounded-full shadow-lg border-2 border-slate-900 scale-110">
              <span className="material-symbols-outlined text-slate-900 text-[20px] block">person_pin_circle</span>
           </div>
        </div>
        <div className="absolute top-3/4 right-1/4">
           <div className="bg-blue-600 p-1.5 rounded-full shadow-lg border-2 border-white animate-pulse">
              <span className="material-symbols-outlined text-white text-[24px] block">location_on</span>
           </div>
        </div>
      </div>

      {/* UI Overlay Layer */}
      <div className="relative z-10 flex flex-col md:flex-row h-full pointer-events-none p-4 md:p-6 gap-6">
        {/* Left Spacer for Map Visibility */}
        <div className="flex-1"></div>

        {/* Right Info Panel */}
        <div className="pointer-events-auto w-full md:w-[400px] flex flex-col gap-4 h-fit max-h-full overflow-y-auto no-scrollbar">
          {/* Main Status Card */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider">En cours de livraison</span>
              </div>
              <span className="text-slate-400 text-xs font-medium">#{activeMission?.order_number || "---"}</span>
            </div>

            <div className="flex flex-col gap-1 mb-6">
              <p className="text-slate-400 text-sm">Arrivée estimée</p>
              <div className="flex items-baseline gap-2">
                <h2 className="text-white text-4xl font-black">14 mins</h2>
                <span className="text-blue-500 font-bold">15:10</span>
              </div>
            </div>

            {/* Delivery Progress Bar */}
            <div className="relative mb-8">
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 w-2/3 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
              </div>
              <div className="absolute -top-1 left-2/3 -ml-2 w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
            </div>

            {/* Route Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6 p-4 rounded-xl bg-slate-950/50 border border-slate-800/50">
              <div className="flex flex-col gap-1">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Distance</p>
                <p className="text-white font-bold">2.4 km</p>
              </div>
              <div className="flex flex-col gap-1 border-l border-slate-800 pl-4">
                <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Vitesse</p>
                <p className="text-white font-bold">22 km/h</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <button className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/40 transition active:scale-95 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">call</span>
                Contacter le client
              </button>
              <button className="w-full py-3 rounded-lg border border-slate-700 text-white font-bold hover:bg-slate-800 transition flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[20px]">more_horiz</span>
                Plus d&apos;options
              </button>
            </div>
          </div>

          {/* Secondary Card (Destination) */}
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center text-blue-500">
              <span className="material-symbols-outlined text-2xl">location_on</span>
            </div>
            <div className="flex-1">
              <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest leading-none mb-1">Destination</p>
              <p className="text-white font-bold text-sm truncate">{activeMission?.delivery_address || "En attente d'adresse..."}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute bottom-6 left-6 z-20 flex flex-col gap-2 pointer-events-auto">
        <button className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 text-white flex items-center justify-center hover:bg-slate-800 transition shadow-lg">
          <span className="material-symbols-outlined">my_location</span>
        </button>
        <div className="flex flex-col rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
          <button className="w-10 h-10 text-white flex items-center justify-center hover:bg-slate-800 transition border-b border-slate-800">
            <span className="material-symbols-outlined">add</span>
          </button>
          <button className="w-10 h-10 text-white flex items-center justify-center hover:bg-slate-800 transition">
            <span className="material-symbols-outlined">remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}
