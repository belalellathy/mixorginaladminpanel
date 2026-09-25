# DESCRIPTION.md — Beauty Store Admin Panel (Mix Originals)

## 1. Project Overview

### What the project does
Single-page React admin panel for the "Mix Originals" beauty store. It lets internal operators:

- Sign in as an admin (Supabase Auth + `admins` table gate).
- View business metrics (total orders, revenue today / this month, orders-by-status, 7-day orders chart, recent orders).
- Manage orders: filter by status, search by customer name/phone, paginate, view order detail (items, customer PII, payment proof screenshot, tracking number, internal notes), update status/tracking/notes, delete orders.
- Manage product catalog: list/search products, toggle `is_featured`, create/edit products (name, description, price in EGP, stock, category, Cloudinary image), delete products.
- Manage categories: list categories, inline-edit name and accent color (create/delete disabled by design).

### Tech stack
- **Frontend:** React 18.3.1, React Router DOM 6.26.2, React Hook Form 7.53 + Zod 3.23 + `@hookform/resolvers` 3.9, Zustand 4.5 (auth store), Recharts 2.12 (dashboard chart), Lucide React 0.441 (icons), Tailwind CSS 3.4.
- **Backend / BaaS:** Supabase (Postgres + Auth + Storage). No custom backend in this repo. All reads/writes go directly from the browser via `@supabase/supabase-js` 2.45 using the anon key (`src/lib/supabase.js`).
- **Image hosting:** Cloudinary unsigned upload (`src/lib/cloudinary.js`, `src/components/ProductImageUpload.jsx`).
- **Auth:** Supabase Auth email/password; admin authorization = row existence in `admins` table (`id = auth.user.id`). Client-side route guard only.
- **Build tooling:** Vite 5.4, `@vitejs/plugin-react` 4.3, PostCSS + Autoprefixer.
- **Database tables (inferred from queries, no migrations in repo):** `orders`, `order_items`, `products`, `categories`, `admins`; Storage bucket: `payment-screenshots`.

### High-level architecture
```
Browser (Vite SPA)
 ├─ React Router pages → Zustand adminStore (session/adminUser)
 ├─ supabase.js data layer → Supabase REST/PostgREST + Auth + Storage
 │    orders / order_items / products / categories / admins
 │    storage: payment-screenshots/*. (signed URLs, 3600s)
 └─ cloudinary.js → Cloudinary Upload API (unsigned preset, folder: product-images)
```
There is no server-side authorization, validation, rate limiting, or audit layer in this repository. Security therefore depends entirely on Supabase Row Level Security (RLS) policies and Storage policies, which are **not visible / not versioned here**.

---

## 2. Project Structure

```
Adminpanel/
├── .env                          # REAL Supabase URL + anon JWT + Cloudinary name/preset (committed secret)
├── .env.example                  # Placeholder template for required VITE_* vars
├── index.html                    # SPA shell, Inter font, #root mount
├── vite.config.js                # Vite + React plugin, `@` alias (alias currently unused)
├── tailwind.config.js            # Tailwind content globs, Inter font, status colors
├── postcss.config.js             # Tailwind + Autoprefixer
├── package.json / package-lock.json # Deps + exact lockfile
├── dist/                         # Committed production build (bakes VITE_* secrets into JS)
├── src/
│   ├── main.jsx                  # ReactDOM root + BrowserRouter + App
│   ├── App.jsx                   # Route table (/login public; /* protected Layout)
│   ├── index.css                 # Tailwind directives + scrollbar styling
│   ├── lib/
│   │   ├── supabase.js           # Supabase client + all orders/products/categories/dashboard queries
│   │   └── cloudinary.js         # Unsigned Cloudinary product-image uploader
│   ├── store/adminStore.js        # Zustand: session, adminUser, isLoading
│   ├── hooks/useAdmin.js          # One-shot getSession + admins lookup; exposes only { logout }
│   ├── components/
│   │   ├── ProtectedRoute.jsx    # Blocks rendering when !adminUser (store only)
│   │   ├── Layout.jsx            # Sidebar + TopBar + <Outlet/>
│   │   ├── Sidebar.jsx           # Nav: Dashboard / Orders / Products / Categories
│   │   ├── TopBar.jsx            # Shows admin email (broken, see bugs) + sign out
│   │   ├── ConfirmDialog.jsx     # Destructive-action modal
│   │   ├── OrderStatusBadge.jsx  # Status pill
│   │   ├── OrderStatusSelect.jsx # Status <select>
│   │   └── ProductImageUpload.jsx # File input + Cloudinary upload + preview
│   └── pages/
│       ├── Login.jsx             # Email/password form → Supabase signIn + admins check
│       ├── Dashboard.jsx         # Metrics cards + status counts + 7-day chart + recent orders
│       ├── Orders.jsx            # Tabs + search + paginated table + delete
│       ├── OrderDetail.jsx       # Items + customer info + tracking/notes/status + payment proof + delete
│       ├── Products.jsx          # Searchable products table + featured toggle + delete
│       ├── AddEditProduct.jsx    # Zod-validated create/edit form (Price in EGP)
│       └── Categories.jsx        # Read-only list + inline name/accent_color edit
```

