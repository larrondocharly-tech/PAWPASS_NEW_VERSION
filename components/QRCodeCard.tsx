'use client';

import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeCardProps {
  value: string;
  title: string;
}

export default function QRCodeCard({ value, title }: QRCodeCardProps) {
  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <h3>{title}</h3>
      <QRCodeCanvas value={value} size={220} includeMargin />
      <p className="helper">Scannez ce QR pour initier un cashback.</p>
      <input className="input" value={value} readOnly />
    </div>
  );
}
