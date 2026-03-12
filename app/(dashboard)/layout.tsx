"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, getUserInfo, clearAuth, type UserInfo } from "@/lib/auth";
import { useNotifications } from "@/hooks/useNotifications";
import { useFCM } from "@/hooks/useFCM";
import {
  MapPin,
  Package,
  Store,
  ScanLine,
  Clock,
  Map,
  User,
  Settings,
  ShieldCheck,
  Bell,
  Wallet,
  Truck,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: MapPin, label: "Géolocalisation", href: "/geolocation" },
  { icon: Package, label: "Missions", href: "/missions" },
  { icon: Truck, label: "Mission active", href: "/mission-active" },
  { icon: Store, label: "Collectes pickup", href: "/pickups" },
  { icon: ScanLine, label: "Scanner officine", href: "/pickup-scan" },
  { icon: Clock, label: "Historique", href: "/history" },
  { icon: Map, label: "Suivi en direct", href: "/tracking" },
  { icon: Wallet, label: "Portefeuille", href: "/wallet" },
  { icon: User, label: "Profil", href: "/profile" },
  { icon: Settings, label: "Paramètres", href: "/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { unreadCount } = useNotifications();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  useFCM();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/login");
    } else {
      setUserInfo(getUserInfo());
    }
  }, [router]);

  function logout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">

      {/* ============ SIDEBAR ============ */}
      <aside className="hidden md:flex w-64 bg-white border-r border-[#E2E8F0] flex-col shadow-sm">

        {/* Brand */}
        <Link
          href="/geolocation"
          className="flex items-center gap-2 px-4 py-5 text-sm font-bold text-[#1E293B] hover:text-[#22C55E] transition-colors"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="e-Dr TIM" style={{ height: 28, width: 'auto' }} className="object-contain" />
          e-Dr TIM Delivery
        </Link>



        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href + label}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group ${isActive
                  ? "bg-[#F0FDF4] text-[#22C55E]"
                  : "text-[#64748B] hover:bg-[#F0FDF4] hover:text-[#22C55E]"
                  }`}
              >
                <Icon
                  size={18}
                  className={isActive ? "text-[#22C55E]" : "text-[#94A3B8] group-hover:text-[#22C55E] transition-colors"}
                />
                {label}
              </Link>
            );
          })}

          {/* Notifications dans le sidebar */}
          <Link
            href="/notifications"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium group ${pathname === "/notifications"
              ? "bg-[#F0FDF4] text-[#22C55E]"
              : "text-[#64748B] hover:bg-[#F0FDF4] hover:text-[#22C55E]"
              }`}
          >
            <div className="relative">
              <Bell
                size={18}
                className={pathname === "/notifications" ? "text-[#22C55E]" : "text-[#94A3B8] group-hover:text-[#22C55E] transition-colors"}
              />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 bg-[#EF4444] text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            Notifications
          </Link>
        </nav>


        {/* User Profile + Logout */}
        <div className="px-3 pt-3 flex flex-col gap-2">
          <div className="p-3 rounded-xl bg-[#F0FDF4] border border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full ring-2 ring-[#22C55E]/20 bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                <User size={16} className="text-[#22C55E]" />
              </div>
              <div className="flex flex-col overflow-hidden flex-1">
                <p className="text-sm font-bold truncate text-[#1E293B]">
                  {userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : "Chargement..."}
                </p>
                <p className="text-xs text-[#94A3B8] truncate">
                  {userInfo?.telephone || "---"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors text-sm font-medium"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>

        {/* Bottom promo block */}
        <div className="p-3">
          <div className="rounded-xl bg-gradient-to-br from-[#22C55E] to-[#16A34A] p-4 text-white relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-white/10 rounded-full" />
            <div className="absolute -bottom-2 -left-2 w-10 h-10 bg-white/5 rounded-full" />
            <ShieldCheck size={18} className="text-white/80 mb-2" />
            <p className="text-xs font-bold leading-tight">Livraisons sécurisées</p>
            <p className="text-[10px] text-white/70 mt-1">Réseau e-Dr TIM Pharmacy</p>
          </div>
        </div>
      </aside>

      {/* ============ CONTENU PRINCIPAL ============ */}
      <div className="flex-1 flex flex-col min-h-screen">

        {/* Top navbar */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 py-3 flex items-center shadow-sm sticky top-0 z-30">

          <div className="flex items-center gap-2 ml-auto">
            {/* Cloche notifications avec badge */}
            <Link
              href="/notifications"
              className="relative p-2 rounded-xl hover:bg-[#F0FDF4] transition-colors flex items-center justify-center"
              title="Notifications"
            >
              <Bell size={18} className={unreadCount > 0 ? "text-[#22C55E]" : "text-[#64748B]"} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-[#EF4444] text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </Link>



            {/* Avatar */}
            <Link
              href="/profile"
              className="w-8 h-8 rounded-full bg-[#22C55E] flex items-center justify-center text-white text-xs font-black hover:bg-[#16A34A] transition-colors shadow-md shadow-[#22C55E]/30"
            >
              {userInfo?.firstName?.charAt(0).toUpperCase() || "L"}
            </Link>




          </div>
        </header>




        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}