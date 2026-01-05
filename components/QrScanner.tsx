'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser';

interface QrScannerProps {
  onResult: (value: string) => void;
}

export default function QrScanner({ onResult }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = async () => {
    readerRef.current?.reset();
    readerRef.current = null;
    setActive(false);
  };

  const startScanner = async () => {
    setError(null);
    if (!videoRef.current) return;

    try {
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setActive(true);
      await reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
        if (result) {
          onResult(result.getText());
          void stopScanner();
        }

        if (err && !(err instanceof NotFoundException)) {
          setError('Impossible de lire le QR code.');
        }
      });
    } catch (scanError) {
      setError('Accès caméra refusé ou indisponible.');
      setActive(false);
    }
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
  }, []);

  return (
    <div className="card">
      <h3>Scanner le QR code</h3>
      <p className="helper">Autorisez la caméra pour scanner automatiquement le QR commerçant.</p>
      <div style={{ marginTop: 12 }}>
        {!active ? (
          <button className="button" type="button" onClick={() => void startScanner()}>
            Activer la caméra
          </button>
        ) : (
          <button className="button secondary" type="button" onClick={() => void stopScanner()}>
            Arrêter la caméra
          </button>
        )}
      </div>
      <div style={{ marginTop: 12 }}>
        <video
          ref={videoRef}
          style={{ width: '100%', borderRadius: 12, background: '#0f172a' }}
        />
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
