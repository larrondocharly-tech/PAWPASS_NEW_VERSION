"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";


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
    const reader = readerRef.current as
      | { reset?: () => void; stop?: () => void; stopContinuousDecode?: () => void }
      | null;

    try {
      if (reader?.reset) reader.reset();
      else if (reader?.stop) reader.stop();
      else if (reader?.stopContinuousDecode) reader.stopContinuousDecode();
    } catch {
      // ignore
    }

    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    } catch {
      // ignore
    }

    streamRef.current = null;

    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
      videoRef.current.srcObject = null;
    }

    isActiveRef.current = false;
    isStartingRef.current = false;
    setActive(false);
  };

  const startScanner = async () => {
    if (isStartingRef.current || isActiveRef.current) return;
    if (!videoRef.current) return;

    setError(null);
    isStartingRef.current = true;

    try {
      // iOS/Safari: évite fullscreen + autorise autoplay
      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.muted = true;

      const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(isMobile ? { facingMode: { ideal: "environment" } } : {}),
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      await new Promise<void>((resolve) => {
        const v = videoRef.current;
        if (!v) return resolve();
        if (v.readyState >= 2) return resolve(); // déjà prêt
        v.onloadedmetadata = () => resolve();
      });

      await videoRef.current.play();

      if (!readerRef.current) readerRef.current = new BrowserMultiFormatReader();

      isActiveRef.current = true;
      isStartingRef.current = false;
      setActive(true);

      readerRef.current.decodeFromVideoElement(videoRef.current, (result, err) => {
        if (result) {
          onResult(result.getText());
          void stopScanner();
          return;
        }

        // On ignore “pas trouvé” (ça spam)
        if (err instanceof NotFoundException) return;

        const errName = (err as { name?: string } | null | undefined)?.name;
        if (err && errName !== "NotFoundException") {
          console.error("[QrScanner] decode error", err);
          setError("Impossible de lire le QR code.");
        }
      });
    } catch (scanError) {
      console.error("[QrScanner] camera error", scanError);

      if (scanError instanceof DOMException) {
        if (scanError.name === "NotAllowedError") setError("Permission caméra refusée.");
        else if (scanError.name === "NotFoundError") setError("Aucune caméra détectée.");
        else setError("Accès caméra indisponible.");
      } else {
        setError("Accès caméra indisponible.");
      }

      await stopScanner();
    }
  };

  useEffect(() => {
    return () => {
      void stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="card">
      <h3>Scanner le QR code</h3>
      <p className="helper">
        Autorisez la caméra pour scanner automatiquement le QR commerçant.
      </p>

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
          style={{ width: "100%", borderRadius: 12, background: "#0f172a" }}
        />
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}
