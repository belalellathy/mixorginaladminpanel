import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // Reject anything but POST explicitly (BUG-10 in the audit flagged this too)
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Verify the JWT is real and get the user it belongs to
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Verify that user is actually an admin, not just any logged-in account
  const { data: admin, error: adminError } = await supabaseClient
    .from("admins")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return new Response(
      JSON.stringify({ error: "Forbidden: admin access required" }),
      { status: 403, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
    );
  }

  // Only now proceed to mint the Cloudinary signature
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

  return new Response(
    JSON.stringify({ timestamp, signature, api_key: CLOUD_API_KEY, cloud_name: CLOUD_NAME, folder }),
    { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
  );
});