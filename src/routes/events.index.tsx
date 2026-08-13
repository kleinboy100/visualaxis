import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "@/components/EventCard";

type EventsSearch = { category?: string | undefined };

export const Route = createFileRoute("/events/")({
  validateSearch: (search: Record<string, unknown>): EventsSearch => ({
    category: typeof search["category"] === "string" ? search["category"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Photo Galleries by Event — Visual Axis" },
      {
        name: "description",
        content:
          "Every Visual Axis gallery, sorted by category and event date. Find your shoot and buy your photos.",
      },
      { property: "og:title", content: "Photo Galleries by Event — Visual Axis" },
      {
        property: "og:description",
        content: "Every Visual Axis gallery, sorted by category and event date.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { category } = Route.useSearch();

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, slug").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: events, isLoading } = useQuery({
    queryKey: ["events", category ?? "all"],
    queryFn: async () => {
      const selected = categories?.find((c) => c.slug === category);
      let query = supabase
        .from("events")
        .select("id, name, slug, location, event_date, cover_url, category_id")
        .eq("published", true)
        .order("event_date", { ascending: false });
      if (category && selected) query = query.eq("category_id", selected.id);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !category || !!categories,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="eyebrow">Galleries</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Browse every event</h1>
      <div className="axis-rule mt-6" />

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          to="/events"
          search={{}}
          className={`rounded-full border px-4 py-1.5 text-sm ${
            !category ? "border-primary text-primary" : "border-border text-muted-foreground"
          }`}
        >
          All
        </Link>
        {(categories ?? []).map((c) => (
          <Link
            key={c.id}
            to="/events"
            search={{ category: c.slug }}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              category === c.slug
                ? "border-primary text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {isLoading ? (
        <p className="mt-10 text-sm text-muted-foreground">Loading galleries…</p>
      ) : events && events.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>
      ) : (
        <div className="panel mt-8 p-12 text-center">
          <p className="font-display text-lg font-semibold">Nothing here yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Galleries appear as soon as an event has been published.
          </p>
        </div>
      )}
    </div>
  );
}
