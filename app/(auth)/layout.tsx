"use client";

import { Truck } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-[#F8FAFC] text-[#1E293B] min-h-screen flex flex-col">
      {/* Header */}
      <header className="w-full bg-white shadow-sm border-b border-[#E2E8F0] py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* Logo pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F0FDF4] rounded-full border border-[#22C55E]/20">
            <Truck size={18} className="text-[#22C55E]" />
            <div className="flex flex-col leading-none">
              <span className="text-base font-black text-[#22C55E] tracking-tight">
                e-Dr TIM
              </span>
              <span className="text-[10px] text-[#94A3B8] font-semibold tracking-widest uppercase">
                Livraison
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a
            className="text-sm font-medium text-[#94A3B8] hover:text-[#22C55E] transition-colors hidden sm:block"
            href="#"
          >
            Besoin d&apos;aide ?
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="grow flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {/* Blobs décoratifs */}
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-[#22C55E]/6 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-blue-400/4 rounded-full blur-3xl pointer-events-none" />
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full py-5 text-center text-sm text-[#94A3B8] bg-white border-t border-[#E2E8F0]">
        <p className="font-medium">© 2026 e-Dr TIM Pharmacy. Tous droits réservés.</p>
        <div className="mt-2 space-x-4">
          <a className="hover:text-[#22C55E] transition-colors" href="#">
            Politique de confidentialité
          </a>
          <span className="text-[#E2E8F0]">|</span>
          <a className="hover:text-[#22C55E] transition-colors" href="#">
            Conditions d&apos;utilisation
          </a>
        </div>
      </footer>
    </div>
  );
}
