# Stack

Stack is an iOS-first wellness app. It shows which supplements line up with your own wearable data, and where the same ingredient is showing up in more than one bottle.

The name is a placeholder. Change `APP_NAME` in [`app/brand.cjs`](app/brand.cjs). The Expo config, bundle id, and on-screen copy read from that file.

This is an educational log. It is not a medical device, not medical advice, and it does not calculate a dose.

## Layout

- `app/`: Expo SDK 58, TypeScript, Expo Router
- `server/`: Cloudflare Worker (Hono) and D1

Health samples stay on the device. After sign-in, only the supplement list you typed can sync.

## App

### Expo Go

HealthKit is not in Expo Go. The app starts empty: onboarding, then a stack with nothing in it. Impact, Audit, and the monthly report explain what is missing. Expo Go does not invent wearable days. A development build can read Apple Health.

```bash
cd app
npm install
npx expo start
```

Open the project in Expo Go. Settings use SQLite instead of MMKV in Expo Go, because MMKV needs a development build. On web, settings use browser storage.

`npx expo start --web` uses the same screens. Web SQLite needs `SharedArrayBuffer`, so Metro and the `expo-router` plugin send `Cross-Origin-Embedder-Policy: credentialless` and `Cross-Origin-Opener-Policy: same-origin`. Keep those headers if you host the web export.

### iOS development build (Apple Health)

```bash
cd app
npm install
npx eas-cli login
npx eas-cli build --profile development --platform ios
npx expo start --dev-client
```

The development profile is in `eas.json`. A simulator build is `development-simulator`.

The HealthKit config plugin requests read access for:

- sleep analysis (deep sleep is summed per night)
- heart rate variability SDNN
- resting heart rate
- VO2 max
- step count
- active energy

Oura, WHOOP, and Garmin are shown as coming soon. Barcode lookup uses the phone camera in Expo Go. Photographing a whole label is still later.

### Checks

```bash
cd app
npm run typecheck
npm run lint
npm test
```

Audit and impact maths live in `app/src/domain` and are covered by Vitest. They do not import React Native.

### Local data

- Products, ingredients, wearable days, and day tags: `expo-sqlite` + Drizzle (`app/src/db`, migrations in `app/drizzle`)
- Settings: MMKV in a dev or store build. Expo Go falls back to the SQLite `settings` table. Web uses `localStorage`.

A normal launch does not load example products, wearable days, reports, or audit results. Onboarding runs until it is finished. An older install that still has the untouched fictional seed is cleared once on update. Edits you already made are kept.

Example products and wearable days stay behind More, then Developer tools: Load example data. That section is off unless you are in a development build. Clear all data is in the same place, and again under Settings.

### Sign-in, purchases, telemetry

| Piece | Env | Notes |
| --- | --- | --- |
| API | `EXPO_PUBLIC_API_URL` | Defaults to `http://localhost:8787`. The deployed API is `https://stack-api.jamesarobinson6.workers.dev`. The EAS preview profile receives `EXPO_PUBLIC_API_URL` from an EAS project environment variable. App code leaves it unset. |
| RevenueCat | `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | Entitlement id `pro`. Products `stack_pro_monthly` ($7.99) and `stack_pro_annual` ($59). Needs a dev build. |
| PostHog | `EXPO_PUBLIC_POSTHOG_KEY`, optional `EXPO_PUBLIC_POSTHOG_HOST` | Off when the key is empty. Events are screen and product actions, not health samples. |
| Sentry | `EXPO_PUBLIC_SENTRY_DSN` | Off when empty. The native plugin is added only when the DSN is set at config time. |

Without a store key, the paywall can preview Pro on the device. That preview is not a purchase.

Sign in with Apple sends a raw nonce to this API and the SHA-256 hex of that nonce to Apple. Email sign-in asks the Worker for a code.

## Server

```bash
cd server
npm install
cp .dev.vars.example .dev.vars
npx wrangler d1 migrations apply stack --local
npm run dev
```

`GET /health` returns `{ "ok": true }`.

`POST /v1/auth/email/start` includes `devCode` in the JSON only when `ENVIRONMENT` is `development` and the request reaches the Worker on localhost (`wrangler dev`). A deployed Worker never returns it, whatever its vars say. No email provider is wired yet.

To sign in on a preview build without email, set two production secrets: `TEST_EMAILS`, a comma separated list of addresses on reserved test domains only (`example.com`, `example.org`, `example.net`, or a `.test`, `.example`, or `.invalid` domain), and `TEST_SIGN_IN_CODE`, a 6 digit code. Only those addresses accept that code, nobody can receive mail there, and the code is never in a response. Any other address needs a real code, which is not sent until a mailer is added. Code requests and attempts are rate limited per address and per IP.

The deployed API is `https://stack-api.jamesarobinson6.workers.dev`. `server/wrangler.toml` points at D1 database `stack` (`f77ceacc-e4ee-4542-9c77-546661462f76`).

