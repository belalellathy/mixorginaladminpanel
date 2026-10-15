import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
//
// SECURITY NOTE — clickjacking / framing rules (`frame-ancestors`,
// `X-Frame-Options`) and HSTS can ONLY be delivered as HTTP response headers.
// Browsers ignore them in <meta> tags, which is why index.html intentionally
// contains no CSP / X-Frame-Options meta (only <meta name="referrer">, which
// is valid in HTML). Enforcement lives here for localhost / `vite preview`,
// and in vercel.json (rewrites + headers) for production — vercel.json is
// the source of truth there, kept in sync with `prodCsp` below.
//
// Production CSP, directive by directive:
// - default-src 'self': deny everything not explicitly allowed.
// - script-src 'self': Vite emits external module bundles only (no inline
//   scripts in dist/index.html).
// - style-src 'self' 'unsafe-inline': Tailwind ships one compiled stylesheet,
//   but React/Recharts set inline style attributes (covered by style-src,
//   which style-src-attr falls back to), so 'unsafe-inline' is required.
// - font-src 'self': Inter is self-hosted at public/fonts/inter.woff2.
// - img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co:
//   product images (Cloudinary), payment-proof signed URLs (Supabase Storage),
//   data-URI icons, blob: file-preview object URLs.
// - connect-src 'self' https://*.supabase.co wss://*.supabase.co
//   https://api.cloudinary.com: Supabase REST/Auth/Storage + the
//   cloudinary-sign Edge Function live on the project origin (subdomain varies
//   per environment, hence the subdomain wildcard — never a bare "*"), plus
//   direct Cloudinary upload calls.
// - frame-ancestors 'none' (+ X-Frame-Options DENY below): admin must never
//   be framed (clickjacking). base-uri/form-action 'self', object-src 'none'.
//

//
// Strict policy for production builds (served by `vite preview` locally and
// by the host in production — the host version additionally adds HSTS, which
// must never be sent over plain-http localhost).
const prodCsp =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'"

// Relaxed policy for `vite dev` only: the dev server injects inline module
// scripts and uses a ws:/wss: HMR websocket, so script-src needs
// 'unsafe-inline' 'unsafe-eval' and connect-src needs ws:/wss:. Never copy
// this relaxed policy to production.
const devCsp =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co; connect-src 'self' ws: wss: https://*.supabase.co https://api.cloudinary.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Content-Security-Policy': devCsp,
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
  preview: {
    headers: {
      'Content-Security-Policy': prodCsp,
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
})
