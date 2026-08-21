import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { formatZar, previewUrl } from "@/lib/format";
import { syncOrderStatus, getDownloadLink } from "@/lib/shop.functions";

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({
    meta: [
      { title: "Order details — Visual Axis" },
      {
        name: "description",
        content: "Your Visual Axis order summary, payment status and photo downloads.",
      },
      { property: "og:title", content: "Order details — Visual Axis" },
      { property: "og:description", content: "Order summary and downloads." },
    ],
  }),
  component: OrderPage,
});

function OrderPage() {
  const { orderId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const sync = useServerFn(syncOrderStatus);
  const download = useServerFn(getDownloadLink);

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ["order", orderId],
    enabled: !!user,
    queryFn: async () => {
      const { data: order, error } = await supabase
        .from("orders")
        .select(
          "id, status, total_cents, created_at, shipping_address, order_items(id, product_type, unit_price_cents, photo_id, photos(title, code, preview_path))",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return order;
    },
  });

  const autoDownloaded = useRef(false);

  useEffect(() => {
    if (!user || !data || data.status === "paid") return;
    let cancelled = false;
    const tick = () =>
      void sync({ data: { orderId } })
        .then(() => !cancelled && refetch())
        .catch(() => undefined);
    tick();
    const id = window.setInterval(tick, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data?.status, orderId]);

  // Automatically download purchased digital photos once payment succeeds.
  useEffect(() => {
    if (!user || !data || data.status !== "paid" || autoDownloaded.current) return;
    const digital = (data.order_items ?? []).filter((i) => i.product_type === "digital");
    if (digital.length === 0) return;
    autoDownloaded.current = true;
    void (async () => {
      for (const [index, item] of digital.entries()) {
        try {
          const res = await download({ data: { orderId, photoId: item.photo_id } });
          const name = `${item.photos?.code ?? item.photos?.title ?? "visual-axis-photo"}.jpg`;
          window.setTimeout(() => triggerDownload(res.url, name), index * 700);
        } catch {
          /* the manual download button remains available */
        }
      }
      toast.success("Payment confirmed — your photos are downloading.");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, data?.status, orderId]);

  if (!user || isLoading) {
    return <p className="mx-auto max-w-4xl px-4 py-16 text-sm text-muted-foreground">Loading…</p>;
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">Order not found</h1>
        <Button asChild className="mt-6">
          <Link to="/account">Back to your orders</Link>
        </Button>
      </div>
    );
  }

  const paid = data.status === "paid";

  return (
    <div className="mx-auto max-w-4xl px-4 py-14">
      <Link to="/account" className="text-sm text-muted-foreground hover:text-foreground">
        ← Your orders
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">
        Order {data.id.slice(0, 8).toUpperCase()}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {new Date(data.created_at).toLocaleString("en-ZA")} · {formatZar(data.total_cents)} ·{" "}
        <span className={paid ? "text-primary" : ""}>{data.status}</span>
      </p>
      {!paid && (
        <p className="mt-3 text-sm text-muted-foreground">
          We're waiting for payment confirmation. This page updates automatically once Yoco
          confirms your payment.
        </p>
      )}
      {data.shipping_address && (
        <p className="mt-3 text-sm text-muted-foreground">
          Delivery to: {data.shipping_address}
        </p>
      )}
      <div className="axis-rule mt-6" />

      <div className="mt-8 space-y-3">
        {(data.order_items ?? []).map((item) => (
          <div key={item.id} className="panel flex items-center gap-4 p-3">
            <img
              src={previewUrl(item.photos?.preview_path ?? "")}
              alt={item.photos?.title ?? "Purchased photo"}
              className="h-16 w-24 rounded-md object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {item.photos?.title ?? item.photos?.code ?? "Photo"}
              </p>
              <p className="text-xs capitalize text-muted-foreground">
                {item.product_type} · {formatZar(item.unit_price_cents)}
              </p>
            </div>
            {item.product_type === "digital" && (
              <Button
                size="sm"
                variant="outline"
                disabled={!paid}
                onClick={async () => {
                  try {
                    const res = await download({ data: { orderId, photoId: item.photo_id } });
                    window.open(res.url, "_blank", "noopener");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Download failed");
                  }
                }}
              >
                <Download className="mr-1 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
