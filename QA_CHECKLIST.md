# 🧪 MaklerPro Production QA Checklist

## 1. 🖼️ Image & Media Processing (Edge Cases)
The core value of your app is image processing. Fails here are critical.

- [ ] **Huge File Upload (Memory Stress)**
  - **Test:** Upload an image > 25MB or 8000x8000 pixels.
  - **Expectation:** The sequential processor should handle it or return a graceful "File too large" toast, NOT crash the browser tab.
  - **Edge Case:** Try uploading 20 large images at once. Verify `processImagesInQueue` handles them one by one without freezing the UI.

- [ ] **Corrupted or Unsupported Files**
  - **Test:** Rename a `.txt` file to `.jpg` and try to upload it.
  - **Expectation:** Loader should fail gracefully for that specific file and proceed to the next one. Error toast should appear.

- [ ] **Video Generation Limits**
  - **Test:** Select 50 images for the slideshow.
  - **Expectation:** Should warn user or handle processing. Check if `send-to-chat` (Plan B) works with a large file size (Vercel limit is 4.5MB for request body).
  - **Mitigation:** If files > 4.5MB fail, verify the users see a "File too large to send via Bot" or similar error.

## 2. 🤖 AI & API Reliability
OpenAI and your Backend can fail independently of your frontend.

- [ ] **OpenAI Outage / Error handling**
  - **Test:** Disconnect internet or block `api/generate-description`.
  - **Expectation:** The UI should stop loading state and show "Failed to generate description". It must NOT hang indefinitely in "Processing...".

- [ ] **Quota/Rate Limits**
  - **Test:** Rapidly click "Generate" 6 times (exceeding the 5/min limit).
  - **Expectation:** User MUST receive the specific JSON error "Daily limit reached" as a toast, prompting them to upgrade.

- [ ] **Empty/Nonsense Input**
  - **Test:** Send "..." or "sjdhfjkshdf" to AI.
  - **Expectation:** System should either return a generic fallback or handle the weird response without breaking the formatting.

## 3. 💎 Subscription & State Management
What happens when status changes in real-time?

- [ ] **Mid-Session Expiry**
  - **Test:** Open the app as "Premium". Minimize app. Manually update Supabase: `UPDATE users SET premium_until = NOW() - INTERVAL '1 day'`. Reopen app.
  - **Expectation:** Does the app re-check status? (Currently `App.tsx` checks on mount). If user navigates or refreshes, they should lose access. Ideally, implement a `onFocus` re-fetch logic for strict control.

- [ ] **Offline Behavior**
  - **Test:** Go offline (Airplane mode) and open the app.
  - **Expectation:** `zustand/persist` should load the *last known* status (Premium/Free). User should see cached data, not a blank screen.

## 4. 🔐 Security & HMCA Validation
Prevent free usage by hackers.

- [ ] **Tampering InitData**
  - **Test:** In your `aiService.ts`, manually change one character in the `X-Telegram-Init-Data` header string sent to backend.
  - **Expectation:** The Edge Function (`generate-description.ts`) MUST return `403 Unauthorized`.

- [ ] **Missing Headers**
  - **Test:** Call the API endpoint directly via Postman without the header.
  - **Expectation:** `401 Unauthorized` or `403`.

- [ ] **Replay Attacks (Advanced)**
  - **Test:** Use an old `initData` string from yesterday (Telegram `auth_date` is included in validation).
  - **Expectation:** Telegram validation logic checks `auth_date`. If it's too old (>24h), it should ideally fail (depending on strictness of your validation logic).

## 5. 📱 Telegram WebApp Specifics

- [ ] **Theme Sync**
  - **Test:** Change Telegram Theme from Day to Night. Open App. 
  - **Expectation:** App should auto-detect and switch to Dark Mode.

- [ ] **Viewport/Keyboard**
  - **Test:** Open input field (AI description) on Mobile.
  - **Expectation:** Keyboard should NOT push important UI elements off-screen or break the layout.

- [ ] **BackButton Behavior**
  - **Test:** Go to "Enhance" page. Press Telegram "Back" button (top left).
  - **Expectation:** Should return to Dashboard, NOT close the Mini App completely.

