import './globals.css';
import type { ReactNode } from 'react';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: 'PawPass',
  description: 'Cashback solidaire pour les clients et commerçants.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
