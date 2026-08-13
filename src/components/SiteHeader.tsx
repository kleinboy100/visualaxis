import { Link } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, Menu, X, Camera } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/", label: "Home" },
  { to: "/events", label: "Galleries" },
  { to: "/about", label: "About" },
] as const;

export function SiteHeader() {
  const { user, isAdmin } = useAuth();
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50">
      {/* Top band */}
      <div className="sky-band text-primary-foreground">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/25 ring-1 ring-background/40">
              <Camera className="h-4.5 w-4.5" />
            </span>
            <span className="leading-tight">
              <span className="block font-display text-lg font-semibold tracking-tight">
                Visual Axis
              </span>
              <span className="block text-[10px] tracking-[0.22em] uppercase opacity-80">
                School Photos
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
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
