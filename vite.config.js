import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
//
// SECURITY NOTE — clickjacking / framing rules (`frame-ancestors`,
// `X-Frame-Options`) and HSTS can ONLY be delivered as HTTP response headers.
// Browsers ignore them in <meta> tags, which is why index.html intentionally
// contains no CSP / X-Frame-Options meta (only <meta name="referrer">, which
// is valid in HTML). Enforcement lives here for localhost and in the host
// config for production. Copy ONE of the snippets below for production:
//
// --- Netlify: add a file named `_headers` in the publish directory ---
//   /*
//     Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
//     Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.cloudinary.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
//     X-Frame-Options: DENY
//     X-Content-Type-Options: nosniff
//     Referrer-Policy: strict-origin-when-cross-origin
//
// --- Vercel: add `headers.json` (or `headers` in vercel.json) ---
//   {
//     "headers": [
//       {
//         "source": "/(.*)",
//         "headers": [
//           { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains; preload" },
//           { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.cloudinary.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
//           { "key": "X-Frame-Options", "value": "DENY" },
//           { "key": "X-Content-Type-Options", "value": "nosniff" },
//           { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
//         ]
//       }
//     ]
//   }
//

// Strict policy for production builds (served by `vite preview` locally and
// by the host in production — the host version additionally adds HSTS, which
// must never be sent over plain-http localhost).
const prodCsp =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://res.cloudinary.com https://*.supabase.co; connect-src 'self' https://*.supabase.co https://api.cloudinary.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"

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
