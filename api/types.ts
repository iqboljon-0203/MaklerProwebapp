import { Context, SessionFlavor } from 'grammy';

export interface DBUser {
  id: string; // UUID from Supabase
  telegram_id: string; //  telegram_id: string;
  first_name: string;
  username: string | null;
  language_code: string;
  is_premium: boolean;
  premium_expires_at: string | null; // Database TIMESTAMPTZ is string in JSON
  daily_generations: number;
  max_daily_generations: number;
  last_active: string; // ISO timestamp
  created_at: string;
}

export interface PaymentRecord {
  id?: string;
  telegram_id: string;
  provider: 'stars'; 
  amount: number;
  currency: 'XTR';
  payment_id: string;
  status: 'paid';
  created_at?: string;
  metadata?: any;
}

// Custom Context Type
export interface BotContext extends Context {
  // Use DBUser for authenticated logic
  user?: DBUser;
  // If using sessions:
  // session: SessionData;
}
