import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { EventCard } from "@/components/EventCard";

export const Route = createFileRoute("/events/")({
  head: () => ({
    meta: [
      { title: "Photo Galleries by Event — Visual Axis" },
      {
        name: "description",
        content:
          "Every Visual Axis event gallery, sorted by date. Find your event and buy your photos.",
      },
      { property: "og:title", content: "Photo Galleries by Event — Visual Axis" },
      {
        property: "og:description",
        content: "Every Visual Axis event gallery, sorted by date.",
      },
    ],
  }),
  component: EventsPage,
});

function EventsPage() {
  const { data: events, isLoading } = useQuery({
    queryKey: ["events", "top-level"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug, location, event_date, cover_url")
        .is("parent_id", null)
        .eq("published", true)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <p className="eyebrow">Galleries</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Browse every event</h1>
      <div className="axis-rule mt-6" />

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
