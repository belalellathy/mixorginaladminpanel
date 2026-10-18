import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://mixorginaladminpanel.vercel.app",
];

const envAllowed = Deno.env.get("ALLOWED_ORIGINS");
const parsedOrigins = envAllowed
  ? envAllowed
      .split(",")
      .map((o) => o.trim())
      .filter((o) => o.length > 0 && o !== "*" && o !== "null")
  : [];
const ALLOWED_ORIGINS: string[] =
  parsedOrigins.length > 0 ? parsedOrigins : DEFAULT_ALLOWED_ORIGINS;

function compileOriginPattern(): RegExp | null {
  const pattern = Deno.env.get("ALLOWED_ORIGIN_PATTERN");
  if (!pattern) return null;
  try {
    return new RegExp(pattern);
  } catch {
    console.error("Invalid ALLOWED_ORIGIN_PATTERN regex configured");
    return null;
  }
}

const ALLOWED_ORIGIN_PATTERN: RegExp | null = compileOriginPattern();

function isOriginAllowed(origin: string): boolean {
  if (!origin || origin === "null" || origin === "*") {
    return false;
  }
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  if (
    ALLOWED_ORIGIN_PATTERN !== null &&
    origin.length <= 200 &&
    ALLOWED_ORIGIN_PATTERN.test(origin)
  ) {
    return true;
  }
  return false;
}

function corsHeadersFor(req: Request): Record<string, string> {
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info",
    "Vary": "Origin",
  };
  const origin = req.headers.get("Origin") ?? "";
  if (isOriginAllowed(origin)) {
    return { ...base, "Access-Control-Allow-Origin": origin };
  }
  return base;
}

function jsonResponse(
  cors: Record<string, string>,
  body: unknown,
  status: number
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/**
 * Extracts the Cloudinary public_id from a stored secure_url, or null when the
 * URL is not recognizable as one of ours. Unrecognized URLs (non-Cloudinary
 * hosts, wrong cloud name, wrong folder) are NOT treated as caller errors —
 * they are simply skipped so a stale/foreign URL never destroys an arbitrary
 * asset. Format mirrors uploadProductImage: res.cloudinary.com/<cloud>/image/
 * upload/[v<version>/]product-images/<random>.<ext>.
 */
function derivePublicId(imageUrl: string, cloudName: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com") {
    return null;
  }

  const prefix = `/${cloudName}/image/upload/`;
  if (!parsed.pathname.startsWith(prefix)) {
    return null;
  }

  let remainder = parsed.pathname.slice(prefix.length);
  // Drop the optional Cloudinary version segment (v1234567890/).
  remainder = remainder.replace(/^v\d+\//, "");
  try {
    remainder = decodeURIComponent(remainder);
  } catch {
    return null;
  }
  // Strip the file extension from the last path segment only.
  const slash = remainder.lastIndexOf("/");
  const dirname = slash === -1 ? "" : remainder.slice(0, slash + 1);
  const basename = slash === -1 ? remainder : remainder.slice(slash + 1);
  const dot = basename.lastIndexOf(".");
  const stem = dot > 0 ? basename.slice(0, dot) : basename;
  remainder = dirname + stem;

  // public_ids in our uploads are Cloudinary-random ([A-Za-z0-9_-] only);
  // anything else (encoded slashes, dot segments, wrong folders) is not one
  // of our assets and must be skipped, never destroyed.
  if (!/^product-images\/[A-Za-z0-9_-]+$/.test(remainder)) {
    return null;
  }
  return remainder;
}

async function sha1Hex(input: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  const cors = corsHeadersFor(req);

  // Preflight must be answered before the method check and before auth:
  // OPTIONS carries no Authorization header by design.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: cors });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(cors, { error: "Unauthorized" }, 401);
  }

  // Verify the JWT is real and get the user it belongs to. A bare anon key
  // yields no user here, so anyone holding only the public key gets 401.
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse(cors, { error: "Unauthorized" }, 401);
  }

  // The admin lookup uses a service-role client: it runs server-side only
  // (the key is never returned to the caller) and bypasses RLS, so the
  // check cannot be defeated by row policies on public.admins.
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: admin, error: adminError } = await adminClient
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  // Never echo internal error text to the caller.
  if (adminError || !admin) {
    return jsonResponse(cors, { error: "Forbidden" }, 403);
  }

  try {
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return jsonResponse(cors, { error: "invalid_json" }, 400);
    }
    const imageUrl =
      (requestBody as { image_url?: unknown } | null)?.image_url;
    if (typeof imageUrl !== "string" || imageUrl.length === 0) {
      return jsonResponse(cors, { error: "invalid_image_url" }, 400);
    }

    const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET")!;
    const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY")!;
    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME")!;

    const publicId = derivePublicId(imageUrl, CLOUD_NAME);
    if (!publicId) {
      // Not one of our product-images assets — skip silently, do not delete.
      return jsonResponse(cors, { deleted: false, reason: "unrecognized_url" }, 200);
    }

    // Fail-closed guard: never destroy an asset still referenced by a product
    // row or by any product_images entry. Both lookups use the service-role
    // client (bypasses RLS, so the check cannot be blinded by policies), and
    // ANY error in either check must not delete.
    const { data: productRef, error: productRefError } = await adminClient
      .from("products")
      .select("id")
      .eq("image_url", imageUrl)
      .limit(1);
    if (productRefError) {
      return jsonResponse(cors, { error: "internal_error" }, 500);
    }
    const { data: imagesRef, error: imagesRefError } = await adminClient
      .from("product_images")
      .select("id")
      .eq("image_url", imageUrl)
      .limit(1);
    if (imagesRefError) {
      return jsonResponse(cors, { error: "internal_error" }, 500);
    }
    if (
      (productRef && productRef.length > 0) ||
      (imagesRef && imagesRef.length > 0)
    ) {
      return jsonResponse(cors, { deleted: false, reason: "still_referenced" }, 200);
    }

    // Cloudinary requires signature params in alphabetical order:
    // invalidate < public_id < timestamp, secret appended raw (same helper
    // as cloudinary-sign uses for its folder/timestamp signature).
    const timestamp = Math.floor(Date.now() / 1000);
    const stringToSign = `invalidate=true&public_id=${publicId}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    const signature = await sha1Hex(stringToSign);

    const destroyBody = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: CLOUDINARY_API_KEY,
      signature,
      invalidate: "true",
    });

    const destroyResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: destroyBody.toString(),
      }
    );

    if (!destroyResponse.ok) {
      return jsonResponse(cors, { error: "cloudinary_destroy_failed" }, 502);
    }

    let result: { result?: string };
    try {
      result = (await destroyResponse.json()) as { result?: string };
    } catch {
      return jsonResponse(cors, { error: "cloudinary_destroy_failed" }, 502);
    }

    if (result.result === "ok") {
      return jsonResponse(cors, { deleted: true }, 200);
    }
    if (result.result === "not found") {
      return jsonResponse(cors, { deleted: false, reason: "not_found" }, 200);
    }
    return jsonResponse(cors, { error: "cloudinary_destroy_failed" }, 502);
  } catch {
    // No stack traces or secret values — generic failure only.
    return jsonResponse(cors, { error: "internal_error" }, 500);
  }
});
