import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
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

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : categories && categories.length > 0 ? (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/events"
              search={{ category: c.slug }}
              className="panel group flex min-h-28 flex-col justify-between p-4 transition-colors hover:border-primary sm:p-6"
            >
              <span className="font-display text-base font-semibold sm:text-lg">{c.name}</span>
              <ArrowRight className="mt-4 h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      ) : (
        <div className="panel mt-8 p-12 text-center">
          <p className="font-display text-lg font-semibold">No categories yet</p>
        </div>
      )}

    </div>
  );
}
