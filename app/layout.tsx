// app/layout.tsx
"use client";

import "./globals.css";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import TopNav from "@/components/TopNav";
import SiteFooter from "@/components/SiteFooter";
import { usePathname } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Pages où le header doit être masqué
  const hiddenHeaderRoutes = ["/", "/login"];

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
          {/* Masquer TopNav sur certaines pages */}
          {!hiddenHeaderRoutes.includes(pathname) && <TopNav />}

          <main style={{ flex: 1 }}>{children}</main>

          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
