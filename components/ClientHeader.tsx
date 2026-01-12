"use client";

import { usePathname } from "next/navigation";
import TopNav from "@/components/TopNav";

const hiddenHeaderRoutes = ["/", "/login", "/register"];

export function ClientHeader() {
  const pathname = usePathname();

  if (hiddenHeaderRoutes.includes(pathname)) {
    return null;
  }

  return <TopNav />;
}
