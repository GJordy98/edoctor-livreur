import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { ThemeProvider } from "@/context/ThemeContext";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "e-Dr TIM Delivery",
  description: "Application de livraison e-Dr TIM — Gestion des livreurs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Script de thème : s'exécute avant React pour éviter le flash et la hydration mismatch */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('edr_theme');
            if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            if (t === 'dark') document.documentElement.classList.add('dark');
          } catch(e) {}
        ` }} />
        {/* Material Icons */}
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${outfit.variable} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
