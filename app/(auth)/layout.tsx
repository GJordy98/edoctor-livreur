"use client";

/**
 * Layout Auth — e-Dr TIM Delivery System
 * Mode clair : vert + blanc
 * Mode sombre : vert + bleu nuit
 */

import { useEffect, useState } from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [dark]);

  return (
    <div className="bg-[#f0faf4] dark:bg-[#071324] text-gray-900 dark:text-gray-100 min-h-screen flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="w-full bg-white dark:bg-[#0a1d38] shadow-sm border-b border-green-100 dark:border-[#1a3a6e] py-4 px-6 md:px-12 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {/* Logo pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#2E8B57]/10 dark:bg-[#2E8B57]/20 rounded-full border border-[#2E8B57]/20">
            <span className="material-icons text-[#2E8B57] text-lg">local_shipping</span>
            <div className="flex flex-col leading-none">
              <span className="text-base font-black text-[#2E8B57] tracking-tight">
                e-Dr TIM
              </span>
              <span className="text-[10px] text-gray-500 dark:text-[#7a9bbf] font-semibold tracking-widest uppercase">
                Livraison
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Toggle dark/light */}
          <button
            className="p-2 rounded-full hover:bg-green-50 dark:hover:bg-[#1a3a6e] transition-colors text-gray-500 dark:text-[#7a9bbf] border border-transparent hover:border-green-200 dark:hover:border-[#1a3a6e]"
            onClick={() => setDark(!dark)}
            aria-label="Toggle dark mode"
          >
            {dark ? (
              <span className="material-icons">light_mode</span>
            ) : (
              <span className="material-icons">dark_mode</span>
            )}
          </button>
          <a
            className="text-sm font-medium text-gray-500 dark:text-[#7a9bbf] hover:text-[#2E8B57] dark:hover:text-[#2E8B57] transition-colors hidden sm:block"
            href="#"
          >
            Besoin d&apos;aide ?
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="grow flex items-center justify-center p-4 sm:p-8 relative overflow-hidden">
        {/* Blobs décoratifs */}
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-[#2E8B57]/8 dark:bg-[#2E8B57]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-5%] w-96 h-96 bg-blue-400/5 dark:bg-[#1a3a6e]/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#2E8B57]/3 dark:bg-[#071324]/0 rounded-full blur-3xl pointer-events-none" />
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full py-5 text-center text-sm text-gray-400 dark:text-[#4a6a8a] bg-white dark:bg-[#0a1d38] border-t border-green-100 dark:border-[#1a3a6e]">
        <p className="font-medium">© 2026 e-Dr TIM Pharmacy. Tous droits réservés.</p>
        <div className="mt-2 space-x-4">
          <a className="hover:text-[#2E8B57] transition-colors" href="#">
            Politique de confidentialité
          </a>
          <span className="text-gray-200 dark:text-[#1a3a6e]">|</span>
          <a className="hover:text-[#2E8B57] transition-colors" href="#">
            Conditions d&apos;utilisation
          </a>
        </div>
      </footer>
    </div>
  );
}
