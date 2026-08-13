import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Camera, Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Visual Axis — Find & Buy Your Event Photos" },
      {
        name: "description",
        content:
          "Browse Visual Axis galleries by event, find your photos and buy high-resolution downloads or prints securely online.",
      },
      { property: "og:title", content: "Visual Axis — Find & Buy Your Event Photos" },
      {
        property: "og:description",
        content: "Browse galleries by event and buy your photos as downloads or prints.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { data: events } = useQuery({
    queryKey: ["home-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, name, slug, location, event_date, cover_url")
        .eq("published", true)
        .order("event_date", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["home-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, description")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div>
      <section className="border-b border-border">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
          <div>
            <p className="eyebrow">Event · Sport · Lifestyle photography</p>
            <h1 className="mt-4 text-4xl leading-[1.05] font-semibold sm:text-6xl">
              Every moment has an
              <span className="text-primary"> axis</span>. We find yours.
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground">
              Browse galleries by event, spot yourself in the frame, and buy a high-resolution
              download or a printed copy. Paid securely online with Yoco.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/events">
                  Browse galleries <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/about">How it works</Link>
              </Button>
            </div>
          </div>
          <div className="grid gap-4 self-center">
            {[
              { icon: Camera, title: "Shot at the event", body: "Galleries go live shortly after the shoot." },
              { icon: Download, title: "Instant download", body: "Watermark-free high-resolution files." },
              { icon: Printer, title: "Printed & delivered", body: "Order a professional print of any frame." },
            ].map((f) => (
              <div key={f.title} className="panel flex gap-4 p-5">
                <f.icon className="h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-display font-semibold">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Categories</p>
            <h2 className="mt-2 text-2xl font-semibold">Browse by type of shoot</h2>
          </div>
        </div>
        <div className="axis-rule mt-6" />
        {categories && categories.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/events"
                search={{ category: c.slug }}
                className="panel p-5 transition-colors hover:border-primary"
              >
                <p className="font-display text-lg font-semibold">{c.name}</p>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {c.description ?? "View galleries"}
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            Categories will appear here once they have been added.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Latest</p>
            <h2 className="mt-2 text-2xl font-semibold">Recent galleries</h2>
          </div>
          <Link to="/events" className="text-sm text-primary hover:opacity-80">
            View all
          </Link>
        </div>
        <div className="axis-rule mt-6" />
        {events && events.length > 0 ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        ) : (
          <div className="panel mt-6 p-10 text-center">
            <p className="font-display text-lg font-semibold">No galleries published yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              New event galleries will be listed here as soon as they are uploaded.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
