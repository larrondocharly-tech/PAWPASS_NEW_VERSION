import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

const protectedPaths = [
  "/dashboard",
  "/transactions",
  "/merchant",
  "/settings",
  "/admin",
  "/scan",
  "/refuge",
  "/partners",
];

const createMiddlewareClient = (request: NextRequest, response: NextResponse) =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

function getRoleFromSession(session: Session | null): "user" | "merchant" | "admin" {
  if (!session) return "user";

  const user = session.user;
  const userMeta = (user.user_metadata ?? {}) as any;
  const appMeta = (user.app_metadata ?? {}) as any;

  let role: string | undefined = userMeta.role || appMeta.role;

  // Flag possible dans app_metadata
  if (!role && appMeta.is_admin) {
    role = "admin";
  }

  // Fallback : email admin
  if (!role && user.email === "admin@admin.com") {
    role = "admin";
  }

  if (role === "merchant") return "merchant";
  if (role === "admin") return "admin";
  return "user";
}

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createMiddlewareClient(request, response);

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;

  const isProtected = protectedPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // Pas de session + route protégée → /login
  if (!session && isProtected) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Pas de session + route publique → ok
  if (!session) {
    return response;
  }

  const role = getRoleFromSession(session);

  // Admin only
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Merchant only
  if (pathname.startsWith("/merchant") && role !== "merchant") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
