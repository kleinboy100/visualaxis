import { Link } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Facebook, Instagram } from "lucide-react";

export const CONTACT = {
  phone: "+27 68 795 3577",
  phoneHref: "tel:+27687953577",
  whatsappHref: "https://wa.me/27687953577",
  email: "info@visualaxismedia.co.za",
  facebook: "https://www.facebook.com/search/top?q=Visual%20Axis%20Media",
  facebookLabel: "Visual Axis Media",
  instagram: "https://www.instagram.com/visualmediaaxis",
  instagramLabel: "@visualmediaaxis",
  address: "6WQJ+F6, Potchefstroom, South Africa",
  mapHref: "https://www.google.com/maps/search/?api=1&query=6WQJ%2BF6+Potchefstroom+South+Africa",
};

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-display text-sm font-semibold">Get in touch</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>
                <a href={CONTACT.phoneHref} className="hover:text-foreground">
                  {CONTACT.phone}
                </a>
                {" · "}
                <a
                  href={CONTACT.whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-foreground"
                >
                  WhatsApp
                </a>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <a href={`mailto:${CONTACT.email}`} className="hover:text-foreground">
                {CONTACT.email}
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <a
                href={CONTACT.mapHref}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {CONTACT.address}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-display text-sm font-semibold">Follow</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li className="flex items-center gap-2">
              <Facebook className="h-3.5 w-3.5 shrink-0 text-primary" />
              <a
                href={CONTACT.facebook}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {CONTACT.facebookLabel}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Instagram className="h-3.5 w-3.5 shrink-0 text-primary" />
              <a
                href={CONTACT.instagram}
                target="_blank"
                rel="noreferrer"
                className="hover:text-foreground"
              >
                {CONTACT.instagramLabel}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="font-display text-sm font-semibold">Portal</p>
          <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
            <li>
              <Link to="/events" className="hover:text-foreground">
                Galleries
              </Link>
            </li>
            <li>
              <Link to="/account" className="hover:text-foreground">
                My purchases
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-foreground">
                About
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-muted-foreground">
          © {new Date().getFullYear()} Visual Axis Media
        </div>
      </div>
    </footer>
  );
}
