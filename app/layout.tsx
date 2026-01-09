// app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import SiteFooter from '@/components/SiteFooter';
import { Inter } from 'next/font/google';

// On charge INTER une bonne fois pour toutes
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700'],
});

export const metadata = {
  title: 'PawPass',
  description: 'Cashback solidaire pour les clients et commerçants.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
