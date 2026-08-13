import { Link } from "@tanstack/react-router";
import { ShoppingBag, User as UserIcon, Menu } from "lucide-react";
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
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="block h-5 w-1.5 bg-primary" aria-hidden />
          <span className="font-display text-lg font-semibold tracking-tight">Visual Axis</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-6 text-sm md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="text-primary hover:opacity-80">
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link to="/cart" className="relative inline-flex p-2" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <Link to="/account" className="inline-flex p-2" aria-label="Account">
              <UserIcon className="h-5 w-5" />
            </Link>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
          <button
            className="inline-flex p-2 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-4 py-3 text-sm md:hidden">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="py-2" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" className="py-2 text-primary" onClick={() => setOpen(false)}>
              Admin
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
