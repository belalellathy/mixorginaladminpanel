import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Exact origins allowed to call this function from a browser. This endpoint
// mints upload credentials, so "*" is intentionally not used: a wildcard
// would let any site obtain signatures with a stolen bearer token.
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://mixorginaladminpanel.vercel.app",
];

function corsHeadersFor(req: Request): Record<string, string> {
  const base = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info",
  };
  // Reflect the Origin only when allowlisted; otherwise omit
  // Access-Control-Allow-Origin so the browser blocks the response.
  const origin = req.headers.get("Origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    return { ...base, "Access-Control-Allow-Origin": origin, "Vary": "Origin" };
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
    const CLOUD_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET")!;
    const CLOUD_API_KEY = Deno.env.get("CLOUDINARY_API_KEY")!;
    const CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME")!;

    const timestamp = Math.round(Date.now() / 1000);
    const folder = "product-images";

    const stringToSign = `folder=${folder}&timestamp=${timestamp}${CLOUD_API_SECRET}`;

    const msgBuffer = new TextEncoder().encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest("SHA-1", msgBuffer);
    const signature = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return jsonResponse(
      cors,
      { timestamp, signature, api_key: CLOUD_API_KEY, cloud_name: CLOUD_NAME, folder },
      200
    );
  } catch {
    return jsonResponse(cors, { error: "Internal Server Error" }, 500);
  }
});