No backend, SQL migrations, seed scripts, tests, lint config, CI, Dockerfile, or README were found.

---

## 3. Key Features & Flows

### Main features
1. Admin login with admin-table gate.
2. Dashboard KPIs + 7-day orders bar chart.
3. Orders list (status tabs, debounced search, 10/page pagination).
4. Order detail with payment-proof image, tracking number, internal notes, status transitions, hard delete (order + items + screenshot).
5. Products CRUD + featured toggle + Cloudinary image upload (5 MB client limit).
6. Categories inline rename / accent-color edit.

### Critical user flows
**Login (`src/pages/Login.jsx:42-91`):**
Form (Zod: valid email, password ≥6) → `supabase.auth.signInWithPassword` → `admins.select('*').eq('id', user.id).single()` → if missing, `signOut()` + "Access denied" → else store session/adminUser in Zustand → `navigate(redirectTo || '/')`.

**Session bootstrap (`src/hooks/useAdmin.js:8-38`, `src/App.jsx:15`):**
On app mount, `supabase.auth.getSession()` → if no user, `clearSession()` → else `admins.select('*').eq('id', ...)` → if error/missing, `signOut()` + clear; else set store. No `onAuthStateChange` subscription.

**Route guard (`src/components/ProtectedRoute.jsx:9-24`):**
If `isLoading` show spinner; if `!adminUser` redirect to `/login`; else render children. Trusts Zustand memory only.

**Orders fetch (`src/lib/supabase.js:16-39`, `src/pages/Orders.jsx:54-71`):**
Builds PostgREST query with optional `status` filter and `.or(full_name.ilike.%..%,phone.ilike.%..%)` search, `range(from,to)`, `count: exact`.

**Order detail (`src/lib/supabase.js:41-58`, `src/pages/OrderDetail.jsx:60-85`):**
`orders.select('*').eq('id').single()` + `order_items.select('*, products(id,name,price,image_url)').eq('order_id')` → optional `createSignedUrl(filePath, 3600)` for payment proof.

**Product save (`src/pages/AddEditProduct.jsx:100-128`):**
Zod validation → payload `{name, description, price, stock, category_id, image_url, is_featured}` → `insertProduct` or `updateProduct` → navigate to `/products`.

**Image upload (`src/components/ProductImageUpload.jsx:9-38`, `src/lib/cloudinary.js:9-42`):**
Client MIME + 5 MB check → `FormData{file, upload_preset, folder:'product-images'}` → `POST https://api.cloudinary.com/v1_1/<cloud>/image/upload` → returns `secure_url`.

---

## 4. 🔴 Security Issues

### S1 — Real Supabase URL + anon JWT and Cloudinary identifiers committed in `.env`
- Severity: **High**
- Files: `.env:1-6`, `dist/assets/*.js` (baked `VITE_*` vars)
- Description: `.env` contains a live project URL (`https://lvrjxjnbugrwinxrqpun.supabase.co`), a valid Supabase anon JWT (decodable, `exp` 2036), Cloudinary cloud name `md4uneaq` and unsigned preset `Mixorginal_products`. There is no `.gitignore`; `.env` and `dist/` are present in the working tree and at risk of being pushed. Vite embeds all `VITE_*` values into the shipped bundle, so the anon key is public by design, but committing `.env` removes rotation control and leaks the exact backend to scanners.
- Fix: Add `.gitignore` (` .env`, `dist/`, `node_modules/`), remove `.env`/`dist` from version control (git rm --cached), rotate the anon key if it was ever pushed, move to per-environment env injection.

