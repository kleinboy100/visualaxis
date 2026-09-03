export type SelfieMatch = {
  photoId: string;
  eventSlug: string;
  eventName: string;
  previewPath: string;
  confidence: number;
};

export type SelfieMatchResult = { matches: SelfieMatch[]; scanned: number };

export function getAiKey(): string | undefined {
  return (
    process.env["LOVABLE_API_KEY"] ||
    process.env["VITE_LOVABLE_API_KEY"] ||
    process.env["AI_GATEWAY_API_KEY"] ||
    undefined
  );
}

const MAX_PHOTOS = 240; // how many published photos a single search covers
const BATCH_SIZE = 8; // event photos compared per model request
const BATCH_CONCURRENCY = 6; // model requests in flight
const DOWNLOAD_CONCURRENCY = 16;
const MODEL = "google/gemini-2.5-flash";

type PhotoRow = {
  id: string;
  preview_path: string;
  events: unknown;
};

type Encoded = { photo: PhotoRow; dataUrl: string };

async function pool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      if (item === undefined) break;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/**
 * Runs the actual selfie -> gallery comparison. Requires an AI gateway key in
 * the current runtime.
 */
export async function matchSelfie(
  image: string,
  eventId?: string,
): Promise<SelfieMatchResult> {
  const apiKey = getAiKey();
  if (!apiKey) throw new Error("Photo matching is not configured on this deployment.");

  const { createPublicServerClient } = await import("./supabase-public.server");
  const supabasePublic = createPublicServerClient();

  let query = supabasePublic
    .from("photos")
    .select("id, preview_path, events!inner(slug, name, published)")
    .eq("events.published", true)
    .order("created_at", { ascending: false })
    .limit(MAX_PHOTOS);
  if (eventId) query = query.eq("event_id", eventId);

  const { data: photos, error } = await query;
  if (error) throw new Error("Could not load the galleries to search.");
  if (!photos || photos.length === 0) return { matches: [], scanned: 0 };

  // Download small, transformed copies of every preview in parallel — a fraction
  // of the bytes of the stored preview, so a full-gallery scan stays fast.
  const supabaseUrl = (process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "").replace(
    /\/$/,
    "",
  );
  const supabaseKey =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    "";

  const encoded: Encoded[] = [];
  await pool(photos as PhotoRow[], DOWNLOAD_CONCURRENCY, async (photo) => {
    try {
      const path = photo.preview_path.split("/").map(encodeURIComponent).join("/");
      const url = `${supabaseUrl}/storage/v1/render/image/authenticated/photo-previews/${path}?width=512&quality=65&resize=contain`;
      let res = await fetch(url, { headers: { apikey: supabaseKey } });
      if (!res.ok) {
        res = await fetch(
          `${supabaseUrl}/storage/v1/object/authenticated/photo-previews/${path}`,
          { headers: { apikey: supabaseKey } },
        );
      }
      if (!res.ok) return;
      const buf = Buffer.from(await res.arrayBuffer());
      encoded.push({
        photo,
        dataUrl: `data:${res.headers.get("content-type") || "image/jpeg"};base64,${buf.toString("base64")}`,
      });
    } catch {
      /* skip unreadable previews */
    }
  });

  if (encoded.length === 0) return { matches: [], scanned: 0 };

  const batches: Encoded[][] = [];
  for (let i = 0; i < encoded.length; i += BATCH_SIZE) {
    batches.push(encoded.slice(i, i + BATCH_SIZE));
  }

  const matches: SelfieMatch[] = [];
  let rateLimited = false;

  await pool(batches, BATCH_CONCURRENCY, async (batch) => {
    const content: Array<Record<string, unknown>> = [
      {
        type: "text",
        text:
          "Image 0 is a reference portrait of one person. The following images are event photos, numbered from 1. " +
          "For each event photo decide whether the reference person appears anywhere in it — including in the background, " +
          "partially turned away, wearing sports kit or a helmet, blurry, or small in a group. Match on facial structure, " +
          "hair, skin tone and build; ignore differences in lighting, angle, expression and clothing. " +
          'Reply with strict JSON only: {"matches":[{"index":<event photo number>,"confidence":<0-1>}]}. ' +
          "Include every event photo where the person plausibly appears (confidence 0.3 or higher). " +
          'If none, reply {"matches":[]}.',
      },
      { type: "image_url", image_url: { url: image } },
      ...batch.map((e) => ({ type: "image_url", image_url: { url: e.dataUrl } })),
    ];

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL,
          messages: [{ role: "user", content }],
          temperature: 0,
        }),
      });
    } catch {
      return;
    }

    if (res.status === 429) {
      rateLimited = true;
      return;
    }
    if (!res.ok) {
      console.error("AI selfie search batch failed", res.status, await res.text());
      return;
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

    for (const m of parsed.matches ?? []) {
      const hit = batch[Number(m.index) - 1];
      if (!hit) continue;
      const confidence = Math.max(0, Math.min(1, Number(m.confidence) || 0.5));
      if (confidence < 0.3) continue;
      const ev = hit.photo.events as unknown as { slug: string; name: string };
      matches.push({
        photoId: hit.photo.id,
        eventSlug: ev.slug,
        eventName: ev.name,
        previewPath: hit.photo.preview_path,
        confidence,
      });
    }
  });

  if (matches.length === 0 && rateLimited) {
    throw new Error("Too many searches right now. Please try again shortly.");
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  return { matches, scanned: encoded.length };
}
