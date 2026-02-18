# 🏠 MaklerPro - Professional Ko'chmas Mulk Yordamchisi

> **Telegram Mini App** - Realtor'lar uchun maxsus watermark, AI tavsiflar va video generator.
> Hozirda **DeepSeek V3** va **Google Gemini** sun'iy intellekt modellari bilan integratsiya qilingan.

![MaklerPro Banner](public/logo.svg)

## ✨ Asosiy Imkoniyatlar

### 1. 🎨 Magic Fix (Rasmlarni Tiniqlashtirish)
- **AI Enhancement:** Xira rasmlarni tiniqlashtiradi va ranglarini to'g'irlaydi.
- **Auto Watermark:** Agar "Branding" yoqilgan bo'lsa, avtomatik ravishda logotip va telefon raqamingizni qo'yadi.
- **Batch Processing:** Bir vaqtning o'zida ko'plab rasmlarni qayta ishlash.
- **Smart Toggle:** Har bir rasm uchun logotipni yoqish/o'chirish imkoniyati.

### 2. 📝 AI Copywriter (Tavsif Yozish)
- **Platformaga moslash:** Instagram, Telegram va OLX uchun alohida uslubda post yozib beradi.
- **Multilingual:** O'zbek va Rus tillarini to'liq qo'llab-quvvatlaydi.
- **i18n Errors:** Xatoliklar (masalan, limit tugashi) foydalanuvchi tilida aniq ko'rsatiladi.
- **Fallback Tizimi:** DeepSeek ishlamasa, avtomatik ravishda Google Gemini ga o'tadi.

### 3. 📱 PWA (Progressive Web App)
- **Installable:** Ilovani telefonga o'rnatib olish mumkin (Android/iOS).
- **Offline Mode:** Internet bo'lmaganda ham asosiy interfeys ochiladi.
- **Fast Loading:** Keshlashtirish hisobiga tezkor ishlash.

### 4. 💎 Premium Tizimi
- **Supabase Integration:** Foydalanuvchi limiti va Premium statusi bazada saqlanadi.
- **Daily Limits:** Oddiy foydalanuvchilar uchun kunlik limit.
- **Branding:** Premium foydalanuvchilar o'z logotiplarini yuklashi mumkin.

---

## 🚀 O'rnatish va Ishga Tushirish

### 1. Loyihani yuklab olish
```bash
git clone https://github.com/iqboljon-0203/MaklerProwebapp.git
cd MaklerPro
npm install
```

### 2. Environment Variables (.env)
`.env.example` dan `.env` fayl yaratib, quyidagi kalitlarni kiriting:

```env
# Supabase (Database & Auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# AI API Keys (Vercel Environment da ham bo'lishi kerak)
DEEPSEEK_API_KEY=your-deepseek-key
GOOGLE_API_KEY=your-gemini-key

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
```

### 3. Ilovani ishga tushirish
```bash
npm run dev
```
Brauzerda `http://localhost:5173` manzilida ochiladi.

### 4. Vercel Deploy
```bash
vercel deploy --prod
```
⚠️ **Eslatma:** Server funksiyalari (`api/`) ishlashi uchun Vercel Environment Variables bo'limiga API kalitlarini kiritishni unutmang.

---

## 🗂️ Loyiha Tuzilmasi

```
MaklerPro/
├── api/                     # Backend (Vercel Serverless)
│   ├── generate-description.ts  # AI Text Gen (DeepSeek/Gemini)
│   ├── bot-webhook.ts       # Telegram Bot Logic
│   └── ...
├── public/                  # Statik fayllar (logo.svg, icons)
├── src/
│   ├── components/
│   │   ├── features/        # Asosiy funksiyalar (Editor, AI, Gallery)
│   │   └── ui/              # Kichik elementlar (Button, Card, Input)
│   ├── services/            # API so'rovlar (imageService, aiService)
│   ├── store/               # State Management (Zustand)
│   ├── locales/             # Tarjimalar (uz.json, ru.json)
│   └── ...
└── vite.config.ts           # Vite & PWA sozlamalari
```

## 🛠 Texnologiyalar

- **Frontend:** React 19, TypeScript, Vite
- **Styling:** TailwindCSS 4, Shadcn/UI, Framer Motion
- **State:** Zustand (Persist)
- **Backend:** Vercel Serverless Functions (Node.js)
- **Database:** Supabase (PostgreSQL)
- **AI:** DeepSeek V3, Google Gemini 1.5 Flash
- **PWA:** vite-plugin-pwa

---

## 🤝 Yordam va Qo'llab-quvvatlash

Savollar yoki takliflar bo'lsa:
Telegram: [@MaklerProSupport](https://t.me/MaklerProSupport)

---
© 2026 MaklerPro. Barcha huquqlar himoyalangan.
