"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isMerchant, setIsMerchant] = useState(false);

  // Champs commerçant
  const [shopName, setShopName] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [siret, setSiret] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [infoMsg, setInfoMsg] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setInfoMsg("");
    setLoading(true);

    const role = isMerchant ? "merchant" : "user";

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          is_merchant: isMerchant,
          has_seen_tutorial: false,

          // Infos commerçant pour vérification admin
          merchant_name: isMerchant ? shopName : null,
          merchant_responsible_name: isMerchant ? responsibleName : null,
          merchant_address: isMerchant ? address : null,
          merchant_postal_code: isMerchant ? postalCode : null,
          merchant_city: isMerchant ? city : null,
          merchant_phone: isMerchant ? phone : null,
          merchant_siret: isMerchant ? siret : null,
          merchant_status: isMerchant ? "pending_validation" : null,
        },
      },
    });

    if (error) {
      setLoading(false);
      setErrorMsg(error.message);
      return;
    }

    const newUser = data.user;

    // ✅ CAS IMPORTANT: si la confirmation email est activée, data.session peut être null
    // Donc l'utilisateur n'est pas connecté -> on ne doit PAS l'envoyer sur /tutorial directement
    if (!data.session) {
      setLoading(false);

      setInfoMsg(
        "Compte créé. Vérifiez vos emails pour confirmer votre adresse, puis connectez-vous."
      );

      // Tu peux rediriger automatiquement vers /login après 1s (optionnel)
      setTimeout(() => {
        router.push("/login");
      }, 900);

      return;
    }

    // 2) Si commerçant : créer aussi une demande dans merchant_applications
    if (isMerchant && newUser?.id) {
      const { error: appError } = await supabase
        .from("merchant_applications")
        .insert({
          user_id: newUser.id,
          business_name: shopName,
          city: city,
          address: address,
          phone: phone,
          postal_code: postalCode,
          responsible_name: responsibleName,
          siret: siret,
          message: null,
          status: "pending",
        });

      if (appError) {
        console.error(appError);
        setLoading(false);
        setErrorMsg(
          "Votre compte a été créé, mais la demande commerçant n'a pas pu être enregistrée. Merci de contacter PawPass."
        );
        return;
      }
    }

    setLoading(false);

    const newRole = (data.user?.user_metadata as any)?.role || role;

    if (newRole === "merchant") {
      router.push("/merchant");
    } else if (newRole === "admin") {
      router.push("/admin");
    } else {
      router.push(`/tutorial?next=${encodeURIComponent("/dashboard")}`);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          backgroundColor: "white",
          borderRadius: 24,
          padding: 32,
          boxShadow: "0 12px 30px rgba(15,23,42,0.15)",
        }}
      >
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 8,
            color: "#0f172a",
          }}
        >
          Créer un compte
        </h1>
        <p style={{ color: "#64748b", marginBottom: 24 }}>
          Gagnez du cashback chez les commerçants partenaires et soutenez les
          refuges locaux.
        </p>

        <form onSubmit={handleRegister}>
          <label style={{ fontWeight: 600 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="vous@exemple.fr"
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              marginBottom: 16,
            }}
          />

          <label style={{ fontWeight: 600 }}>Mot de passe</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              marginBottom: 8,
            }}
          />
          <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 16 }}>
            6 caractères minimum. Tu pourras le modifier plus tard.
          </p>

          {/* Case commerçant */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <input
              type="checkbox"
              checked={isMerchant}
              onChange={(e) => setIsMerchant(e.target.checked)}
            />
            <span>Je suis commerçant et je souhaite proposer PawPass</span>
          </label>

          {/* Champs supplémentaires si commerçant */}
          {isMerchant && (
            <div
              style={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                padding: 16,
                marginBottom: 16,
                backgroundColor: "#f8fafc",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "#6b7280",
                  marginBottom: 12,
                }}
              >
                Ces informations permettent à l&apos;équipe PawPass de vérifier
                votre commerce. Votre compte commerçant sera d&apos;abord placé
                en attente de validation par un administrateur.
              </p>

              <label style={{ fontWeight: 600 }}>Nom du commerce</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required={isMerchant}
                placeholder="Ex : Boulangerie du Centre"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 12,
                }}
              />

              <label style={{ fontWeight: 600 }}>
                Nom et prénom du responsable
              </label>
              <input
                type="text"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
                required={isMerchant}
                placeholder="Ex : Marie Dupont"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 12,
                }}
              />

              <label style={{ fontWeight: 600 }}>Adresse du commerce</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required={isMerchant}
                placeholder="Numéro et rue"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 12,
                }}
              />

              <label style={{ fontWeight: 600 }}>Code postal</label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                required={isMerchant}
                placeholder="Ex : 64100"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 12,
                }}
              />

              <label style={{ fontWeight: 600 }}>Ville du commerce</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required={isMerchant}
                placeholder="Ex : Bayonne"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 12,
                }}
              />

              <label style={{ fontWeight: 600 }}>Numéro de téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required={isMerchant}
                placeholder="Ex : 06 12 34 56 78"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 12,
                }}
              />

              <label style={{ fontWeight: 600 }}>Numéro de SIRET</label>
              <input
                type="text"
                value={siret}
                onChange={(e) => setSiret(e.target.value)}
                required={isMerchant}
                placeholder="Ex : 123 456 789 00012"
                style={{
                  width: "100%",
                  padding: 10,
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  marginBottom: 4,
                }}
              />

              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>
                Ces données ne sont utilisées que pour la vérification de votre
                commerce et la lutte contre la fraude.
              </p>
            </div>
          )}

          {errorMsg && (
            <p style={{ color: "#b91c1c", marginBottom: 12 }}>{errorMsg}</p>
          )}

          {infoMsg && (
            <p style={{ color: "#065f46", marginBottom: 12 }}>{infoMsg}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 12,
              borderRadius: 999,
              border: "none",
              fontWeight: 600,
              backgroundColor: "#059669",
              color: "white",
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              marginBottom: 12,
            }}
          >
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>

        <p style={{ marginTop: 12, fontSize: 14 }}>
          Déjà un compte ?{" "}
          <a
            href="/login"
            style={{ color: "#059669", fontWeight: 600, textDecoration: "none" }}
          >
            Se connecter
          </a>
        </p>
      </div>
    </div>
  );
}
