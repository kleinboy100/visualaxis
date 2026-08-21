import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/yoco-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const raw = await request.text();
        const secret = process.env["YOCO_WEBHOOK_SECRET"];

        if (secret) {
          const id = request.headers.get("webhook-id") ?? "";
          const timestamp = request.headers.get("webhook-timestamp") ?? "";
          const signatureHeader = request.headers.get("webhook-signature") ?? "";
          const key = Buffer.from(secret.split("_")[1] ?? secret, "base64");
          const expected = createHmac("sha256", key)
            .update(`${id}.${timestamp}.${raw}`)
            .digest("base64");
          const provided = signatureHeader
            .split(" ")
            .map((part) => part.split(",")[1] ?? "")
            .filter(Boolean);
          const valid = provided.some((sig) => {
            const a = Buffer.from(sig);
            const b = Buffer.from(expected);
            return a.length === b.length && timingSafeEqual(a, b);
          });
          if (!valid) return new Response("Invalid signature", { status: 401 });
        }

        let payload: {
          type?: string;
          payload?: { metadata?: { orderId?: string }; status?: string };
        };
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const orderId = payload.payload?.metadata?.orderId;
        const status =
          payload.type === "payment.succeeded"
            ? "paid"
            : payload.type === "payment.failed"
              ? "failed"
              : null;

        if (orderId && status) {
          // Best-effort bookkeeping. The service-role key is not available in
          // every deployment, so a failure here is not fatal: the order page
          // re-verifies payment directly with Yoco before any download.
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("orders").update({ status }).eq("id", orderId);
          } catch {
            // ignore — payment status is confirmed on demand via the Yoco API
          }
        }

        return new Response("ok");
      },
    },
  },
});
