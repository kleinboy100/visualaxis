import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { formatZar, previewUrl } from "@/lib/format";
import { startCheckout } from "@/lib/shop.functions";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your cart — Visual Axis" },
      {
        name: "description",
        content: "Review your selected photos and prints, then pay securely with Yoco.",
      },
      { property: "og:title", content: "Your cart — Visual Axis" },
      { property: "og:description", content: "Review your photos and check out securely." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { session } = useAuth();
  const navigate = useNavigate();
  const checkout = useServerFn(startCheckout);
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);

  const needsPrint = cart.items.some((i) => i.productType === "print");

  const pay = async () => {
    if (!session) {
      toast.error("Please sign in to complete your purchase");
      void navigate({ to: "/auth" });
      return;
    }
    if (needsPrint && address.trim().length < 10) {
      toast.error("Enter a delivery address for your prints");
      return;
    }
    setBusy(true);
    try {
      const res = await checkout({
        data: {
          origin: window.location.origin,
          ...(needsPrint ? { shippingAddress: address.trim() } : {}),
          items: cart.items.map((i) => ({ photoId: i.photoId, productType: i.productType })),
        },
      });
      cart.clear();
      window.location.href = res.redirectUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout could not be started");
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="eyebrow">Checkout</p>
      <h1 className="mt-3 text-3xl font-semibold">Your cart</h1>
      <div className="axis-rule mt-6" />

      {cart.items.length === 0 ? (
        <div className="panel mt-8 p-12 text-center">
          <p className="font-display text-lg font-semibold">Your cart is empty</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Find your event and add the photos you want.
          </p>
          <Button asChild className="mt-6">
            <Link to="/events">Browse galleries</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {cart.items.map((item) => (
              <div
                key={`${item.photoId}-${item.productType}`}
                className="panel flex items-center gap-4 p-3"
              >
                <img
                  src={previewUrl(item.previewPath)}
                  alt={item.photoTitle}
                  className="h-16 w-24 rounded-md object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.photoTitle}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.eventName} · {item.productType === "print" ? "Print" : "Digital download"}
                  </p>
                </div>
                <span className="text-sm">{formatZar(item.priceCents)}</span>
                <button
                  aria-label="Remove item"
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => cart.remove(item.photoId, item.productType)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="panel h-fit space-y-4 p-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Items</span>
              <span>{cart.count}</span>
            </div>
            <div className="flex items-center justify-between font-display text-lg font-semibold">
              <span>Total</span>
              <span>{formatZar(cart.totalCents)}</span>
            </div>
            {needsPrint && (
              <div className="space-y-2">
                <Label htmlFor="address">Delivery address (for prints)</Label>
                <Textarea
                  id="address"
                  value={address}
                  maxLength={500}
                  rows={4}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, suburb, city, postal code"
                />
              </div>
            )}
            <Button className="w-full" onClick={pay} disabled={busy}>
              {busy ? "Starting checkout…" : "Pay with Yoco"}
            </Button>
            {!session && (
              <p className="text-xs text-muted-foreground">
                You'll be asked to sign in before payment.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
