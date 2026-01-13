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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body
        style={{
          margin: 0,
          backgroundColor: "#FAFAF5",
        }}
      >
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header affiché selon la route */}
          <ClientHeader />

          {/* Contenu des pages */}
          <main style={{ flex: 1 }}>{children}</main>

          {/* Footer global */}
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
