// app/layout.tsx
import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import SiteFooter from "@/components/SiteFooter";
import { ClientHeader } from "@/components/ClientHeader";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PawPass",
  description: "Cashback solidaire pour les clients et commerçants.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body style={{ margin: 0 }}>
        {/* ✅ HEADER EN DEHORS des wrappers (important pour que position:fixed tienne au scroll) */}
        <ClientHeader />

        {/* Fond global + overlay global */}
        <div className="client-dashboard-bg">
          <div className="client-dashboard-overlay">
            <div
              style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Espace respirable sous le header (centrage visuel) */}
              <div className="dashboard-hero-spacer" />

              {/* Contenu */}
              <main style={{ flex: 1 }}>{children}</main>

              {/* Footer */}
              <SiteFooter />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
