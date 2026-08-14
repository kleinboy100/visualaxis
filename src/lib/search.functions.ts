import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const selfieSchema = z.object({
  image: z
    .string()
    .startsWith("data:image/")
    .max(4_000_000, "Please use a smaller image (max ~3MB)."),
  eventId: z.string().uuid().optional(),
});

export type SelfieMatch = {
  photoId: string;
  eventSlug: string;
  eventName: string;
  previewPath: string;
  confidence: number;
};

/**
 * Public: compares an uploaded/captured selfie against watermarked previews of
 * published galleries and returns the likely matches. Never returns originals.
 */
export const findPhotosBySelfie = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => selfieSchema.parse(input))
  .handler(async ({ data }): Promise<{ matches: SelfieMatch[]; scanned: number }> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Photo matching is not available right now.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let query = supabaseAdmin
      .from("photos")
      .select("id, preview_path, events!inner(slug, name, published)")
      .eq("events.published", true)
      .order("created_at", { ascending: false })
      .limit(12);
    if (data.eventId) query = query.eq("event_id", data.eventId);

    const { data: photos, error } = await query;
    if (error) throw new Error("Could not load the galleries to search.");
    if (!photos || photos.length === 0) return { matches: [], scanned: 0 };

    const encoded: { photo: (typeof photos)[number]; dataUrl: string }[] = [];
    for (const photo of photos) {
      const file = await supabaseAdmin.storage.from("photo-previews").download(photo.preview_path);
      if (file.error || !file.data) continue;
      const buf = Buffer.from(await file.data.arrayBuffer());
      encoded.push({
        photo,
        dataUrl: `data:${file.data.type || "image/jpeg"};base64,${buf.toString("base64")}`,
      });
    }
    if (encoded.length === 0) return { matches: [], scanned: 0 };

    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          "Image 0 is a reference portrait. The remaining images are event photos, numbered from 1. " +
          "Return strict JSON only: {\"matches\":[{\"index\":<number of the event photo>,\"confidence\":<0-1>}]} " +
          "including only event photos that very likely contain the same person as the reference. Empty list if none.",
      },
      { type: "image_url", image_url: { url: data.image } },
      ...encoded.map((e) => ({ type: "image_url", image_url: { url: e.dataUrl } })),
    ];

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
      }),
    });
    if (res.status === 429) throw new Error("Too many searches right now. Please try again shortly.");
    if (!res.ok) {
      console.error("AI selfie search failed", res.status, await res.text());
      throw new Error("Photo matching failed. Please try again.");
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = json.choices?.[0]?.message?.content ?? "";
    const raw = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);

    let parsed: { matches?: { index?: number; confidence?: number }[] } = {};
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      parsed = {};
    }

    const matches: SelfieMatch[] = [];
    for (const m of parsed.matches ?? []) {
      const idx = Number(m.index) - 1;
      const hit = encoded[idx];
      if (!hit) continue;
      const ev = hit.photo.events as unknown as { slug: string; name: string };
      matches.push({
        photoId: hit.photo.id,
        eventSlug: ev.slug,
        eventName: ev.name,
        previewPath: hit.photo.preview_path,
        confidence: Math.max(0, Math.min(1, Number(m.confidence) || 0.5)),
      });
    }

    return { matches, scanned: encoded.length };
  });
