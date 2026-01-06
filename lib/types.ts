export type UserRole = 'user' | 'merchant' | 'USER' | 'MERCHANT';

export interface Profile {
  id: string;
  role: UserRole;
  spa_id: string | null;
  merchant_code: string | null;
}

export interface MerchantProfile {
  id: string;
  role: UserRole;
  merchant_code: string | null;
}

export interface Spa {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
}

export interface TransactionRecord {
  id: string;
  user_id: string;
  merchant_id: string | null;
  spa_id: string | null;
  amount: number;
  cashback_total: number | null;
  donation_amount: number | null;
  cashback_to_user: number | null;
  donation_sent: boolean | null;
  status: string | null;
  created_at: string;
}
