// lib/bank/provider.ts

export type BankTx = {
  provider_tx_id: string;
  booked_at: string;
  amount: number;
  currency: string;
  raw_descriptor: string;
};

export type BankProvider = {
  createConnectionLink(args: {
    user_id: string;
    user_email: string;
    redirect: string;
  }): Promise<{ requisition_id: string; link: string }>;

  completeConnection(args: {
    requisition_id: string;
    user_id?: string;
    user_email?: string;
  }): Promise<{ accounts: string[] }>;

  fetchBookedTransactions(args: {
    account_id: string;
    user_id?: string;
    user_email?: string;
  }): Promise<BankTx[]>;
};

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

async function safeJson(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

const BRIDGE_BASE_URL = "https://api.bridgeapi.io";
const BRIDGE_VERSION = "2025-01-15";

function bridgeBaseHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "Bridge-Version": BRIDGE_VERSION,
    "Client-Id": requiredEnv("BRIDGE_CLIENT_ID"),
    "Client-Secret": requiredEnv("BRIDGE_CLIENT_SECRET"),
  };
}

async function bridgeFetch(
  path: string,
  init?: RequestInit,
  accessToken?: string
) {
  const headers: Record<string, string> = {
    ...bridgeBaseHeaders(),
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(`${BRIDGE_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await safeJson(res);
    throw new Error(
      `Bridge ${res.status} ${res.statusText}: ${JSON.stringify(body)}`
    );
  }

  return res;
}

type BridgeUser = {
  uuid: string;
  external_user_id?: string;
};

type BridgeAuthResponse = {
  access_token: string;
  expires_at?: string;
  user?: BridgeUser;
};

type BridgeConnectSession = {
  id: string;
  url: string;
};

type BridgeAccountsInformationResponse = {
  resources?: Array<{
    item_id?: number | string;
    first_name?: string;
    last_name?: string;
    accounts?: Array<{
      id?: number | string;
      name?: string;
      iban?: string;
      type?: string;
      currency_code?: string;
      provider_id?: number | string;
    }>;
  }>;
};

type BridgeTransaction = {
  id: number | string;
  amount: number | string;
  currency_code?: string;
  booked_at?: string;
  booking_date?: string;
  date?: string;
  updated_at?: string;
  clean_description?: string;
  cleaned_description?: string;
  provider_description?: string;
  bank_description?: string;
  description?: string;
};

function cleanStringIds(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .map((v) => String(v ?? "").trim())
        .filter((v) => !!v && v !== "undefined" && v !== "null")
    )
  );
}

async function createBridgeUserIfNeeded(userId: string) {
  const res = await fetch(`${BRIDGE_BASE_URL}/v3/aggregation/users`, {
    method: "POST",
    headers: bridgeBaseHeaders(),
    body: JSON.stringify({
      external_user_id: userId,
    }),
    cache: "no-store",
  });

  if (res.ok) return;

  if (res.status === 409 || res.status === 422) return;

  const body = await safeJson(res);
  throw new Error(`Bridge user create ${res.status}: ${JSON.stringify(body)}`);
}

async function getBridgeUserAccessToken(
  userId: string
): Promise<{ accessToken: string; user?: BridgeUser }> {
  let authRes = await fetch(
    `${BRIDGE_BASE_URL}/v3/aggregation/authorization/token`,
    {
      method: "POST",
      headers: bridgeBaseHeaders(),
      body: JSON.stringify({
        external_user_id: userId,
      }),
      cache: "no-store",
    }
  );

  if (authRes.status === 404 || authRes.status === 401) {
    await createBridgeUserIfNeeded(userId);

    authRes = await fetch(
      `${BRIDGE_BASE_URL}/v3/aggregation/authorization/token`,
      {
        method: "POST",
        headers: bridgeBaseHeaders(),
        body: JSON.stringify({
          external_user_id: userId,
        }),
        cache: "no-store",
      }
    );
  }

  if (!authRes.ok) {
    const body = await safeJson(authRes);
    throw new Error(`Bridge auth ${authRes.status}: ${JSON.stringify(body)}`);
  }

  const authJson = (await authRes.json()) as BridgeAuthResponse;

  if (!authJson.access_token) {
    throw new Error("Bridge auth response missing access_token");
  }

  return {
    accessToken: authJson.access_token,
    user: authJson.user,
  };
}

const mockProvider: BankProvider = {
  async createConnectionLink({ user_id, redirect }) {
    const id = `req_${Date.now()}`;
    return {
      requisition_id: id,
      link: `${redirect}?mock=1&req=${id}&user=${user_id}`,
    };
  },

  async completeConnection({ requisition_id }) {
    return { accounts: [`acc_${requisition_id}_1`] };
  },

  async fetchBookedTransactions({ account_id }) {
    const now = Date.now();
    return [
      {
        provider_tx_id: `tx_${account_id}_1`,
        booked_at: new Date(now - 3600000).toISOString(),
        amount: 12.5,
        currency: "EUR",
        raw_descriptor: "BOULANGERIE DUPONT BAYONNE",
      },
    ];
  },
};

const bridgeProvider: BankProvider = {
  async createConnectionLink({ user_id, user_email, redirect }) {
    const { accessToken } = await getBridgeUserAccessToken(user_id);

    const res = await bridgeFetch(
      "/v3/aggregation/connect-sessions",
      {
        method: "POST",
        body: JSON.stringify({
          user_email,
          callback_url: redirect,
        }),
      },
      accessToken
    );

    const data = (await res.json()) as BridgeConnectSession;

    if (!data?.id || !data?.url) {
      throw new Error("Bridge connect session missing id/url");
    }

    return {
      requisition_id: String(data.id),
      link: data.url,
    };
  },

  async completeConnection({ user_id }) {
    if (!user_id) {
      throw new Error("BRIDGE_USER_ID_MISSING");
    }

    const { accessToken } = await getBridgeUserAccessToken(user_id);

    const res = await bridgeFetch(
      "/v3/aggregation/accounts-information",
      { method: "GET" },
      accessToken
    );

    const data = (await res.json()) as BridgeAccountsInformationResponse;

    const rawIds =
      data.resources?.flatMap((resource) =>
        (resource.accounts || []).map((account) => account.id)
      ) || [];

    const accounts = cleanStringIds(rawIds);

    return { accounts };
  },

  async fetchBookedTransactions({ account_id, user_id }) {
    if (!user_id) {
      throw new Error("BRIDGE_USER_ID_MISSING");
    }

    if (!account_id || account_id === "undefined" || account_id === "null") {
      throw new Error("BRIDGE_ACCOUNT_ID_MISSING");
    }

    const { accessToken } = await getBridgeUserAccessToken(user_id);

    const res = await bridgeFetch(
      `/v3/aggregation/transactions?account_id=${encodeURIComponent(
        String(account_id)
      )}&limit=500`,
      { method: "GET" },
      accessToken
    );

    const data = (await res.json()) as { resources?: BridgeTransaction[] };
    const txs = data.resources || [];

    return txs
      .map((t) => {
        const rawAmount = Number(t.amount || 0);
        if (!Number.isFinite(rawAmount) || rawAmount === 0) return null;

        return {
          provider_tx_id: String(t.id),
          booked_at: new Date(
            t.booked_at ||
              t.booking_date ||
              t.date ||
              t.updated_at ||
              new Date().toISOString()
          ).toISOString(),
          amount: Math.abs(rawAmount),
          currency: t.currency_code || "EUR",
          raw_descriptor:
            t.clean_description ||
            t.cleaned_description ||
            t.provider_description ||
            t.bank_description ||
            t.description ||
            "unknown",
        } satisfies BankTx;
      })
      .filter((x): x is BankTx => Boolean(x));
  },
};

export async function getBankProvider(): Promise<BankProvider> {
  const mode = (process.env.BANK_PROVIDER || "mock").toLowerCase();

  if (mode === "mock") return mockProvider;
  if (mode === "bridge") return bridgeProvider;

  throw new Error(`Unsupported BANK_PROVIDER=${mode}`);
}