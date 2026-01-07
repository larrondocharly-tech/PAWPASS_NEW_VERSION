import Link from 'next/link';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container site-footer-inner">
        <span style={{ color: '#64748b' }}>© PawPass {year}</span>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span aria-hidden="true" style={{ color: '#f3d9a4' }}>
            ●
          </span>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/cgu">CGU</Link>
        </div>
      </div>
    </footer>
  );
}
