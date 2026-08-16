import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, Menu, X, Search, ScanFace } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";
import logo from "@/assets/visual-axis-logo.jpg.asset.json";


const links = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Galleries" },
  { to: "/search", label: "Search" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    void navigate({ to: "/search", search: { q: q.trim() || undefined } });
  };

  return (
    <header className="sticky top-0 z-50">
      {/* Top band */}
      <div className="sky-band text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 leading-tight">
            <img
              src={logo.url}
              alt="Visual Axis Media logo"
              className="h-10 w-10 shrink-0 rounded-md bg-background object-contain p-0.5"
            />
            <span>
              <span className="block font-display text-lg font-semibold tracking-tight">
                Visual Axis
              </span>
              <span className="block text-[10px] tracking-[0.22em] uppercase opacity-80">
                School Photos
              </span>
            </span>
          </Link>


          <form onSubmit={submit} className="mx-auto hidden w-full max-w-md md:block">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 opacity-70" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search events, folders, photo codes…"
                aria-label="Search"
                className="h-9 w-full rounded-full bg-background/25 pr-3 pl-9 text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:bg-background/35 focus:outline-none"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5">
            <Link
              to="/search"
              search={{ selfie: true }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/20 hover:bg-background/30"
              aria-label="Find my photos with a selfie"
            >
              <ScanFace className="h-4.5 w-4.5" />
            </Link>
            <Link
              to="/cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/20 hover:bg-background/30"
              aria-label="Cart"
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-background px-1 text-[10px] font-semibold text-primary">
                  {count}
                </span>
              )}
            </Link>
            {user ? (
              <Link
                to="/account"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/20 hover:bg-background/30"
                aria-label="Account"
              >
                <UserIcon className="h-4.5 w-4.5" />
              </Link>
            ) : (
              <Button asChild size="sm" variant="secondary" className="rounded-full">
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/20 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
            >
              {open ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={submit} className="mx-auto max-w-6xl px-4 pb-3 md:hidden">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 opacity-70" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events or folders…"
              aria-label="Search"
              className="h-9 w-full rounded-full bg-background/25 pr-3 pl-9 text-sm text-primary-foreground placeholder:text-primary-foreground/70 focus:bg-background/35 focus:outline-none"
            />
          </div>
        </form>
      </div>

      {/* Nav row */}
      <div className="hidden border-b border-border bg-background/90 backdrop-blur md:block">
        <nav className="mx-auto flex max-w-6xl items-center gap-1 px-4 py-2 text-sm">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-secondary-foreground font-medium" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="ml-auto rounded-full px-3.5 py-1.5 font-medium text-primary hover:bg-secondary"
            >
              Admin
            </Link>
          )}
        </nav>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-b border-border bg-background px-4 py-3 text-sm md:hidden">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="rounded-md px-2 py-2.5 hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              to="/admin"
              className="rounded-md px-2 py-2.5 font-medium text-primary hover:bg-secondary"
              onClick={() => setOpen(false)}
            >
              Admin
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
