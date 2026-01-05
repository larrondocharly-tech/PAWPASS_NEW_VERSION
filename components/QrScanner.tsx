'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/browser';

interface QrScannerProps {
  onResult: (value: string) => void;
}

export default function QrScanner({ onResult }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isStartingRef = useRef(false);
  const isActiveRef = useRef(false);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = async () => {
    console.debug('[QrScanner] stop called');
    readerRef.current?.reset();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    isActiveRef.current = false;
    isStartingRef.current = false;
    setActive(false);
  };

  const startScanner = async () => {
    if (isStartingRef.current || isActiveRef.current) {
      return;
    }

    setError(null);
    if (!videoRef.current) return;
    isStartingRef.current = true;
    console.debug('[QrScanner] start camera called');

    try {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(isMobile ? { facingMode: { ideal: 'environment' } } : {})
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      console.debug('[QrScanner] stream tracks', stream.getTracks().length);
      videoRef.current.srcObject = stream;

      await new Promise<void>((resolve) => {
        if (!videoRef.current) {
          resolve();
          return;
        }
        videoRef.current.onloadedmetadata = () => resolve();
      });

      await videoRef.current.play();
      console.debug('[QrScanner] video readyState', videoRef.current.readyState);

      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }

      isActiveRef.current = true;
      isStartingRef.current = false;
      setActive(true);

      readerRef.current.decodeFromVideoElement(videoRef.current, (result, err) => {
        if (result) {
          console.debug('[QrScanner] result detected');
          onResult(result.getText());
          void stopScanner();
          return;
        }

        if (err && !(err instanceof NotFoundException)) {
          console.error('[QrScanner] decode error', err);
          setError('Impossible de lire le QR code.');
        }
      });
    } catch (scanError) {
      console.error('[QrScanner] camera error', scanError);
      if (scanError instanceof DOMException) {
        if (scanError.name === 'NotAllowedError') {
          setError('Permission caméra refusée.');
        } else if (scanError.name === 'NotFoundError') {
          setError('Aucune caméra détectée.');
        } else {
          setError('Accès caméra indisponible.');
        }
      } else {
        setError('Accès caméra indisponible.');
      }
      await stopScanner();
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
