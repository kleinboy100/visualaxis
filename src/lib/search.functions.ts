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
 *
 * If the current runtime has no AI gateway key (self-hosted deploys such as
 * Netlify), the request is forwarded to the Lovable-hosted matching endpoint.
 */
export const findPhotosBySelfie = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => selfieSchema.parse(input))
  .handler(async ({ data }): Promise<{ matches: SelfieMatch[]; scanned: number }> => {
    const { matchSelfie, getAiKey } = await import("./selfie-match.server");

    if (getAiKey()) {
      return matchSelfie(data.image, data.eventId);
    }

    const fallbackBase = (
      process.env["SELFIE_MATCH_FALLBACK_URL"] || "https://visualaxis.lovable.app"
    ).replace(/\/$/, "");

    const res = await fetch(`${fallbackBase}/api/public/selfie-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: data.image, eventId: data.eventId }),
    });

    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(detail?.error || "Photo matching failed. Please try again.");
    }

    return (await res.json()) as { matches: SelfieMatch[]; scanned: number };
  });
