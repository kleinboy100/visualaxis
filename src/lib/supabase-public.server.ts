import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function env(...names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
}

/**
 * Publishable-key Supabase client for server-side public reads.
 * Respects RLS as the anonymous role — never used for privileged work,
 * so no service-role key is required in the deployment environment.
 */
export function createPublicServerClient() {
  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY");
  if (!url || !key) {
    throw new Error("Missing Supabase URL / publishable key in the server environment.");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        // New-format sb_ keys are opaque, not JWTs — send them as apikey only.
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}
