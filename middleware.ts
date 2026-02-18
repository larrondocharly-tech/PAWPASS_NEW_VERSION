import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// /scan DOIT RESTER PUBLIC (sinon tu bloques les visiteurs qui scannent)
const PROTECTED_PREFIXES = [
  "/admin",
  "/merchant",
  "/spa",
  "/dashboard",
  "/transactions",
  // "/scan",  // ✅ retiré
  "/settings",
  "/referral",
  "/parrainage",
  "/redeem",
];

const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function isAuthPage(pathname: string) {
  return AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Laisse passer assets / internes
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  // ✅ /scan toujours autorisé
  if (pathname === "/scan" || pathname.startsWith("/scan/")) {
    return NextResponse.next();
  }

  const needsAuth = isProtectedPath(pathname);
  const onAuthPage = isAuthPage(pathname);

  if (!needsAuth && !onAuthPage) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthed = !!user;

  // Protégé + pas connecté => redirect login
  if (needsAuth && !isAuthed) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(loginUrl);
  }

  // Pages d'auth + déjà connecté => redirect dashboard
  if (onAuthPage && isAuthed) {
    const dashUrl = request.nextUrl.clone();
    dashUrl.pathname = "/dashboard";
    dashUrl.search = "";
    return NextResponse.redirect(dashUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
