# Shree Food Junction — PRD

## Vision
A small Bluetooth-printer companion for the **Shree Food Junction** cloud kitchen. Tap a customer name + order number → fetch a delightful one-line quote from the SFJ quote API → print it on a 58mm Bluetooth thermal printer that goes inside every order packet.

## Branding (locked)
- App name: **Shree Food Junction** (Android `name`, iOS display, launcher icon all use the SFJ logo)
- Tagline: *Good Food, Happy Mood*
- Logo: `assets/images/sfj-logo.png` (also used for icon.png, adaptive-icon.png, splash-image.png, favicon.png)
- No Emergent / KitchenNotes / Gemini branding anywhere in the UI.

## Core flow (v2)
1. **First open** → app boots → bootstrap gate reads stored printer.
   - No printer? → `/printer-setup` (mandatory, no setup-key step anymore)
   - Printer present? → `/home`
2. **/printer-setup** — scan, list, connect to 58mm BT printer.
3. **/home** — SFJ brand header (logo + name + tagline), printer chip, Customer Name input, Order # stepper (persists), `Generate Sticky Note` CTA.
4. **/preview** — hits `POST https://expertdevelopers.in/generate-8858-quote-for-sfj` with `{ kitchen_name: "Shree Food Junction", customer_name, order_number }`, renders the returned `quote` on a hand-written sticky-note card. Buttons: **Regenerate**, **Print to 58mm**.
5. **/settings** — brand card + printer management. No API key / kitchen-name fields (kitchen is hard-coded; API needs no auth).

## API
**External (sole source of truth)**: `POST https://expertdevelopers.in/generate-8858-quote-for-sfj`
- Body: `{ kitchen_name, customer_name, order_number }`
- Response: `{ success: true, quote: "..." }`
- No Gemini key needed on the device; auth is handled server-side by the user.

The local FastAPI backend is no longer part of the user flow (kept only as a no-op for the platform).

## Bluetooth printer (58mm, ESC/POS)
- Library: `react-native-bluetooth-escpos-printer@0.0.5` (installed in `package.json`).
- Real BT activates **only inside a built APK/IPA** — Expo Go preview shows a clearly-labelled "Demo mode" with 2 demo devices.
- Android permissions declared in `app.json` → `expo.android.permissions`:
  `BLUETOOTH`, `BLUETOOTH_ADMIN`, `BLUETOOTH_CONNECT`, `BLUETOOTH_SCAN`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`.
- iOS Bluetooth usage descriptions in `expo.ios.infoPlist`.
- `src/lib/printer.ts` requests Android 12+ runtime permissions lazily on scan.

## Storage (AsyncStorage)
- `sfj:order_number` — persists the running order #.
- `sfj:printer` — JSON `{ id, name }` of the saved printer.
(No Gemini key, no kitchen name — both are no longer needed.)

## Files
- `app/_layout.tsx` — fonts (Caveat for handwritten note, Fraunces for display, Nunito for text), splash gate.
- `app/index.tsx` — bootstrap gate.
- `app/printer-setup.tsx` — scan/connect.
- `app/home.tsx` — customer + order input, brand header.
- `app/preview.tsx` — sticky-note preview + regenerate + print.
- `app/settings.tsx` — brand card + printer management.
- `src/lib/api.ts` — calls expertdevelopers.in quote endpoint.
- `src/lib/printer.ts` — BT adapter (native or simulated).
- `src/lib/storage.ts` — AsyncStorage wrapper + `KITCHEN_NAME`.
- `src/lib/theme.ts` — design tokens.
