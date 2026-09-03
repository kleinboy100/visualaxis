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
      GET: async ({ params, request }) => {
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

        // Resize at the storage edge so old multi-megabyte previews do not make
        // visitors download the original preview dimensions for small cards.
        const base = url.replace(/\/$/, "");
        const renderUrl = `${base}/storage/v1/render/image/authenticated/photo-previews/${path}?width=900&quality=65&resize=contain`;
        const rawUrl = `${base}/storage/v1/object/authenticated/photo-previews/${path}`;
        const headers = new Headers({ apikey: key });
        // Legacy anon keys are JWTs and may also be sent as a bearer token.
        if (key.split(".").length === 3) headers.set("Authorization", `Bearer ${key}`);
        for (const name of ["if-none-match", "if-modified-since", "range"] as const) {
          const value = request.headers.get(name);
          if (value) headers.set(name, value);
        }
        let upstream = await fetch(renderUrl, { headers });
        // The image transformer can rate-limit or reject some files; serving the
        // stored preview is better than showing a broken image.
        if (upstream.status !== 304 && (!upstream.ok || !upstream.body)) {
          upstream = await fetch(rawUrl, { headers });
        }
        if (upstream.status === 304) {
          return new Response(null, {
            status: 304,
            headers: { "cache-control": "public, max-age=31536000, immutable" },
          });
        }
        if (!upstream.ok || !upstream.body) {
          return new Response("Not found", { status: 404 });
        }

        const responseHeaders = new Headers({
          "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
          "cache-control": "public, max-age=31536000, s-maxage=31536000, immutable",
          "cdn-cache-control": "public, max-age=31536000, immutable",
          "netlify-cdn-cache-control": "public, durable, max-age=31536000, immutable",
        });
        for (const name of ["accept-ranges", "content-length", "content-range", "etag", "last-modified"] as const) {
          const value = upstream.headers.get(name);
          if (value) responseHeaders.set(name, value);
        }

        return new Response(upstream.body, {
          status: upstream.status,
          headers: {
            ...Object.fromEntries(responseHeaders.entries()),
          },
        });
      },
    },
  },
});
