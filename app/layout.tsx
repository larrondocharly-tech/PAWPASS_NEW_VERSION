import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'PawPass',
  description: 'Cashback solidaire pour les clients et commerçants.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
