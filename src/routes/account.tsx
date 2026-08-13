import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { formatZar } from "@/lib/format";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your orders — Visual Axis" },
      {
        name: "description",
        content: "View your Visual Axis orders, download purchased photos and track print deliveries.",
      },
      { property: "og:title", content: "Your orders — Visual Axis" },
      { property: "og:description", content: "Your Visual Axis order history and downloads." },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, status, total_cents, created_at, order_items(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <p className="eyebrow">Account</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Your orders</h1>
        <Button variant="outline" onClick={() => void signOut()}>
          Sign out
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{user.email}</p>
      <div className="axis-rule mt-6" />

      {!orders || orders.length === 0 ? (
        <div className="panel mt-8 p-12 text-center">
          <p className="font-display text-lg font-semibold">No orders yet</p>
          <Button asChild className="mt-6">
            <Link to="/events">Browse galleries</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              to="/orders/$orderId"
              params={{ orderId: order.id }}
              className="panel flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:border-primary"
            >
              <div>
                <p className="font-display text-sm font-semibold">
                  Order {order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(order.created_at).toLocaleString("en-ZA")} ·{" "}
                  {order.order_items?.length ?? 0} items
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`rounded-full border px-3 py-1 text-xs capitalize ${
                    order.status === "paid"
                      ? "border-primary text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {order.status}
                </span>
                <span className="text-sm">{formatZar(order.total_cents)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
