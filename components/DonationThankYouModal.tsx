"use client";

import { useEffect } from "react";

interface DonationThankYouModalProps {
  open: boolean;
  onClose: () => void;
}

export default function DonationThankYouModal({ open, onClose }: DonationThankYouModalProps) {
  // Fermeture auto après 3 secondes
  useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: "#FFFFFB",
          borderRadius: "20px",
          padding: "20px 18px 18px",
          width: "90%",
          maxWidth: "360px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          textAlign: "center",
        }}
      >
        {/* ✅ GIF: <img> (pas next/image) + cache bust */}
        <div style={{ marginBottom: 12 }}>
          <img
            src="/goat-thankyou.gif?v=3"
            alt="Les petits loups vous remercient pour votre don !"
            style={{
              width: 260,
              height: 260,
              borderRadius: 16,
              objectFit: "contain",
              display: "block",
              margin: "0 auto",
              backgroundColor: "transparent",
            }}
          />
        </div>

        {/* Texte principal */}
        <p
          style={{
            fontWeight: 700,
            fontSize: 18,
            margin: "0 0 6px",
            color: "#222222",
          }}
        >
          Les petits loups vous remercient pour votre don !
        </p>

        {/* Texte secondaire */}
        <p style={{ fontSize: 14, margin: 0, color: "#555555" }}>
          Grâce à vous, les animaux des refuges locaux sont un peu mieux soutenus.
        </p>
      </div>
    </div>
  );
}
