import * as Sentry from '@sentry/react';

/**
 * Sentry error monitoring for the admin panel (error capture only — no
 * Session Replay). Disabled entirely (no-op) when VITE_SENTRY_DSN is not set,
 * so local dev without the env var neither errors nor reports.
 *
 * This panel DISPLAYS customer PII (orders: full_name, phone, address, email,
 * payment screenshots) and holds the admin's own Supabase Auth session.
 * Every key name/effects below are specific to this repo — do not merge
 * blindly with the storefront's scrubber.
 */

const SENSITIVE_KEYS = new Set([
  // Customer PII displayed by the orders views
  'full_name',
  'email',
  'phone',
  'address',
  'shipping_name',
  'receipt_path',
  'payment_screenshot_url',
  'signedScreenshotUrl',
  'tracking_number',
  'notes',
  // Admin-typed customer search terms (+ its network form)
  'searchInput',
  'searchTerm',
  // Admin's own identity / auth session material
  'adminUser',
  'admin_email',
  'password',
  'access_token',
  'refresh_token',
  'apikey',
  'authorization',
]);

// String patterns scrubbed from breadcrumbs, messages, URLs, and any extra text.
const PII_PATTERNS = [
  /\b[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+\b/gi,       // emails
  /(?:\+?\d[\d\s().-]{6,}\d)/g,                               // phone-like runs
  // Supabase data-plane URLs (rest/auth/storage/functions): query strings
  // carry URL-encoded customer PII and the project ref — redact wholesale.
  /(\w+:\/\/)[^\s]*\.supabase\.co[^\s]*/gi,
  // Any Cloudinary endpoint (both res. delivery URLs and api. upload POSTs).
  /(\w+:\/\/)[^\s]*cloudinary\.com[^\s]*/gi,
  // Edge function endpoints (cloudinary-sign is called with a Bearer token).
  /(\w+:\/\/)[^\s]*\/functions\/v1\/[^\s]*/gi,
  /receipts\/[A-Za-z0-9._-]+/g,                               // bare receipt file paths
  /Bearer\s+[\w.~+/=-]{10,}/gi,                               // auth tokens anywhere
];

const REDACTED = '[REDACTED]';

function scrubString(value) {
  let out = value;
  for (const pattern of PII_PATTERNS) out = out.replace(pattern, REDACTED);
  return out;
}

/** Recursively redact sensitive keys (any depth) and scrub PII strings. */
function scrub(value, keyName, seen = new WeakMap()) {
  // 1. Key-name match kills the whole subtree (cheapest, most precise redaction)
  if (keyName && SENSITIVE_KEYS.has(keyName)) return REDACTED;

  if (typeof value === 'string') return scrubString(value);
  if (typeof value === 'number' || value == null || typeof value === 'boolean') return value;

  // Bail on non-plain objects (fns, DOM nodes, File, Blob, FormData, etc.)
  if (typeof value !== 'object') return REDACTED;
  if (seen.has(value)) return '[Circular]';
  seen.set(value, true);

  if (Array.isArray(value)) return value.map((item) => scrub(item, undefined, seen));

  const out = {};
  for (const [key, val] of Object.entries(value)) out[key] = scrub(val, key, seen);
  return out;
}

export const SENTRY_ENABLED = Boolean(import.meta.env.VITE_SENTRY_DSN);

export function initSentry() {
  if (!SENTRY_ENABLED) return; // no-op without a DSN — local dev stays silent

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    // Error capture only: tracesSampleRate low; no Session Replay ever.
    tracesSampleRate: 0.1,
    environment: import.meta.env.PROD ? 'production' : 'development',
    sendDefaultPii: false, // belt: never attach user ip/emails/headers by default
    beforeSend(event) {
      // Scrub request, breadcrumbs, extras, contexts, tags; drop user identity.
      try {
        if (event.request) event.request = scrub(event.request);
        if (event.breadcrumbs) event.breadcrumbs = scrub(event.breadcrumbs);
        if (event.extra) event.extra = scrub(event.extra);
        if (event.contexts) event.contexts = scrub(event.contexts);
        if (event.tags) event.tags = scrub(event.tags);
        if (event.user) event.user = undefined; // anonymous only — admins are never identified
        return event;
      } catch {
        // fail-closed: if the scrubber itself throws, this event is dropped
        // entirely (null), never sent unscrubbed — an admin console that
        // renders customer PII cannot risk a leak for one crash report.
        return null;
      }
    },
  });
}
