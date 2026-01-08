import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const protectedPaths = [
  '/dashboard',
  '/scan',
  '/transactions',
  '/merchant',
  '/settings',
  '/admin',
  '/refuge'
];

const createMiddlewareClient = (request: NextRequest, response: NextResponse) =>
  createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options });
        }
      }
    }
  );

const getRoleFromSession = async (
  supabase: ReturnType<typeof createServerClient>,
  user: { id: string } | null
) => {
  if (!user) {
    return 'user';
  }

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
  return data?.role?.toLowerCase() ?? 'user';
};

const canAccessPath = (pathname: string, role: string) => {
  if (pathname.startsWith('/admin')) {
    return role === 'admin';
  }
  if (pathname.startsWith('/merchant')) {
    return role === 'merchant' || role === 'admin';
  }
  if (pathname.startsWith('/refuge')) {
    return role === 'admin';
  }
  if (
    ['/dashboard', '/settings', '/scan', '/transactions'].some((path) => pathname.startsWith(path))
  ) {
    return true;
  }
  return true;
};

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createMiddlewareClient(request, response);

  const { data } = await supabase.auth.getSession();
  const isProtected = protectedPaths.some((path) => request.nextUrl.pathname.startsWith(path));

  if (!data.session && isProtected) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  if (!data.session) {
    return response;
  }

  const role = await getRoleFromSession(supabase, data.session.user);
  const pathname = request.nextUrl.pathname;

  // Redirect authenticated users who try to access a role-protected route they don't own.
  if (isProtected && !canAccessPath(pathname, role)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/scan/:path*',
    '/transactions/:path*',
    '/merchant/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/refuge/:path*'
  ]
};
