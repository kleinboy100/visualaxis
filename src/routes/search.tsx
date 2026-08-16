import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp, Search as SearchIcon, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WatermarkedImage } from "@/components/WatermarkedImage";
import { previewUrl } from "@/lib/format";
import { findPhotosBySelfie, type SelfieMatch } from "@/lib/search.functions";

type SearchParams = { q?: string | undefined; selfie?: boolean | undefined };

export const Route = createFileRoute("/search")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search["q"] === "string" && search["q"] ? search["q"] : undefined,
    selfie: search["selfie"] === true || search["selfie"] === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Find your photos — Visual Axis" },
      {
        name: "description",
        content:
          "Search Visual Axis galleries by event, category or photo code, or upload a selfie to find the photos you appear in.",
      },
      { property: "og:title", content: "Find your photos — Visual Axis" },
      {
        property: "og:description",
        content: "Search by event, or find yourself with a selfie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const { q, selfie } = Route.useSearch();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q ?? "");

  useEffect(() => setTerm(q ?? ""), [q]);

  const { data, isFetching } = useQuery({
    queryKey: ["search", q ?? ""],
    enabled: !!q,
    queryFn: async () => {
      const like = `%${q}%`;
      const [events, photos] = await Promise.all([
        supabase
          .from("events")
          .select("id, name, slug, location, event_date, cover_url")
          .eq("published", true)
          .or(`name.ilike.${like},location.ilike.${like}`)
          .limit(24),
        supabase
          .from("photos")
          .select("id, title, code, preview_path, events!inner(slug, name, published)")
          .eq("events.published", true)
          .or(`code.ilike.${like},title.ilike.${like}`)
          .limit(24),
      ]);
      return {
        events: events.data ?? [],
        photos: photos.data ?? [],
      };
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="eyebrow">Search</p>
      <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Find your photos</h1>
      <div className="axis-rule mt-5" />

      <form
        className="mt-6 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void navigate({ to: "/search", search: { q: term.trim() || undefined } });
        }}
      >
        <Input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Event, folder, location or photo code"
          aria-label="Search term"
        />
        <Button type="submit">
          <SearchIcon className="h-4 w-4" />
          Search
        </Button>
      </form>

      <SelfieSearch defaultOpen={!!selfie} />

      {q && (
        <div className="mt-10 space-y-8">
          {isFetching && <p className="text-sm text-muted-foreground">Searching…</p>}

          {!!data?.events.length && (
            <section>
              <h2 className="font-display text-lg font-semibold">Events</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.events.map((e) => (
                  <Link
                    key={e.id}
                    to="/events/$slug"
                    params={{ slug: e.slug }}
                    className="panel p-4 hover:border-primary"
                  >
                    <p className="font-display font-semibold">{e.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[e.event_date, e.location].filter(Boolean).join(" · ")}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {!!data?.photos.length && (
            <section>
              <h2 className="font-display text-lg font-semibold">Photos</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {data.photos.map((p) => {
                  const ev = p.events as unknown as { slug: string; name: string };
                  return (
                    <Link key={p.id} to="/events/$slug" params={{ slug: ev.slug }} className="panel overflow-hidden">
                      <WatermarkedImage
                        src={previewUrl(p.preview_path)}
                        alt={p.title ?? "Photo"}
                        className="aspect-[3/2] w-full"
                      />
                      <p className="truncate p-2 text-xs text-muted-foreground">{ev.name}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {!isFetching &&
            !data?.events.length &&
            !data?.photos.length && (
              <div className="panel p-10 text-center text-sm text-muted-foreground">
                Nothing matched “{q}”.
              </div>
            )}
        </div>
      )}
    </div>
  );
}

function SelfieSearch({ defaultOpen }: { defaultOpen: boolean }) {
  const run = useServerFn(findPhotosBySelfie);
  const [image, setImage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [matches, setMatches] = useState<SelfieMatch[] | null>(null);
  const [camera, setCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (defaultOpen) document.getElementById("selfie-search")?.scrollIntoView({ behavior: "smooth" });
  }, [defaultOpen]);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCamera(false);
  };

  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      setCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      }, 0);
    } catch {
      toast.error("Could not access the camera. You can upload a photo instead.");
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = Math.min(video.videoWidth || 640, 720);
    canvas.height = Math.round(((video.videoHeight || 480) / (video.videoWidth || 640)) * canvas.width);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL("image/jpeg", 0.85));
    setMatches(null);
    stopCamera();
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 8_000_000) {
      toast.error("That image is too large (max 8MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage(String(reader.result));
      setMatches(null);
    };
    reader.readAsDataURL(file);
  };

  const search = async () => {
    if (!image) return;
    setBusy(true);
    try {
      const res = await run({ data: { image } });
      setMatches(res.matches);
      if (res.matches.length === 0) toast.info("No matching photos found in the latest galleries.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Photo matching failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="selfie-search" className="panel mt-6 p-5">
      <p className="font-display text-lg font-semibold">Find me by selfie</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Upload or take a photo of yourself and we will look for you in the latest galleries.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:border-primary">
          <ImageUp className="h-4 w-4" />
          Upload photo
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {camera ? (
          <>
            <Button type="button" onClick={capture}>
              Capture
            </Button>
            <Button type="button" variant="ghost" onClick={stopCamera}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" onClick={() => void startCamera()}>
            <Camera className="h-4 w-4" />
            Take a selfie
          </Button>
        )}
        {image && (
          <Button type="button" onClick={() => void search()} disabled={busy}>
            {busy ? "Looking…" : "Find my photos"}
          </Button>
        )}
      </div>

      {camera && (
        <video
          ref={videoRef}
          playsInline
          muted
          className="mt-4 aspect-[4/3] w-full max-w-sm rounded-md bg-muted object-cover"
        />
      )}

      {image && !camera && (
        <img src={image} alt="Your selfie" className="mt-4 h-32 w-32 rounded-md object-cover" />
      )}

      {matches && matches.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {matches.map((m) => (
            <Link
              key={m.photoId}
              to="/events/$slug"
              params={{ slug: m.eventSlug }}
              className="panel overflow-hidden"
            >
              <WatermarkedImage
                src={previewUrl(m.previewPath)}
                alt={m.eventName}
                className="aspect-[3/2] w-full"
              />
              <p className="truncate p-2 text-xs text-muted-foreground">{m.eventName}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
