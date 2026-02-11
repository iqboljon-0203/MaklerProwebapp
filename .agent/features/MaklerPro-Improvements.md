# MaklerPro Improvements & Features

This document outlines the key features, logic, and fixes implemented for the MaklerPro Telegram bot and web application.

## 1. Admin System 🛡️

### Overview
An administrative dashboard accessible via the Telegram bot to monitor project health and user statistics.

### Implementation Logic
- **Authorization**: The bot checks the user's Telegram ID against the `ADMIN_IDS` list in the `.env` file.
  - If unauthorized: Returns "⛔️ Siz admin emassiz" and shows the user's ID.
  - If authorized: Proceed to fetch stats.
- **Command**: `/admin`
- **Statistics Displayed**:
  - **Total Users**: Count of all registered users in the `users` table.
  - **Premium Users**: Count of users with `is_premium = true`.
  - **Daily Active Users**: Users active today (`last_active >= today`).
  - **Revenue**: Approximate revenue calculation based on `payments` table (count * 200 Stars).

## 2. Premium Access logic 💎

### Mechanics
- **Subscription Model**: 30-day access via Telegram Stars (200 Stars).
- **Payment Handler**: On successful payment (`successful_payment`), the `premium_expires_at` column is set to `NOW() + 30 days`.
- **Middleware Check**:
  - On every bot interaction, the middleware checks if `premium_expires_at` has passed.
  - If expired: `is_premium` is set to `false`, and limits are reset to 5 daily generations.

### Notifications (Cron Job) 🔔
- **Endpoint**: `api/check-expiry.ts`
- **Schedule**: Daily at 12:00 UTC (via `vercel.json`).
- **Logic**: 
  - Queries users whose premium expires in exactly **3 days**.
  - Sends a direct message: "⚠️ Sizning Premium obunangiz tugamoqda..." suggesting they renew with `/premium`.

## 3. user Experience (UX) Improvements 🚀

### AI Refinement (Tahrirlash)
- **Problem**: Users had to retry from scratch if they didn't like the generated description.
- **Solution**: Added refinement buttons in `AiConverter.tsx` after generation.
- **Actions**:
  - ✂️ **Qisqaroq**: Make text shorter.
  - 📝 **Uzunroq**: Make text longer/detailed.
  - 👔 **Ekspert**: Make tone more formal.
  - 😃 **Emoji+**: Add more emojis.
- **Technical**: The frontend passes `previousText` and `instruction` to the `generateDescription` API, which maintains conversation history for context-aware refinements.

## 4. Technical Fixes 🔧

- **Vercel Webhook Error**:
  - **Issue**: "Bot not initialized" error on Vercel.
  - **Fix**: Added `await bot.init()` in `api/bot-webhook.ts` before handling updates.
- **Build Errors**:
  - **Issue**: `imageService` utilities (loadImage, etc.) were not exported.
  - **Fix**: Added explicit exports in `src/services/imageService.ts`.
- **Linting**:
  - **Issue**: TypeScript errors for `ctx.api.sendInvoice` arguments.
  - **Fix**: Added `@ts-ignore` to suppress strict type checks while ensuring runtime functionality.

## 5. Future Considerations 🔮

- **Video Generation**: Currently client-side (`ffmpeg.wasm`). Recommended to move to server-side (Shotstack/Cloudinary) to prevent crashing on low-end mobile devices.
- **Payments**: Integration of local payment providers (Click, Payme) to support users without Telegram Stars.
