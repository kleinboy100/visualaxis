import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="block h-4 w-1.5 bg-primary" aria-hidden />
            <span className="font-display text-base font-semibold">Visual Axis</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground">
            Event, sport and lifestyle photography. Find your frame, buy it in seconds.
          </p>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Browse</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link to="/events" className="hover:text-foreground">
                All galleries
              </Link>
            </li>
            <li>
              <Link to="/about" className="hover:text-foreground">
                About us
              </Link>
            </li>
            <li>
              <Link to="/account" className="hover:text-foreground">
                My purchases
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="eyebrow mb-3">Payments</p>
          <p className="text-muted-foreground">
            Secure card payments processed by Yoco. All prices in South African Rand.
          </p>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Visual Axis. All images remain the property of the
        photographer.
      </div>
    </footer>
  );
}
