import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Visual Axis</span>
        <div className="flex gap-5">
          <Link to="/events" className="hover:text-foreground">
            Galleries
          </Link>
          <Link to="/account" className="hover:text-foreground">
            My purchases
          </Link>
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
        </div>
      </div>
    </footer>
  );
}
