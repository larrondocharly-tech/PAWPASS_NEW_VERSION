"use client";

import { usePathname } from "next/navigation";
import TopNav from "@/components/TopNav";

// Routes où le header NE doit PAS s'afficher
const hiddenHeaderRoutes = ["/", "/login", "/register"];

export function ClientHeader() {
  const pathname = usePathname();

  // Masquer le TopNav entièrement sur mobile landing page/login/register
  if (hiddenHeaderRoutes.includes(pathname)) {
    return null;
  }

  return <TopNav />;
}