Production settings live in `[env.production]` (Worker `stack-api`, `ENVIRONMENT = "production"`, a daily cron at 03:17 UTC). A plain `wrangler deploy` goes to `stack-api-dev`, so it cannot overwrite production with development vars. `npm run deploy` and CI use `--env production`.

Secrets, set with `wrangler secret put --env production` only:

- `AUTH_PEPPER` and `REVENUECAT_WEBHOOK_AUTH`, as before.
- `ADMIN_TOKEN`: bearer token for the report queue, `GET /v1/admin/reports` and `POST /v1/admin/shares/:slug` with `{ action: "restore" | "hide" | "remove" }`.
- `TEST_EMAILS` and `TEST_SIGN_IN_CODE`: optional, for preview sign-in as above.

Optional vars in `[env.production.vars]`: `APP_STORE_ID` (numeric, turns on the Smart App Banner and the App Store redirect), `APPLE_TEAM_ID` (turns on universal links in `/.well-known/apple-app-site-association`), and `PUBLIC_BASE_URL` (the https origin used in share links, if it is not the Worker host).

```bash
npx wrangler d1 migrations apply stack --remote --env production
npx wrangler secret put AUTH_PEPPER --env production
npx wrangler secret put ADMIN_TOKEN --env production
```

`APPLE_AUDIENCE` in `wrangler.toml` must match the iOS bundle id (`app.stack.mobile` unless you changed `IOS_BUNDLE_ID`).

### Routes

- `POST /v1/auth/email/start` and `/v1/auth/email/verify`
- `POST /v1/auth/apple` with `{ identityToken, rawNonce }`
- `POST /v1/auth/signout`, `GET /v1/me`, `DELETE /v1/account`
- `PUT` and `GET /v1/sync/stack`: supplement list only. A body that includes health samples is rejected.
- `POST /v1/webhooks/revenuecat`: `Authorization: Bearer <REVENUECAT_WEBHOOK_AUTH>`. Updates `subscriptions` for entitlement `pro`.
- `GET /v1/labels/search?q=`, `GET /v1/labels/dsld/:id`, and `GET /v1/labels/upc/:code`: NIH DSLD search and barcode lookup. The barcode route then tries Open Food Facts. The two caches stay in separate D1 tables.
- `PUT /v1/labels/upc/:code`: signed-in users can store a label they confirmed, keyed by UPC. That copy is per account, including when the form was prefilled from Open Food Facts.

Call `Purchases.logIn(userId)` with the Stack user id so the webhook's `app_user_id` matches. The app does that after sign-in when RevenueCat is configured.

## Labels

Product search calls the Worker, which calls the NIH Dietary Supplement Label Database (`https://api.ods.od.nih.gov/dsld/v9/`) and caches the normalised label in D1 (`dsld_cache`) and the Cache API. The Worker stops new NIH calls after 800 in an hour, under the public limit of 1,000 per hour per IP.

Barcode lookup checks the signed-in user's own saved label, then NIH DSLD, then Open Food Facts (`https://world.openfoodfacts.org/api/v2/product/<ean>.json`). Open Food Facts fills the name and brand for a UK or EU barcode. A vitamin or mineral amount comes only from `_serving`, which Open Food Facts stores in grams, and is rescaled to the unit the contributor typed (`_unit`, any mass unit). IU, percent of daily value, a per-100g figure, a dose written in the product name, and a gram value above 5 g (someone typed micrograms into the gram field) are left blank. The add screen asks you to check or add the doses from the bottle before saving. The saved product goes to that account only (`contributed_labels`).

Open Food Facts rows live in `off_cache` for 24 hours, with `source` set to `off`, and the daily task deletes rows older than 30 days. They are not mixed into the DSLD catalogue. The database is ODbL. The add screen and Settings show: Product data from Open Food Facts, available under the ODbL.

The Worker sends `User-Agent: Stack/0.1 (<CONTACT_EMAIL>)`. `CONTACT_EMAIL` in `server/wrangler.toml` is the address or URL in that header. Replace it with a monitored contact.

DSLD stores UPC-A with spaces, and a lot of labels have no barcode. CFU is often only in the ingredient notes. The phone keeps a short list of common ingredient names for manual entry when search is offline. Settings cites DSLD and Open Food Facts.

## What the screens do

