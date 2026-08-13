import { Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";

export type EventCardData = {
  id: string;
  name: string;
  slug: string;
  location: string | null;
  event_date: string | null;
  cover_url: string | null;
};

export function EventCard({ event }: { event: EventCardData }) {
  return (
    <Link
      to="/events/$slug"
      params={{ slug: event.slug }}
      className="panel group overflow-hidden transition-colors hover:border-primary"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
        {event.cover_url ? (
          <img
            src={event.cover_url}
            alt={event.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="eyebrow">Visual Axis</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="font-display text-lg font-semibold">{event.name}</p>
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {event.event_date && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(event.event_date).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
