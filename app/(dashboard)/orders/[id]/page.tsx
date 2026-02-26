"use client";

/**
 * Page Détails de Commande — e-Dr TIM Delivery System
 * Migré depuis order_detail_page.html
 */

import { useEffect, useState, use } from "react";
import { getActiveMissions } from "@/lib/api-client";

interface OrderDetailParams {
  id: string;
}

interface MissionItem {
  name: string;
  quantity: number;
}

interface Mission {
  id: number | string;
  order_number?: string;
  status?: string;
  pharmacy_name?: string;
  pharmacy_address?: string;
  customer_name?: string;
  delivery_address?: string;
  items?: MissionItem[];
}

export default function OrderDetailPage({ params }: { params: Promise<OrderDetailParams> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const missions = await getActiveMissions() as Mission[];
        // Dans une vraie app, on utiliserait un endpoint spécifique, ici on filtre
        const found = missions.find((m) => String(m.id) === id);
        setOrder(found || null);
      } catch (error) {
        console.error("Erreur lors de la récupération de la commande:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [id]);

  if (loading) {
    return <div className="text-slate-500 animate-pulse">Chargement des détails...</div>;
  }

  if (!order) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <span className="material-symbols-outlined text-slate-600 text-5xl mb-4">error</span>
        <h2 className="text-white text-xl font-bold">Commande non trouvée</h2>
        <p className="text-slate-500 mt-2">La commande #{id} n&apos;existe pas ou n&apos;est plus active.</p>
        <a href="/missions" className="mt-6 inline-block text-blue-500 hover:underline">Retour aux missions</a>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="text-white text-3xl font-black tracking-tight">Commande #{order.order_number || id}</h2>
            <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-bold border border-blue-500/20 uppercase tracking-wide">
              {order.status || "Assignée"}
            </span>
          </div>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-base">schedule</span>
            Récupération prévue à 14:30 • Livraison Prioritaire
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm font-medium hover:bg-slate-700 transition-all">
            <span className="material-symbols-outlined text-[20px]">headset_mic</span>
            <span className="hidden sm:inline">Support</span>
          </button>
          <button className="flex items-center justify-center gap-2 h-10 px-6 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-900/25 transition-all transform active:scale-95">
            <span className="material-symbols-outlined text-[20px]">navigation</span>
            <span>Naviguer vers la Pharmacie</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 pb-10">
        {/* Left Column: Route & Map */}
        <div className="flex-1 xl:flex-[1.4] flex flex-col gap-6">
          {/* Map Placeholder */}
          <div className="rounded-xl border border-slate-800 overflow-hidden shadow-lg relative h-[320px] bg-slate-950 flex items-center justify-center">
             <div className="text-center">
                <span className="material-symbols-outlined text-slate-700 text-6xl mb-2">map</span>
                <p className="text-slate-600 text-sm">Carte interactive bientôt disponible</p>
             </div>
             {/* Overlay Route Info */}
             <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur p-3 rounded-lg border border-slate-800 flex items-center gap-3">
                <div className="bg-blue-600/20 p-2 rounded-full">
                  <span className="material-symbols-outlined text-blue-500">distance</span>
                </div>
                <div>
                  <p className="text-white text-sm font-bold">3.7 km total</p>
                  <p className="text-slate-400 text-xs">Est. 18 mins</p>
                </div>
             </div>
          </div>

          {/* Timeline / Route Details */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
            <h3 className="text-white font-bold text-lg mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">alt_route</span>
              Détails de l&apos;itinéraire
            </h3>
            
            <div className="grid grid-cols-[40px_1fr] gap-x-4">
              {/* Step 1: Pickup */}
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center border border-blue-500/30 z-10">
                  <span className="material-symbols-outlined text-blue-500 text-[18px]">storefront</span>
                </div>
                <div className="w-0.5 bg-linear-to-b from-blue-500/30 to-slate-800 h-full min-h-[60px]"></div>
              </div>
              <div className="pb-8 pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-blue-500 text-xs font-bold uppercase tracking-wide mb-1">Ramassage</p>
                    <h4 className="text-white text-lg font-bold">{order.pharmacy_name || "Pharmacie Locale"}</h4>
                    <p className="text-slate-400 text-sm mt-1">{order.pharmacy_address || "Adresse de la pharmacie"}</p>
                  </div>
                  <button className="p-2 text-slate-500 hover:text-blue-500 transition-colors">
                    <span className="material-symbols-outlined">directions</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Dropoff */}
              <div className="flex flex-col items-center">
                <div className="w-0.5 bg-slate-800 h-4"></div>
                <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center border-2 border-slate-700 z-10">
                  <span className="material-symbols-outlined text-slate-500 text-[18px]">location_on</span>
                </div>
              </div>
              <div className="pt-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mb-1">Livraison</p>
                    <h4 className="text-white text-lg font-bold">{order.customer_name || "Client"}</h4>
                    <p className="text-slate-400 text-sm mt-1">{order.delivery_address || "Adresse de livraison"}</p>
                  </div>
                  <button className="p-2 text-slate-500 hover:text-blue-500 transition-colors">
                    <span className="material-symbols-outlined">call</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Details */}
        <div className="flex-1 flex flex-col gap-6">
          {/* Order Summary */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-white font-bold text-lg flex items-center justify-between">
                <span>Articles de la commande</span>
                <span className="text-xs font-medium bg-slate-800 text-slate-300 px-2 py-1 rounded">
                  {order.items?.length || 0} Articles
                </span>
              </h3>
            </div>
            <div className="flex flex-col divide-y divide-slate-800">
              {order.items?.map((item, idx) => (
                <div key={idx} className="p-4 flex gap-4 hover:bg-slate-800/50 transition-colors">
                  <div className="w-12 h-12 rounded bg-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                    <span className="material-symbols-outlined">pill</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-slate-500 text-xs">x{item.quantity}</p>
                    </div>
                  </div>
                </div>
              ))}
              {(!order.items || order.items.length === 0) && (
                <p className="p-4 text-slate-500 text-sm italic">Aucun détail d&apos;article disponible.</p>
              )}
            </div>
          </div>

          {/* Handling Instructions */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-5">
            <h3 className="text-white font-bold text-lg mb-4">Instructions particulières</h3>
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="material-symbols-outlined text-blue-400 shrink-0">ac_unit</span>
                <div>
                  <p className="text-white text-sm font-medium">Contrôle de température</p>
                  <p className="text-slate-400 text-xs leading-relaxed">Maintenir entre 2°C et 8°C si nécessaire.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800">
                <span className="material-symbols-outlined text-emerald-500 shrink-0">verified_user</span>
                <div>
                  <p className="text-white text-sm font-medium">Vérification d&apos;identité</p>
                  <p className="text-slate-400 text-xs leading-relaxed">Le destinataire doit présenter une pièce d&apos;identité valide.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
