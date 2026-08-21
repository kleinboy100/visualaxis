import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar, MapPin, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/hooks/useCart";
import { formatZar, previewUrl } from "@/lib/format";
import { WatermarkedImage } from "@/components/WatermarkedImage";
import { EventCard } from "@/components/EventCard";

export const Route = createFileRoute("/events/$slug")({
  head: ({ params }) => {
    const title = `Gallery: ${params.slug.replace(/-/g, " ")} — Visual Axis`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: "View and buy high-resolution photos from this Visual Axis event gallery.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: "View and buy high-resolution photos from this Visual Axis event gallery.",
        },
      ],
    };
  },
  component: GalleryPage,
});

function GalleryPage() {
  const { slug } = Route.useParams();
  const cart = useCart();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["event", slug],
    queryFn: async () => {
      const { data: event, error } = await supabase
        .from("events")
        .select("id, name, description, location, event_date, cover_url, parent_id")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      if (!event) return null;
      const { data: children, error: childErr } = await supabase
        .from("events")
        .select("id, name, slug, location, event_date, cover_url")
        .eq("parent_id", event.id)
        .eq("published", true)
        .order("name");
      if (childErr) throw childErr;
      let parent: { name: string; slug: string } | null = null;
      if (event.parent_id) {
        const { data: p } = await supabase
          .from("events")
          .select("name, slug")
          .eq("id", event.parent_id)
          .maybeSingle();
        parent = p ?? null;
      }
      const { data: photos, error: photoErr } = await supabase
        .from("photos")
        .select("id, title, code, preview_path, digital_price_cents, print_price_cents")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });
      if (photoErr) throw photoErr;

      const childCovers: Record<string, string> = {};
      if (children && children.length > 0) {
        const { data: childPhotos } = await supabase
          .from("photos")
          .select("event_id, preview_path")
          .in(
            "event_id",
            children.map((c) => c.id),
          )
          .limit(400);
        for (const row of childPhotos ?? []) {
          if (!childCovers[row.event_id]) childCovers[row.event_id] = row.preview_path;
        }
      }
      return { event, photos: photos ?? [], children: children ?? [], parent, childCovers };
    },
  });

  if (isLoading) {
    return <p className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Gallery not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This gallery may not be published yet.
        </p>
        <Button asChild className="mt-6">
          <Link to="/events">Back to galleries</Link>
        </Button>
      </div>
    );
  }

  const { event, photos, children, parent, childCovers } = data;
  const term = search.trim().toLowerCase();
  const visible = term
    ? photos.filter(
        (p) =>
          (p.code ?? "").toLowerCase().includes(term) ||
          (p.title ?? "").toLowerCase().includes(term),
      )
    : photos;

  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      {parent ? (
        <Link
          to="/events/$slug"
          params={{ slug: parent.slug }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {parent.name}
        </Link>
      ) : (
        <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground">
          ← All events
        </Link>
      )}
      <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{event.name}</h1>
      <div className="mt-3 flex flex-wrap gap-5 text-sm text-muted-foreground">
        {event.event_date && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            {new Date(event.event_date).toLocaleDateString("en-ZA", { dateStyle: "long" })}
          </span>
        )}
        {event.location && (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            {event.location}
          </span>
        )}
        <span>{photos.length} photos</span>
      </div>
      <div className="axis-rule mt-6" />

      {children.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold">Folders</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {children.map((c) => (
              <EventCard
                key={c.id}
                event={c}
                fallbackSrc={childCovers[c.id] ? previewUrl(childCovers[c.id]!) : null}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 max-w-sm">
        <Input
          value={search}
          maxLength={60}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by photo number or title"
        />
      </div>

      {photos.length === 0 && children.length > 0 ? null : visible.length === 0 ? (
        <div className="panel mt-8 p-12 text-center">
          <p className="font-display text-lg font-semibold">No photos to show</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {photos.length === 0
              ? "Photos for this event have not been uploaded yet."
              : "No photos match your search."}
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((photo) => {
            const inDigital = cart.has(photo.id, "digital");
            const inPrint = cart.has(photo.id, "print");
            return (
              <div key={photo.id} className="panel overflow-hidden">
                <WatermarkedImage
                  className="aspect-[3/2]"
                  src={previewUrl(photo.preview_path)}
                  alt={photo.title ?? `Photo ${photo.code ?? ""} from ${event.name}`}
                />
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-display font-semibold">
                      {photo.title ?? photo.code ?? "Untitled"}
                    </span>
                    {photo.code && (
                      <span className="text-xs text-muted-foreground">#{photo.code}</span>
                    )}
                  </div>
                  <div className="grid gap-2">
                    <Button
                      size="sm"
                      variant={inDigital ? "secondary" : "default"}
                      onClick={() => {
                        cart.add({
                          photoId: photo.id,
                          eventName: event.name,
                          photoTitle: photo.title ?? photo.code ?? "Photo",
                          previewPath: photo.preview_path,
                          productType: "digital",
                          priceCents: photo.digital_price_cents,
                        });
                        toast.success("Digital photo added to cart");
                      }}
                      disabled={inDigital}
                    >
                      {inDigital ? <Check className="mr-1 h-4 w-4" /> : null}
                      Digital · {formatZar(photo.digital_price_cents)}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        cart.add({
                          photoId: photo.id,
                          eventName: event.name,
                          photoTitle: photo.title ?? photo.code ?? "Photo",
                          previewPath: photo.preview_path,
                          productType: "print",
                          priceCents: photo.print_price_cents,
                        });
                        toast.success("Print added to cart");
                      }}
                      disabled={inPrint}
                    >
                      {inPrint ? <Check className="mr-1 h-4 w-4" /> : null}
                      Print · {formatZar(photo.print_price_cents)}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