### S2 — No verifiable Row Level Security; entire DB accessed directly from browser with anon key
- Severity: **Critical**
- Files: `src/lib/supabase.js:10,16-232` (all table + storage calls); no policy files in repo
- Description: Frontend performs `select/insert/update/delete` on `orders`, `order_items`, `products`, `categories`, `admins` and `storage.from('payment-screenshots')` using only the anon key. No RLS policies, migrations, or Storage rules are versioned here, so admin-only access cannot be confirmed. If RLS is permissive/disabled, anyone holding the public anon key can read customer PII, alter prices/statuses, and delete data.
- Fix: Enable RLS on all tables + Storage bucket; create policies that only allow `authenticated` users whose `auth.uid()` exists in `admins` (use `security definer` helper, e.g. `is_admin()`); deny anon; add migrations to repo; verify with Supabase SQL editor + service-role tests.

### S3 — Authorization enforced only on the client
- Severity: **Critical**
- Files: `src/components/ProtectedRoute.jsx:6-24`, `src/hooks/useAdmin.js:19-33`, `src/pages/Login.jsx:66-77`
- Description: "Is admin?" is decided by a client-side `admins` lookup and a Zustand flag. An attacker can bypass the UI and call Supabase endpoints directly. There is no server-side role claim (custom JWT claim), edge-function check, or RLS role enforcement visible in code.
- Fix: Same as S2 plus short-lived admin custom claim or server-side check; never rely on `ProtectedRoute` alone.

### S4 — Unsigned Cloudinary upload preset exposed; abusable upload endpoint
- Severity: **High**
- Files: `.env:5-6`, `src/lib/cloudinary.js:16-27`, `src/components/ProductImageUpload.jsx:9-38`
- Description: Unsigned preset `Mixorginal_products` + cloud name are public in the bundle. Anyone can POST arbitrary images to the account's `product-images` folder, burning storage/transform quota. Client-side type (MIME prefix) and 5 MB checks are trivially bypassed; no server-side allowlist, size cap, or signed-upload flow.
- Fix: Switch to signed uploads (server/edge function generates signature), restrict preset (folder, file types, max size), add Cloudinary upload restrictions + monitoring; keep client checks only as UX.

### S5 — Private payment receipts reachable via long-lived bearer URLs; insecure fallback to HTTP
- Severity: **High**
- Files: `src/lib/supabase.js:126-143`, `src/pages/OrderDetail.jsx:446-465`
- Description: `createSignedUrl(filePath, 3600)` links grant 1-hour anonymous read to payment screenshots (sensitive financial PII). The UI offers `download` + `target=_blank`, encouraging redistribution; no watermarking, audit log, or IP binding. Lines 129-131 return any `http://` URL as-is, permitting mixed-content HTTP receipt URLs.
- Fix: Make bucket private, shorten TTL, serve via authenticated proxy/edge function with audit logging, add `rel="noopener noreferrer"`, reject non-HTTPS URLs, consider masking/redaction.

