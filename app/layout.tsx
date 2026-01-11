// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import SiteFooter from "@/components/SiteFooter";
import { Inter } from "next/font/google";
import TopNav from "@/components/TopNav";

// Police Inter une seule fois
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PawPass",
  description: "Cashback solidaire pour les clients et commerçants.",
  manifest: "/manifest.webmanifest",
  themeColor: "#00c896",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body className="bg-[#FAFAF5] min-h-screen">

        {/* --- VERSION MOBILE --- */}
        <div className="block md:hidden min-h-screen flex flex-col">
          <TopNav />
          <main className="flex-1 px-4 py-4">{children}</main>
          <SiteFooter />
        </div>

        {/* --- VERSION DESKTOP --- */}
        <div className="hidden md:flex min-h-screen flex-col">
          <TopNav />
          <main className="flex-1 px-8 py-8 max-w-5xl w-full mx-auto">
            {children}
          </main>
          <SiteFooter />
        </div>

      </body>
    </html>
  );
}
