import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ScanFace } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { previewUrl } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visual Axis — Photo Portal" },
      {
        name: "description",
        content:
          "Open a category, find your event gallery and buy the original high-resolution photo.",
      },
      { property: "og:title", content: "Visual Axis — Photo Portal" },
      {
        property: "og:description",
        content: "Open a category, find your gallery, buy the original photo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: categories, isLoading } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: covers } = useQuery({
    queryKey: ["home-category-covers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("photos")
        .select("preview_path, events!inner(category_id, published)")
        .eq("events.published", true)
        .limit(200);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of data ?? []) {
        const ev = row.events as unknown as { category_id: string | null };
        if (ev.category_id && !map[ev.category_id]) map[ev.category_id] = row.preview_path;
      }
      return map;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Photo portal</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Choose a category</h1>
        </div>
        <Link to="/events" className="text-sm text-primary hover:opacity-80">
          All galleries
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
      ) : categories && categories.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((c) => {
            const cover = covers?.[c.id];
            return (
              <Link
                key={c.id}
                to="/events"
                search={{ category: c.slug }}
                className="panel group relative overflow-hidden transition-colors hover:border-primary"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                  {cover ? (
                    <img
                      src={previewUrl(cover)}
                      alt={c.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="sky-band flex h-full w-full items-center justify-center">
                      <span className="font-display text-xs font-semibold tracking-[0.2em] text-primary-foreground uppercase">
                        Visual Axis
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 p-3">
                  <span className="truncate font-display text-sm font-semibold sm:text-base">
                    {c.name}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="panel mt-8 p-12 text-center">
          <p className="font-display text-lg font-semibold">No categories yet</p>
        </div>
      )}
    </div>
  );
}
