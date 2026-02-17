// lib/bank/provider.ts
export type BankTx = {
  provider_tx_id: string;
  booked_at: string;     // ISO
  amount: number;        // dépense en positif (simplifie)
  currency: string;
  raw_descriptor: string;
};

export type BankProvider = {
  createConnectionLink(args: { user_id: string; redirect: string }): Promise<{ requisition_id: string; link: string }>;
  completeConnection(args: { requisition_id: string }): Promise<{ accounts: string[] }>;
  fetchBookedTransactions(args: { account_id: string }): Promise<BankTx[]>;
};

function makeId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

const mockProvider: BankProvider = {
  async createConnectionLink({ user_id, redirect }) {
    const requisition_id = makeId("req");
    // on simule un “lien” qui revient sur ton callback
    const link = `${redirect}?requisition_id=${encodeURIComponent(requisition_id)}&mock=1&user=${encodeURIComponent(user_id)}`;
    return { requisition_id, link };
  },

  async completeConnection({ requisition_id }) {
    // 2 comptes mock
    return { accounts: [`acc_${requisition_id}_1`, `acc_${requisition_id}_2`] };
  },

  async fetchBookedTransactions({ account_id }) {
    const now = Date.now();
    // Génère 5 transactions plausibles
    const sample: BankTx[] = [
      { provider_tx_id: makeId(`tx_${account_id}`), booked_at: new Date(now - 2 * 3600e3).toISOString(), amount: 12.5, currency: "EUR", raw_descriptor: "BOULANGERIE DUPONT BAYONNE CB" },
      { provider_tx_id: makeId(`tx_${account_id}`), booked_at: new Date(now - 26 * 3600e3).toISOString(), amount: 7.9, currency: "EUR", raw_descriptor: "CAFE DE LA MAIRIE ANGLET CB" },
      { provider_tx_id: makeId(`tx_${account_id}`), booked_at: new Date(now - 3 * 24 * 3600e3).toISOString(), amount: 24.2, currency: "EUR", raw_descriptor: "PHARMACIE CENTRALE BAYONNE" },
      { provider_tx_id: makeId(`tx_${account_id}`), booked_at: new Date(now - 6 * 24 * 3600e3).toISOString(), amount: 35.0, currency: "EUR", raw_descriptor: "BOUTIQUE ANIMAUX ST JEAN" },
      { provider_tx_id: makeId(`tx_${account_id}`), booked_at: new Date(now - 9 * 24 * 3600e3).toISOString(), amount: 18.3, currency: "EUR", raw_descriptor: "RESTAURANT TXIKI BIDART" },
    ];
    return sample;
  },
};

export async function getBankProvider(): Promise<BankProvider> {
  const mode = (process.env.BANK_PROVIDER || "mock").toLowerCase();
  if (mode === "mock") return mockProvider;

  // plus tard: mode === "gocardless" => tu branches le vrai provider
  throw new Error(`Unsupported BANK_PROVIDER=${mode}`);
}
