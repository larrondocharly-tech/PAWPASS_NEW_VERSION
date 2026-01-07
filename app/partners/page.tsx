'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import TopNav from '@/components/TopNav';

interface MerchantPartner {
  id: string;
  name?: string | null;
  city?: string | null;
  description?: string | null;
  category?: string | null;
  is_active?: boolean | null;
}

export default function PartnersPage() {
  const supabase = createClient();
  const [partners, setPartners] = useState<MerchantPartner[]>([]);
  const [selectedCity, setSelectedCity] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPartners = async () => {
      setError(null);
      setLoading(true);

      const { data, error: fetchError } = await supabase.from('merchants').select('*');

      if (fetchError) {
        setError(fetchError.message);
        setPartners([]);
        setLoading(false);
        return;
      }

      const rows = (data as MerchantPartner[]) ?? [];
      const filtered = rows.filter((row) => row.is_active !== false);
      setPartners(filtered);
      setLoading(false);
    };

    void loadPartners();
  }, [supabase]);

  const cities = useMemo(() => {
    const distinct = new Set(
      partners
        .map((partner) => partner.city?.trim())
        .filter((city): city is string => Boolean(city))
    );
    return Array.from(distinct).sort((a, b) => a.localeCompare(b));
  }, [partners]);

  const visiblePartners = useMemo(() => {
    if (!selectedCity) return partners;
    return partners.filter((partner) => partner.city === selectedCity);
  }, [partners, selectedCity]);

  return (
    <main className="container">
      <TopNav title="Nos commerçants partenaires" />

      <section className="card" style={{ marginBottom: 24 }}>
        <h1>Nos commerçants partenaires</h1>
        <p className="helper">
          Découvrez les commerces qui participent au programme PawPass et vous permettent de gagner
          des crédits ou de soutenir les SPA.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 24 }}>
        <label className="label" htmlFor="cityFilter">
          Filtrer par ville
          <select
            id="cityFilter"
            className="select"
            value={selectedCity}
            onChange={(event) => setSelectedCity(event.target.value)}
          >
            <option value="">Toutes les villes</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </label>
      </section>

      {loading && <p className="helper">Chargement des partenaires…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && visiblePartners.length === 0 && (
        <p className="helper">Pas encore de commerces partenaires.</p>
      )}

      <section className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        {visiblePartners.map((partner) => (
          <div key={partner.id} className="card" style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0 }}>{partner.name ?? 'Commerçant partenaire'}</h3>
            <p className="helper" style={{ marginTop: 4 }}>
              {partner.city ?? 'Ville non renseignée'}
            </p>
            <p style={{ marginTop: 12 }}>
              {partner.description ?? partner.category ?? 'Commerce partenaire PawPass.'}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
