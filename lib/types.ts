export type UserRole = 'client' | 'merchant';

export interface Profile {
  id: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
}

export interface Merchant {
  id: string;
  name: string;
  qr_token: string;
  cashback_percent: number;
  threshold_ticket: number;
}

export interface Association {
  id: string;
  name: string;
  active: boolean;
}

export interface TransactionRecord {
  id: string;
  amount: number;
  cashback_amount: number;
  status: string;
  created_at: string;
  merchant?: { name: string } | null;
}
