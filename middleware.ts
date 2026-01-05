import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const protectedPaths = ['/dashboard', '/scan', '/transactions', '/merchant', '/settings'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers
    }
  });

  const supabase = createServerClient(
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

  const {
    data: profile,
    error: profileError
  } = await supabase.from('profiles').select('role').eq('id', data.session.user.id).single();

  if (profileError) {
    return response;
  }

  const pathname = request.nextUrl.pathname;

  if (profile.role === 'merchant' && ['/dashboard', '/scan', '/transactions'].some((path) => pathname.startsWith(path))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/merchant';
    return NextResponse.redirect(redirectUrl);
  }

  if (profile.role === 'client' && pathname.startsWith('/merchant')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/scan/:path*', '/transactions/:path*', '/merchant/:path*', '/settings/:path*']
};
