import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import FCMInitializer from "@/components/FCMInitializer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "e-Dr TIM Delivery",
  description: "Application de livraison e-Dr TIM — Gestion des livreurs",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        {/* Leaflet CSS */}
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body
        className={`${inter.variable} antialiased bg-[#F8FAFC] text-[#1E293B]`}
        style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}
      >
        {children}
        <FCMInitializer />
      </body>
    </html>
  );
}