1. **Onboarding:** nine short screens. Goal, rough monthly spend, a wearable (or skip), age range and sex (each with prefer not to say), supplements (NIH search, barcode, or typing), a short audit loader, a result that uses the real audit, sign-in to save it, then the Pro paywall with Continue with Free. Progress reads 1 of 9. The age and sex screen says why: Discover's people like you and grouped results. If Apple Health is connected outside Expo Go, date of birth and biological sex, read with the same single permission sheet, suggest the choices. They stay on the phone and are not sent to analytics. Settings can change them later. A reload never opens on the monthly report. The report has a Close control, and Pro preview can be turned off from More.
2. **My Stack:** each product's monthly cost and the total. Add is the bar above the tabs, and the empty state has its own add control. Share stack, when the stack has products, creates a link. Monthly cost is `(price / servings) × servings per day × 30`. Tab screens do not repeat the tab name at the top.
3. **Audit:** rolls ingredients up, prices the duplicate shares, and soft-flags a vitamin or mineral at or above 90% of the NIH ODS adult upper limit. Notes come from `app/src/data/interactions.ts`. Overlap dollars keep the largest single share and treat the rest as the extra spend. That is an estimate, not a market price for the ingredient.
4. **Impact:** 21 days before a start date versus 21 days after, for deep sleep, HRV, and resting heart rate. Copy says the shift is associated, not caused. One before/after is free.
5. **Pro:** confounder notes (training load, alcohol, travel), multi-supplement comparison, savings score, and a monthly report with keep / drop / unclear. Drop means the overlap dollars sit on that bottle and the wearable window did not move. It is not advice to stop.

Free is the stack log, the duplicate dollars, the upper-limit flags, and a single before/after.

## Sharing

Share stack publishes products and daily doses, the audit score with its reasons, and an optional personal headline. Prices, notes, start dates, and wearable samples are never sent. The name is hidden unless the person turns it on, and a review step lists everything that will be public before publishing. Example data cannot be shared. Publishing opens the share sheet with the link. The score is documented in `docs/audit-score.md`, results and groups in `docs/personal-outcome.md`.

Every edit that changes something creates a new version, and the page shows "Updated on" with a short list of changes. A change of ingredients or doses restarts the kept count and the copier group, so an edit cannot inherit them.

The public page is `GET /s/<slug>` on the Worker, on a white background with a Smart App Banner, Open Graph and Twitter tags, and a 1200 by 630 preview image (`/s/<slug>/og.png`, cached per version). The page shows what the stack is, the score and why, and one action. It carries no results numbers and no health claims. The action, `/s/<slug>/get`, remembers the slug for 2 hours against a hashed address and opens the App Store, so a new install opens that stack after onboarding. With the app installed, universal links open it directly. Universal links need `APPLE_TEAM_ID` on the Worker and a new native build (the app's `associatedDomains` comes from `EXPO_PUBLIC_SHARE_HOST` or `EXPO_PUBLIC_API_URL`).

Copy to my stack shows a preview first: products you already take, overlaps, what is new, and your score after. Each row can be added, skipped, or replace yours. The products are written in one transaction with `catalogueId` `share:<slug>`, so the copy lands whole or not at all, and it can be copied again after deleting them. Copying works before sign-in and counts once the person signs in.

Discover is a link on My Stack, not another tab. One control switches New, Most kept, People like you, and Saved. The rules are in `docs/stack-library.md`.

## CI

`.github/workflows/ci.yml` typechecks, lints, and tests the app and the Worker, then runs gitleaks, Semgrep, and `npm run check:dashes`. A push to `main` deploys the Worker only after those checks pass and only when `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are set. If either secret is missing, deploy is skipped.

## House rule

Do not use an em dash (U+2014) or an en dash (U+2013) anywhere in this project: UI copy, strings, seed data, docs, comments, commit messages, or pull request text. Use a comma, full stop, colon, parentheses, or a plain hyphen. Write a range as "2 to 4", not with an en dash. `npm run check:dashes` fails if a tracked text file contains either character. Lockfiles and vendored files are excluded.

Labels use sentence case. Do not set `textTransform` to `uppercase`, and do not track small labels out with wide letter spacing. `npm run check:case` fails if a tracked source file does.

## What's stubbed

- Oura, WHOOP, and Garmin connections
- Photographing a supplement label (barcode lookup against NIH DSLD, then Open Food Facts, is implemented)
- Email delivery (development returns the code; production does not send mail)
- RevenueCat products and the iOS SDK key (the paywall, entitlement id, and webhook are wired)
- PostHog and Sentry (wired, disabled without keys)
- Sign in with Apple on a real device (needs the Apple capability and a dev build)
- A public landing page (planned later as Workers static assets)
- Confounders are tags you log, not inferred from a calendar
- Sync is last-write-wins for the supplement list. Health samples are never synced.
- The example stack's ingredient cost weights are set so the overlap story is $12 magnesium and $15 B vitamins. It loads only from More, then Developer tools. New products split cost evenly across ingredients.

## Regulatory

US general-wellness framing only. No disease claims and no dose recommendations. Upper limits are citations of NIH Office of Dietary Supplements fact sheets, stored in `app/src/data/upperLimits.ts`, and the UI calls them a soft flag to discuss with a clinician.
