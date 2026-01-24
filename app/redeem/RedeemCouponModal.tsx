"use client";

import { useEffect, useMemo, useState } from "react";

function format2(n: number) {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function RedeemCouponModal(props: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;

  merchantName: string;
  discountEur: number;
  expiresAtIso: string; // ISO string
}) {
  const { open, onClose, onConfirm, merchantName, discountEur, expiresAtIso } = props;

  const expiresAt = useMemo(() => new Date(expiresAtIso).getTime(), [expiresAtIso]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [open]);

  if (!open) return null;

  const msLeft = Math.max(0, expiresAt - now);
  const totalSeconds = Math.floor(msLeft / 1000);
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  const expired = msLeft <= 0;

  const dateStr = new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleConfirm = async () => {
    if (expired) return;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15,23,42,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 520,
          background: "rgba(255,255,255,0.98)",
          borderRadius: 18,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.28)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#fb7185", letterSpacing: "0.08em" }}>
              COUPON TEMPORAIRE
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>
              À montrer au commerçant
            </div>
          </div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 22, cursor: "pointer" }}>
            ×
          </button>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          <div style={{ padding: 14, borderRadius: 14, border: "1px solid rgba(15,23,42,0.08)", background: "#fff" }}>
            <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 700 }}>Commerce</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#111827" }}>{merchantName}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>Généré le {dateStr}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ padding: 14, borderRadius: 14, background: "#f0f9ff", border: "1px solid rgba(2,132,199,0.18)" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#0ea5e9" }}>Réduction demandée</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a" }}>{format2(discountEur)} €</div>
            </div>

            <div style={{ padding: 14, borderRadius: 14, background: expired ? "#fee2e2" : "#ecfdf5", border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: expired ? "#b91c1c" : "#059669" }}>
                {expired ? "Expiré" : "Valable encore"}
              </div>
              <div style={{ fontSize: 30, fontWeight: 950, color: "#111827" }}>
                {pad2(mm)}:{pad2(ss)}
              </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#6b7280" }}>
                Le commerçant doit voir ce timer.
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={expired || busy}
            onClick={handleConfirm}
            style={{
              marginTop: 4,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "none",
              cursor: expired || busy ? "not-allowed" : "pointer",
              backgroundColor: expired ? "#e5e7eb" : "#16a34a",
              color: expired ? "#6b7280" : "#ffffff",
              fontWeight: 900,
              fontSize: 15,
            }}
          >
            {expired ? "Coupon expiré (rescanner)" : busy ? "Validation..." : "Valider"}
          </button>

          <button
            type="button"
            onClick={onClose}
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 14,
              border: "1px solid rgba(15,23,42,0.12)",
              cursor: "pointer",
              backgroundColor: "#ffffff",
              color: "#111827",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
