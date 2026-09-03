import { createFileRoute } from "@tanstack/react-router";

/**
 * Public matching endpoint. Used as a fallback by self-hosted deployments
 * (e.g. Netlify) that do not carry an AI gateway key: they forward the selfie
 * here, where the key is available.
 */
export const Route = createFileRoute("/api/public/selfie-match")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { image?: unknown; eventId?: unknown };
        try {
          body = (await request.json()) as typeof body;
        } catch {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }

        const image = typeof body.image === "string" ? body.image : "";
        const eventId = typeof body.eventId === "string" ? body.eventId : undefined;
        if (!image.startsWith("data:image/") || image.length > 4_000_000) {
          return Response.json({ error: "Invalid image." }, { status: 400 });
        }

        const { matchSelfie, getAiKey } = await import("@/lib/selfie-match.server");
        if (!getAiKey()) {
          return Response.json({ error: "Photo matching is not configured." }, { status: 503 });
        }

        try {
          const result = await matchSelfie(image, eventId);
          return Response.json(result, {
            headers: { "access-control-allow-origin": "*" },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Photo matching failed.";
          return Response.json({ error: message }, { status: 500 });
        }
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "access-control-allow-origin": "*",
            "access-control-allow-headers": "content-type",
            "access-control-allow-methods": "POST, OPTIONS",
          },
        }),
    },
  },
});
