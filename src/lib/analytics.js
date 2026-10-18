// Vercel Web Analytics URL sanitizer.
// The admin panel exposes record IDs (/orders/:id, /products/:id/edit); raw IDs
// must never reach a third-party analytics dashboard, and any unexpected
// query/hash content is dropped too.

// Explicit route patterns first — most specific (products/edit) wins.
const DYNAMIC_ROUTES = [
  { pattern: /^\/products\/[^/]+\/edit$/, replacement: '/products/:id/edit' },
  { pattern: /^\/orders\/[^/]+$/, replacement: '/orders/:id' },
];

// Generic fallback: any UUID-shaped path segment is replaced with :id.
const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Redacts record IDs, query strings, and hashes from page events.
 * Returns null (event dropped) when parsing fails — intentionally
 * fail-closed rather than sending the unsanitized URL.
 */
export function beforeSend(event) {
  try {
    const url = new URL(event.url);
    url.search = '';
    url.hash = '';

    for (const { pattern, replacement } of DYNAMIC_ROUTES) {
      if (pattern.test(url.pathname)) {
        url.pathname = replacement;
        return { ...event, url: url.toString() };
      }
    }

    url.pathname = url.pathname
      .split('/')
      .map((seg) => (UUID_SEGMENT_RE.test(seg) ? ':id' : seg))
      .join('/');

    return { ...event, url: url.toString() };
  } catch {
    return null;
  }
}
