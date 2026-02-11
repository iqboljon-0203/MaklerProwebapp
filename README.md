# 🏠 MaklerPro - Ko'chmas Mulk AI Yordamchisi

> **Telegram Mini App** - Realtor'lar uchun maxsus watermark, AI tavsiflar va video generator

## 🚀 O'rnatish

### 1. Dependencies o'rnatish
```bash
npm install
```

### 2. Environment Variables
`.env.example` dan `.env` ga nusxa oling va qiymatlarni to'ldiring:
```bash
cp .env.example .env
```

Kerakli qiymatlar:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `TELEGRAM_BOT_TOKEN` - Telegram Bot token
- `DEEPSEEK_API_KEY` - DeepSeek AI API key

### 3. Supabase Setup

Supabase Dashboard → SQL Editor da quyidagi migration fayllarini **ketma-ket** ishga tushiring:

1. `supabase/migrations/20240520_payment_setup.sql`
2. `supabase/migrations/20240521_video_jobs.sql`
3. `supabase/migrations/20240522_cleanup_logs.sql`
4. `supabase/migrations/20240523_pg_cron_setup.sql` (pg_cron kerak)
5. `supabase/migrations/20240524_custom_watermarks.sql`
6. `supabase/migrations/20240525_share_analytics.sql`
7. `supabase/migrations/20260205_create_history_bucket.sql`

⚠️ **Muhim:** `pg_cron` extension faqat Supabase Pro+ planlarda mavjud.

### 4. Development Server
```bash
npm run dev
```

### 5. Vercel Deployment
```bash
vercel deploy
```

## 📱 Xususiyatlar

### ✅ Ishlaydi
- **Magic Fix (Enhance)** - Rasmlarni yaxshilash va watermark qo'shish
- **AI Writer** - Ko'chmas mulk uchun AI tavsiflar generatsiyasi
- **Video Generator** - 9:16 formatida slideshow videolar (brauzerda)
- **Galereya** - Yaratilgan kontentlarni ko'rish
- **Branding Settings** - Shaxsiy watermark sozlamalari
- **Offline Banner** - Internet ulanishini ko'rsatish
- **Premium Modal** - Pro sotib olish oynasi
- **Daily Reset** - Kunlik limitlar avtomatik tiklanadi

### ⏳ Hali ishlamaydi / Keyingi sprint
- **To'lov integratsiyasi** - PayMe, Click, Telegram Stars
- **Shotstack Video** - Server-side professional video
- **Push Notifications** - Telegram bot xabarlari
- **i18n** - Rus va ingliz tillari

## 🗂️ Loyiha Tuzilmasi

```
MaklerPro/
├── api/                     # Vercel Serverless Functions
│   ├── bot-webhook.ts       # Telegram bot webhook
│   ├── generate-description.ts  # AI API
│   ├── generate-video.ts    # Video API (Shotstack)
│   └── payment-webhook.ts   # To'lov webhook
├── src/
│   ├── components/
│   │   ├── features/        # Asosiy komponentlar
│   │   └── ui/              # UI elementlar
│   ├── services/            # API va biznes logika
│   ├── store/               # Zustand state management
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities
│   └── types/               # TypeScript types
└── supabase/
    └── migrations/          # Database migrations
```

## 🔐 Xavfsizlik

- `.env` fayli **hech qachon** git ga commit qilinmasligi kerak
- Barcha API kalitlari Vercel Environment Variables da saqlanishi kerak
- Supabase RLS (Row Level Security) yoqilgan

## 📞 Yordam

Savollar bo'lsa: [@MaklerProSupport](https://t.me/MaklerProSupport)

---

Made with ❤️ for Uzbekistan Realtors
