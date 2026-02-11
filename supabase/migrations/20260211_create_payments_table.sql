-- AGAR eski jadval bo'lsa, uni o'chirib tashlaymiz (toza boshlash uchun)
DROP TABLE IF EXISTS public.payments;

-- Yangi jadval yaratish
CREATE TABLE public.payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    telegram_id TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'stars'
    amount INTEGER NOT NULL,
    currency TEXT NOT NULL, -- 'XTR'
    payment_id TEXT UNIQUE NOT NULL, -- Telegram payment_charge_id
    status TEXT NOT NULL DEFAULT 'paid',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indekslar
CREATE INDEX idx_payments_telegram_id ON public.payments(telegram_id);