### S6 — Search-string injection into PostgREST filters (filter breakage / wildcard abuse)
- Severity: **Medium**
- Files: `src/lib/supabase.js:29-32`, `src/lib/supabase.js:155-157`
- Description: Raw `search.trim()` is interpolated into `.or('full_name.ilike.%..%,phone.ilike.%..%')` and `.ilike('name', '%..%')`. Characters `%, _, ,, (, ), ", \, *` can break the filter syntax or turn a lookup into a broad wildcard scan (`%` returns everything). `supabase-js` does not escape PostgREST `or` strings.
- Fix: Sanitize/escape PostgREST reserved chars (e.g. replace `,` `(` `)` `"` `\` and escape `%_` or reject them), enforce max length, and wrap query building in try/catch with safe fallback.

### S7 — Over-fetching PII with `SELECT *`
- Severity: **Medium**
- Files: `src/lib/supabase.js:22,43-44,66-70`, `src/pages/Login.jsx:66-70`, `src/hooks/useAdmin.js:19-23`
- Description: `fetchAllOrders`, `fetchOrderById`, `admins.select('*')` pull every column (names, emails, phones, addresses, notes, payment paths) to every admin browser, maximizing breach impact and logging exposure. Dashboard also pulls all orders (see Bugs).
- Fix: Select only needed columns; mask PII in list views; avoid `*` on `admins`.

### S8 — No brute-force / rate-limit / lockout on login + user-enumerating errors
- Severity: **Medium**
- Files: `src/pages/Login.jsx:42-91`
- Description: No captcha, attempt counter, or lockout. Error messages distinguish "Invalid email or password" (Supabase) from "Access denied. This account does not have administrative privileges." letting attackers enumerate which emails are valid non-admin vs admin accounts.
- Fix: Generic "Invalid credentials" message, add Supabase Auth rate limits + captcha (e.g. Turnstile), client-side backoff, and log/alert on repeated failures.

### S9 — Arbitrary status/tracking/notes writes; no server-side whitelist or length limits
- Severity: **Medium**
- Files: `src/lib/supabase.js:60-94`, `src/pages/OrderDetail.jsx:87-131`, `src/pages/Categories.jsx:61-85`
- Description: `updateOrderStatus(id, status)` writes any string; UI select is the only guard. Tracking/notes/category `accent_color` have no length, charset, or format checks (accent color free-text is only constrained by `<input type=color>` in one path). Direct API callers can inject overlong or malicious strings.
- Fix: DB `CHECK` constraints / enums for `status`, length limits on tracking/notes/name, regex `^#[0-9a-fA-F]{6}$` for colors; validate in Zod + RLS/trigger.

### S10 — Raw Supabase error messages surfaced to users (info disclosure)
- Severity: **Low**
- Files: `src/pages/Orders.jsx:63`, `src/pages/Dashboard.jsx:43`, `src/pages/Products.jsx:49`, `src/pages/Categories.jsx:39`, `src/pages/AddEditProduct.jsx:90,124`, plus `alert(err.message)` in `Products.jsx:74,94`, `Orders.jsx:90`, `OrderDetail.jsx:96,112,127,140`
- Description: Database/driver messages (table names, constraint details) are rendered in UI banners and `alert()` dialogs, aiding reconnaissance.
- Fix: Log full error to console/monitoring; show generic user message.

### S11 — Missing auth-state subscription; stale/revoked sessions stay usable in UI
- Severity: **Medium**
- Files: `src/hooks/useAdmin.js:8-46`
- Description: Only a one-time `getSession()` runs; no `onAuthStateChange` listener, no token-refresh handling, no sign-out on `TOKEN_REFRESHED` failure or admin-row deletion. A revoked admin can keep using the loaded SPA until reload.
- Fix: Subscribe to `supabase.auth.onAuthStateChange`, re-validate `admins` row on `SIGNED_IN/TOKEN_REFRESHED`, clear on `SIGNED_OUT`, unsubscribe on unmount.

### S12 — No security headers / CSP; third-party font CDN without SRI
- Severity: **Low**
- Files: `index.html:9-14`, `vite.config.js:6-13`
- Description: No Content-Security-Policy, HSTS, X-Frame-Options, or Referrer-Policy (no server config in repo). Google Fonts loaded without integrity hash; if the CDN is compromised, JS/CSS injection runs in the admin origin with access to the Supabase session.
- Fix: Add CSP (`default-src 'self'`, allow Supabase/Cloudinary/Fonts explicitly), `frame-ancestors 'none'`, SRI or self-host fonts, enforce HTTPS/HSTS at hosting layer.

---

## 5. 🟡 Bugs & Code Issues

### B1 — `TopBar` always shows "Admin" (hook return mismatch)
- Files: `src/components/TopBar.jsx:6`, `src/hooks/useAdmin.js:40-45`
- Problem: `useAdmin()` returns only `{ logout }`, but `TopBar` destructures `{ adminUser, logout }`, so `adminUser` is always `undefined` and line 20 falls back to `'Admin'`. The logged-in email never displays.
- Fix: Return `{ adminUser, session, isLoading, logout }` from `useAdmin` (or read `useAdminStore()` directly in `TopBar`).

### B2 — Dashboard recent-orders table always shows "Anonymous Customer"
- Files: `src/lib/supabase.js:240-244`, `src/pages/Dashboard.jsx:326-327,317`
- Problem: `getDashboardStats()` selects only `id, total_price, status, created_at`, but the UI reads `order.full_name`. Result: every recent row renders the fallback. Also `recentOrders = orders.slice(0,5)` reuses the KPI query instead of a dedicated ordered/limited query.
- Fix: Include `full_name, created_at` (and limit 5 server-side with `.order().limit(5)`), or fetch recent orders separately.

### B3 — Dashboard fetches entire `orders` table into the browser
- Files: `src/lib/supabase.js:238-327`
- Problem: No pagination/aggregation; all rows downloaded to compute counts/revenue/charts. Breaks at scale (memory, bandwidth, slow render) and leaks full history.
- Fix: Server-side aggregation (Supabase RPC/view or `count` + filtered sums), paginate chart data.

### B4 — UTC vs local date bug in revenue + 7-day chart
- Files: `src/lib/supabase.js:251-254,268-283,292-312`
- Problem: `toISOString().slice(0,10)` is UTC while merchants operate in local (Egypt) time; orders near midnight are attributed to the wrong day/month. `new Date(order.created_at)` parsing adds further TZ drift.
- Fix: Compute day boundaries in `Africa/Cairo` (or store TZ-aware date keys server-side).

### B5 — Claimed "auto-delete rejected after 10 days" is not implemented
- Files: `src/pages/OrderDetail.jsx:224-236`
- Problem: Banner states rejected orders "will be automatically deleted after 10 days" but no cron/edge function/trigger exists in the repo.
- Fix: Remove/hedge copy or implement scheduled cleanup (pg_cron / scheduled edge function).

### B6 — Storage delete path inconsistent with signed-URL path (orphaned receipts)
- Files: `src/lib/supabase.js:96-107` vs `src/lib/supabase.js:126-143`
- Problem: Delete prepends `receipts/` while signed-URL creation uses the raw stored value. If the column already contains `receipts/...` it works; if it contains a full URL (`http...`) delete tries to remove `receipts/https://...` (always misses) yet DB delete still proceeds. Orphaned files accumulate; errors are silently swallowed by design.
- Fix: Normalize to store only the bucket-relative key; if value starts with `http`, extract key or skip storage delete + warn; surface storage errors.

### B7 — Expired signed URLs have no refresh/error state
- Files: `src/pages/OrderDetail.jsx:70-74,446-472`
- Problem: 1-hour URL is fetched once; after expiry the `<img>` breaks with no retry. `getPaymentScreenshotSignedUrl` returns `null` on error, UI shows "No screenshot" which is misleading.
- Fix: Distinguish loading/error/missing states; add retry button that re-calls `createSignedUrl`.

### B8 — New-product `price` default type violates Zod schema
- Files: `src/pages/AddEditProduct.jsx:46-63,21-26`
- Problem: `defaultValues.price = ''` (string) while schema requires `number >= 0.01`. With `valueAsNumber`, empty input becomes `NaN` and immediately fails validation; create-mode UX is confusing.
- Fix: Default to `undefined`/`''` with `z.preprocess` coercion or `valueAsNumber` + `z.number().or(z.nan())` transform; keep `0` out until user types.

### B9 — Uncontrolled `setTimeout` success banners (memory leak / set-state-after-unmount)
- Files: `src/pages/OrderDetail.jsx:55-58`, `src/pages/Categories.jsx:26-29`
- Problem: `setTimeout(() => setSuccessMessage(''), 3000)` is never cleared; rapid updates stack timers and can fire after unmount (React warning) or hide a newer message early.
- Fix: Store timer ref, clear on unmount/new message, or use a toast library.

### B10 — Category accent-color free-text accepts invalid CSS
- Files: `src/pages/Categories.jsx:213-219,69-72`
- Problem: Text field writes any string to `accent_color`; invalid values break swatch rendering (`style={{backgroundColor}}` silently fails) and pollute the storefront theme.
- Fix: Validate `/^#[0-9A-Fa-f]{6}$/` client + DB CHECK; revert on invalid.

### B11 — `alert()` for operational errors + noisy console errors
- Files: `src/pages/Products.jsx:74,94`, `src/pages/Orders.jsx:90`, `src/pages/OrderDetail.jsx:96,112,127,140`, `src/pages/Categories.jsx:63,81`
- Problem: Blocking `alert()` dialogs, no inline recovery, no retry for mutations (featured toggle reverts but delete does not refetch counts).
- Fix: Inline error banners + toast + refetch; remove `alert`.

### B12 — Dead code / config drift
- Files: `vite.config.js:8-12` (`@` alias never imported), `src/pages/OrderDetail.jsx:15` (`Clock` imported, unused), `src/components/TopBar.jsx:6` (broken `adminUser`), `postcss.config.js` (fine but no CSS nesting/bundling safeguards)
- Problem: Unused alias/imports increase bundle lint noise; missing ErrorBoundary means any render throw blanks the whole admin.
- Fix: Remove unused imports/alias, add React `ErrorBoundary` around routes, add ESLint + `vite build` in CI.

---

## 6. Dependencies & Outdated Packages

`npm audit` (Sep 2026): **4 vulnerabilities (3 moderate, 1 high)** — all fixable only via breaking major bumps.

| Package | Installed | Latest (npm outdated) | Known issue |
|---|---|---|---|
| `vite` | 5.4.21 | 8.3.0 | **High**: `server.fs.deny` bypass on Windows (GHSA-fx2h-pf6j-xcff, CVSS 7.5) + path traversal via `.map` (GHSA-4w7w-66w2-5vf9) + NTLMv2 UNC leak (GHSA-v6wh-96g9-6wx3). Dev-server scope, but upgrade advised |
| `esbuild` (via Vite) | ≤0.24.2 | — | Moderate: dev-server request forgery/response read (GHSA-67mh-4wv8-2f99) |
| `react-router` / `react-router-dom` | 6.26.2 / 6.30.6 | 7.18.4 | Moderate: open redirect via backslash (GHSA-wrjc-x8rr-h8h6) + constructor injection via `deserializeErrors` SSR hydration (GHSA-337j-9hxr-rhxg, CVSS 6.1) |
| `react` / `react-dom` | 18.3.1 | 19.3.0 | Major behind; React 19 requires testing (no tests in repo) |
| `recharts` | 2.15.4 | 3.10.1 | Major behind; API changes in v3 |
| `tailwindcss` | 3.4.19 | 4.3.3 | Major behind; v4 uses new Vite plugin + config format |
| `zod` | 3.25.76 | 4.6.5 | Major behind; v4 changes coercion/error API |
| `zustand` | 4.5.7 | 5.0.15 | Major behind |
| `@hookform/resolvers` | 3.10.0 | 5.9.1 | Major behind; must match Zod major |
| `@vitejs/plugin-react` | 4.7.0 | 6.1.1 | Major behind; must match Vite major |
| `lucide-react` | 0.441.0 | 1.47.0 | Minor/major drift; icon renames possible |
| `@supabase/supabase-js` | 2.45.4 | 2.x latest | Behind within v2; upgrade to latest 2.x for Auth/Storage fixes |

No abandoned packages detected, but **no lockfile auditing in CI, no Dependabot/Renovate, no tests** — upgrades are risky. No direct JWT/crypto deps to review (auth delegated to Supabase).

---

## 7. Recommendations Summary

**P0 — Fix before any production use with real customer data:**
1. Audit + lock down Supabase RLS on `orders`, `order_items`, `products`, `categories`, `admins`, and `payment-screenshots` bucket; add migrations to the repo (S2, S3).
2. `.gitignore` + purge `.env`/`dist` from history, rotate Supabase anon key if ever pushed (S1).
3. Move Cloudinary to signed uploads with server-side restrictions (S4).
4. Fix authorization model: admin custom claim or edge-function gate; add `onAuthStateChange` re-validation (S3, S11).

**P1 — Fix this week:**
5. Sanitize search inputs for PostgREST; add length limits (S6).
6. Replace `SELECT *` with minimal columns; mask PII in lists (S7).
7. Generic login errors + Supabase rate limit/captcha + alerting (S8).
8. Fix `TopBar`/`useAdmin` return and dashboard `full_name` + full-table fetch (B1, B2, B3).
9. Correct storage key normalization + signed-URL refresh UX (B6, B7).
10. Upgrade `vite`, `react-router-dom`, `esbuild` (transitive) past audited CVEs; then plan React 19 / Router 7 / Tailwind 4 / Zod 4 migration behind tests (Sec. 6).

**P2 — Harden and clean:**
11. DB CHECKs/enums for `status`, hex regex for colors, length caps for notes/tracking (S9).
12. Generic user-facing errors, remove `alert()` (S10, B11).
13. CSP/security headers, HTTPS-only receipt URLs, self-host fonts or SRI (S12, S5).
14. Fix TZ date logic, remove false auto-delete copy or implement pg_cron cleanup, validate price defaults and color input, clear banner timers, add ErrorBoundary + ESLint + CI + tests (B4, B5, B8-B12).

*If a section has nothing to report: None found — not applicable; all sections above contain findings.*
