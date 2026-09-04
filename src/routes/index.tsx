import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ScanFace } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { previewUrl } from "@/lib/format";
import { fetchFolderCovers, tilePathsFor } from "@/lib/covers";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visual Axis — Photo Portal" },
      {
        name: "description",
        content:
          "Open an event, browse the galleries and buy the original high-resolution photo.",
      },
      { property: "og:title", content: "Visual Axis — Photo Portal" },
      {
        property: "og:description",
        content: "Open an event, find your gallery, buy the original photo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: allEvents, isLoading } = useQuery({
    queryKey: ["home-events-tree"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug, cover_url, event_date, location, parent_id")
        .eq("published", true)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const events = (allEvents ?? []).filter((e) => !e.parent_id);

  const descendants: Record<string, string[]> = {};
  if (allEvents) {
    const childrenOf: Record<string, string[]> = {};
    for (const e of allEvents) {
      if (e.parent_id) (childrenOf[e.parent_id] ??= []).push(e.id);
    }
    const collect = (id: string): string[] => {
      const kids = childrenOf[id] ?? [];
      return kids.flatMap((k) => [k, ...collect(k)]);
    };
    for (const e of events) descendants[e.id] = collect(e.id);
  }

  const coverIds = allEvents?.map((e) => e.id) ?? [];
  const { data: covers } = useQuery({
    queryKey: ["home-folder-covers", coverIds.join(",")],
    enabled: coverIds.length > 0,
    queryFn: () => fetchFolderCovers(coverIds),
  });


  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Photo portal</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Choose an event</h1>
        </div>
        <Link to="/events" className="text-sm text-primary hover:opacity-80">
          All events
        </Link>
      </div>
      <div className="axis-rule mt-5" />

      <Link
        to="/search"
        search={{ selfie: true }}
        className="panel mt-6 flex items-center gap-3 p-4 transition-colors hover:border-primary"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
          <ScanFace className="h-5 w-5" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-sm font-semibold">Find me by selfie</span>
          <span className="block text-xs text-muted-foreground">
            Upload or take a photo and we will look for you in the galleries.
          </span>
        </span>
        <ArrowRight className="ml-auto h-4 w-4 text-primary" />
      </Link>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : events && events.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {events.map((e) => {
            const tiles = tilePathsFor(e.id, descendants[e.id] ?? [], covers ?? {}, 4).map(
              previewUrl,
            );
            const images: string[] = e.cover_url
              ? [e.cover_url, ...tiles].slice(0, 4)
              : tiles.slice(0, 4);
            return (
              <Link
                key={e.id}
                to="/events/$slug"
                params={{ slug: e.slug }}
                className="panel group relative overflow-hidden transition-colors hover:border-primary"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  {images.length > 0 ? (
                    <div
                      className={`grid h-full w-full gap-px ${
                        images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                      } ${images.length > 2 ? "grid-rows-2" : "grid-rows-1"}`}
                    >
                      {images.map((src, i) => (
                        <img
                          key={src}
                          src={src}
                          alt={`${e.name} preview ${i + 1}`}
                          loading="lazy"
                          decoding="async"
                          className={`h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                            images.length === 3 && i === 0 ? "row-span-2" : ""
                          }`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="sky-band flex h-full w-full items-center justify-center">
                      <span className="font-display text-xs font-semibold tracking-[0.2em] text-primary-foreground uppercase">
                        Visual Axis
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2 p-3">
                  <span className="font-display text-sm font-bold break-words sm:text-base">
                    {e.name}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="panel mt-8 p-12 text-center">
          <p className="font-display text-lg font-semibold">No events yet</p>
        </div>
      )}
    </div>
  );
}
