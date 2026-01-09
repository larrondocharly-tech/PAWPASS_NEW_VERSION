import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Middleware TEMPORAIRE : on laisse tout passer, aucune vérification d'auth
  return NextResponse.next();
}

export const config = {
  // On applique le middleware partout, mais il ne fait rien à part laisser passer
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
