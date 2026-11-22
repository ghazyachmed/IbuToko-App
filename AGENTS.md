# Toko Santri

Mobile-first PWA for the Gading and Palur shops. React 19 + Vite 8 + TypeScript,
Tailwind CSS v4 (via `@tailwindcss/vite`) plus the hand-written styles in
`src/styles/styles.css`. Static site deployed to Cloudflare Pages from `main`.

**Read `docs/PRD.md` first** for the product requirements, the owner's glossary
and workflow, business rules, and the Phase 2 plan (database, login, AI chatbot,
OCR, ACOSYS). Update its decision log when a product decision changes.

## Commands

- `pnpm install`
- `pnpm dev` — local dev server
- `pnpm run typecheck`
- `pnpm run build` — typecheck + production build into `dist/`
- `pnpm preview` — serve `dist/` locally

Toolchain: Node 22 (`.node-version`, `.nvmrc`), pnpm 10 (`packageManager`).

## Structure

- `src/components/TokoApp.tsx` — all screens. Flow: first open / after install →
  Pilih Toko → (browser only) Pasang Aplikasi → Beranda. Menu: Buku Besar (notes
  grouped per supplier → nota detail), Buku Uang (per day), Tanya & Catat (chat that
  answers questions and records new buy/sell prices after confirmation).
  There is no Harga Barang page; `/app/harga-barang` redirects to Tanya & Catat.
- `src/router.tsx` — tiny History-API router; keep existing paths.
- `src/data/katalog.ts` — products from the Toko Santri Nonongan catalogue
  (names, categories, sell units, retail prices) + simulated purchase units.
- `src/data/simulasi.ts` — deterministic SIMULATED suppliers, purchases, stock
  movements, notes, payments, income, and accounts per branch.
- `src/lib/store.ts` — merges simulated data with records made on the device
  (payments, price info from suppliers, sell-price changes; localStorage).
- `src/lib/tanya-data.ts` — rule-based answers; every answer cites its source.
  Keep answers SHORT and in plain everyday Indonesian for a non-technical owner.
- `public/` — manifest, icons, `sw.js`, Cloudflare `_headers`.

## Rules

- All financial and stock data is simulated (`simulated: true`) and must stay
  clearly labelled as such in the UI. There is no backend or database yet.
- Toko Santri Nonongan is only a catalogue reference, not a branch. Never copy
  its stock or transactions into Gading/Palur.
- Catalogue prices are SELL prices. Purchase prices are synthetic; never present
  sell−buy differences as net profit.
- Stock = sum of incoming − outgoing movements and must never go negative.
- Keep Gading and Palur data separate.
- Simulated dates are relative to today, but note numbers (e.g. `GDG-KJ-012`)
  are stable, so on-device payments keep pointing at the right note. Never build
  IDs or random seeds from dates.
- Font sizes are in `rem` so they follow the phone/browser text-size setting
  (iOS Dynamic Type via `-apple-system-body`). Never add `font-size` in `px`;
  keep body text ≥ 1rem and small notes ≥ 0.875rem (the owner reads on a phone).
- Tanya & Catat answers are short intro lines + `cards` (title + label/value
  rows) + small `notes`. No long sentences packed with numbers.
- Tanya & Catat is rule-based and runs on the device (no LLM, no database call).
  Answers are cached per question + day + data version in `AskData`. If a
  server/LLM is ever added, keep the order: rules → cache → server.
- Layout must fit every size: phone portrait (Home = one screen), phone
  landscape (Kitty left, menu right), tablet portrait (2×2 menu), desktop
  (3 cards in a row, full-width pink header).
- Keep the pink theme, the existing Hello Kitty asset (do not redraw it; only
  decorate around it), animations, one-screen home, and the Ganti Toko flow.
- Glossary: harga beli = HPP + ongkir. A new sell price below the latest buy
  price must be rejected.
- `public/sw.js` may cache only public static files (shell, `/assets/*`, icons,
  manifest). Never cache API, authenticated, or financial responses. The build
  stamps a unique suffix onto `VERSION` in `dist/sw.js` (see `vite.config.ts`),
  so every deploy is detected by installed apps, which then show a
  "Versi baru tersedia" bar (`UpdateBanner` in `TokoApp.tsx`).
