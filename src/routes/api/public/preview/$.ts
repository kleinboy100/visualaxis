import { createFileRoute } from "@tanstack/react-router";

function env(...names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  return undefined;
}

export const Route = createFileRoute("/api/public/preview/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = params._splat;
        if (!path || path.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
        const key = env(
          "SUPABASE_PUBLISHABLE_KEY",
          "VITE_SUPABASE_PUBLISHABLE_KEY",
          "SUPABASE_ANON_KEY",
        );
        if (!url || !key) {
          return new Response("Preview service not configured", { status: 500 });
        }

        const objectUrl = `${url.replace(/\/$/, "")}/storage/v1/object/photo-previews/${path}`;
        const headers: Record<string, string> = { apikey: key };
        // Legacy anon keys are JWTs and may also be sent as a bearer token.
        if (key.split(".").length === 3) headers["Authorization"] = `Bearer ${key}`;
        const upstream = await fetch(objectUrl, { headers });
        if (!upstream.ok || !upstream.body) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(await upstream.arrayBuffer(), {
          headers: {
            "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
            // Photo keys are UUID-based and immutable. Let both the browser and
            // the hosting CDN keep previews so repeat gallery visits avoid this route.
            "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
            "cdn-cache-control": "public, max-age=31536000, immutable",
            "netlify-cdn-cache-control": "public, durable, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
