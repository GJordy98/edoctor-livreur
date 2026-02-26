"use client";

/**
 * Layout Dashboard — e-Dr TIM Delivery System
 * Mode clair : sidebar/header blanc + accents verts
 * Mode sombre : sidebar/header bleu nuit + accents verts
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { useTheme } from "@/context/ThemeContext";

const NAV_ITEMS = [
  { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
  { icon: "location_on", label: "Géolocalisation", href: "/geolocation" },
  { icon: "inventory_2", label: "Missions actives", href: "/missions" },
  { icon: "store_mall_directory", label: "Collectes pickup", href: "/pickups" },
  { icon: "qr_code_scanner", label: "Scanner officine", href: "/pickup-scan" },
  { icon: "schedule", label: "Historique", href: "/history" },
  { icon: "map", label: "Suivi en direct", href: "/tracking" },
  { icon: "shopping_cart", label: "Commandes", href: "/orders/incoming" },
  { icon: "account_circle", label: "Profil", href: "/profile" },
  { icon: "settings", label: "Paramètres", href: "/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { toggleTheme } = useTheme();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f0faf4] dark:bg-[#071324] flex transition-colors duration-300">

      {/* ============ SIDEBAR ============ */}
      <aside className="hidden md:flex w-64 bg-white dark:bg-[#081730] border-r border-green-100 dark:border-[#1a3a6e] flex-col transition-colors duration-300 shadow-sm">

        {/* Brand */}
        <div className="p-5 border-b border-green-100 dark:border-[#1a3a6e]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#2E8B57] flex items-center justify-center shadow-md shadow-[#2E8B57]/30">
              <span className="material-icons text-white text-[18px]">local_shipping</span>
            </div>
            <div>
              <h1 className="text-base font-black text-gray-900 dark:text-white leading-none">
                e-Dr TIM
              </h1>
              <p className="text-[10px] text-gray-400 dark:text-[#4a6a8a] font-semibold tracking-wider uppercase">
                Espace Livreur
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ icon, label, href }) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-[#7a9bbf] hover:bg-green-50 dark:hover:bg-[#0d2040] hover:text-[#2E8B57] dark:hover:text-[#2E8B57] transition-all text-sm font-medium group"
            >
              <span className="material-icons text-[20px] text-gray-400 dark:text-[#4a6a8a] group-hover:text-[#2E8B57] transition-colors">
                {icon}
              </span>
              {label}
            </a>
          ))}
        </nav>

        {/* Bottom promo block */}
        <div className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-[#2E8B57] to-[#1a5e37] p-4 text-white relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
            <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-white/5 rounded-full" />
            <span className="material-icons text-white/80 mb-2 block">verified</span>
            <p className="text-xs font-bold leading-tight">Livraisons sécurisées</p>
            <p className="text-[10px] text-white/70 mt-1">Réseau e-Dr TIM Pharmacy</p>
          </div>
        </div>
      </aside>

      {/* ============ CONTENU PRINCIPAL ============ */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Top navbar */}
        <header className="bg-white dark:bg-[#0a1d38] border-b border-green-100 dark:border-[#1a3a6e] px-4 py-3 flex items-center justify-between transition-colors duration-300 shadow-sm">
          <a
            href="/geolocation"
            className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-white hover:text-[#2E8B57] transition-colors"
          >
            <span className="material-icons text-[#2E8B57] text-[18px]">local_shipping</span>
            e-Dr TIM Delivery
          </a>

          <div className="flex items-center gap-2">
            {/* Toggle Dark / Light */}
            <button
              onClick={toggleTheme}
              aria-label="Changer le thème"
              className="p-2 rounded-xl hover:bg-green-50 dark:hover:bg-[#1a3a6e] transition-colors text-gray-500 dark:text-[#7a9bbf]"
              title="Changer le thème"
            >
              {/* ☀️ Visible en mode sombre */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 hidden dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              {/* 🌙 Visible en mode clair */}
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 block dark:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            </button>

            {/* Notifications */}
            <a
              href="/notifications"
              className="relative p-2 rounded-xl hover:bg-green-50 dark:hover:bg-[#1a3a6e] transition-colors flex items-center justify-center"
            >
              <span className="material-icons text-gray-500 dark:text-[#7a9bbf] text-[20px]">notifications</span>
            </a>

            {/* Avatar */}
            <a
              href="/profile"
              className="w-8 h-8 rounded-full bg-[#2E8B57] flex items-center justify-center text-white text-xs font-black hover:bg-[#20603D] transition-colors shadow-md shadow-[#2E8B57]/30"
            >
              L
            </a>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
