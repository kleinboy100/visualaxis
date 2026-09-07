import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Visual Axis — Event Photography South Africa" },
      {
        name: "description",
        content:
          "Visual Axis shoots schools, clubs and sporting events across South Africa and delivers galleries you can buy from within days.",
      },
      { property: "og:title", content: "About Visual Axis" },
      {
        property: "og:description",
        content: "Event photography across South Africa, delivered as buyable online galleries.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="eyebrow">About</p>
      <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
        Photography with a fixed point of view.
      </h1>
      <div className="axis-rule mt-6" />
      <div className="mt-8 space-y-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          Visual Axis photographs teams, schools, clubs and sporting events across South Africa.
          Every shoot is published as its own gallery so athletes, parents and coaches can find
          their photos without chasing a photographer for files.
        </p>
        <p>
          Browse an event, search by photo number, and buy exactly the frames you want. Digital
          files are delivered as instant high-resolution downloads. Prints are produced on
          archival photographic paper and couriered to your address.
        </p>
        <p>
          Payments run through Yoco, so your card details never touch our servers. Every purchase
          is linked to your account, and your downloads stay available in your order history.
        </p>
      </div>

      <div className="panel mt-10 p-5">
        <p className="font-display text-sm font-semibold">Contact Visual Axis Media</p>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>
            Call / WhatsApp:{" "}
            <a href={CONTACT.phoneHref} className="text-primary hover:opacity-80">
              {CONTACT.phone}
            </a>
          </li>
          <li>
            Email:{" "}
            <a href={`mailto:${CONTACT.email}`} className="text-primary hover:opacity-80">
              {CONTACT.email}
            </a>
          </li>
          <li>
            Facebook:{" "}
            <a
              href={CONTACT.facebook}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:opacity-80"
            >
              {CONTACT.facebookLabel}
            </a>
          </li>
          <li>
            Instagram:{" "}
            <a
              href={CONTACT.instagram}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:opacity-80"
            >
              {CONTACT.instagramLabel}
            </a>
          </li>
          <li>
            Location:{" "}
            <a
              href={CONTACT.mapHref}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:opacity-80"
            >
              {CONTACT.address}
            </a>
          </li>
        </ul>
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/events">Browse galleries</Link>
        </Button>
        <Button asChild variant="outline">
          <a href={`mailto:${CONTACT.email}`}>Book a shoot</a>
        </Button>
        <Button asChild variant="outline">
          <a href={CONTACT.whatsappHref} target="_blank" rel="noreferrer">
            WhatsApp us
          </a>
        </Button>
      </div>

    </div>
  );
}
