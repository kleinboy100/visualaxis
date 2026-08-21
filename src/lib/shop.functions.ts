import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const linesSchema = z.object({
  origin: z.string().url().max(300),
  shippingAddress: z.string().trim().max(500).optional(),
  items: z
    .array(
      z.object({
        photoId: z.string().uuid(),
        productType: z.enum(["digital", "print"]),
      }),
    )
    .min(1)
    .max(50),
});

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => linesSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const photoIds = [...new Set(data.items.map((i) => i.photoId))];
    const { data: photos, error: photoErr } = await supabase
      .from("photos")
      .select("id, digital_price_cents, print_price_cents")
      .in("id", photoIds);
    if (photoErr || !photos || photos.length !== photoIds.length) {
      throw new Error("Some photos are no longer available.");
    }

    const priced = data.items.map((item) => {
      const photo = photos.find((p) => p.id === item.photoId)!;
      return {
        ...item,
        unit_price_cents:
          item.productType === "print" ? photo.print_price_cents : photo.digital_price_cents,
      };
    });
    const totalCents = priced.reduce((sum, i) => sum + i.unit_price_cents, 0);
    if (totalCents <= 0) throw new Error("Cart total is invalid.");

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        total_cents: totalCents,
        status: "pending",
        shipping_address: data.shippingAddress ?? null,
      })
      .select("id")
      .single();
    if (orderErr || !order) throw new Error("Could not create your order.");

    const { error: itemsErr } = await supabase.from("order_items").insert(
      priced.map((i) => ({
        order_id: order.id,
        photo_id: i.photoId,
        product_type: i.productType,
        unit_price_cents: i.unit_price_cents,
      })),
    );
    if (itemsErr) throw new Error("Could not save your order items.");

    const { createYocoCheckout } = await import("./shop.server");
    const checkout = await createYocoCheckout({
      amountCents: totalCents,
      successUrl: `${data.origin}/orders/${order.id}?status=success`,
      cancelUrl: `${data.origin}/cart`,
      failureUrl: `${data.origin}/orders/${order.id}?status=failed`,
      metadata: { orderId: order.id },
    });

    await supabase
      .from("orders")
      .update({ yoco_checkout_id: checkout.id })
      .eq("id", order.id);

    return { orderId: order.id, redirectUrl: checkout.redirectUrl };
  });

export const syncOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ orderId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, status, yoco_checkout_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");
    if (order.status === "paid" || !order.yoco_checkout_id) return { status: order.status };

    const { fetchYocoCheckout } = await import("./shop.server");
    const checkout = await fetchYocoCheckout(order.yoco_checkout_id);
    const status =
      checkout.status === "completed" || checkout.status === "succeeded" ? "paid" : order.status;
    if (status !== order.status) {
      await context.supabase.from("orders").update({ status }).eq("id", order.id);
    }
    return { status };
  });

export const getDownloadLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ orderId: z.string().uuid(), photoId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: order } = await supabase
      .from("orders")
      .select("id, status, yoco_checkout_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found.");

    // Authoritative payment check against Yoco (never trust the stored status).
    if (!order.yoco_checkout_id) throw new Error("This order is not paid yet.");
    const { fetchYocoCheckout } = await import("./shop.server");
    const checkout = await fetchYocoCheckout(order.yoco_checkout_id);
    const isPaid = checkout.status === "completed" || checkout.status === "succeeded";
    if (!isPaid) throw new Error("This order is not paid yet.");
    if (order.status !== "paid") {
      await supabase.from("orders").update({ status: "paid" }).eq("id", order.id);
    }

    const { data: item } = await supabase
      .from("order_items")
      .select("id")
      .eq("order_id", data.orderId)
      .eq("photo_id", data.photoId)
      .maybeSingle();
    if (!item) throw new Error("This photo is not part of the order.");

    const { data: photo } = await supabase
      .from("photos")
      .select("original_path, preview_path")
      .eq("id", data.photoId)
      .maybeSingle();
    const path = photo?.original_path ?? photo?.preview_path;
    if (!path) throw new Error("File is unavailable.");

    const bucket = photo?.original_path ? "photo-originals" : "photo-previews";
    const { data: signed, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 10, { download: true });
    if (error || !signed) throw new Error("Could not create the download link.");
    return { url: signed.signedUrl };
  });

export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { count } = await context.supabase
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("An administrator already exists for this site.");
    const { error } = await context.supabase
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error("Could not grant admin access.");
    return { ok: true };
  });

export const setUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ userId: z.string().uuid(), makeAdmin: z.boolean() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const email = String((context.claims as { email?: string }).email ?? "").toLowerCase();
    if (email !== "mozksolutions@gmail.com") {
      throw new Error("Only the site owner can change administrator access.");
    }
    if (data.userId === context.userId && !data.makeAdmin) {
      throw new Error("You cannot remove your own admin access.");
    }
    if (data.makeAdmin) {
      await context.supabase
        .from("user_roles")
        .upsert({ user_id: data.userId, role: "admin" }, { onConflict: "user_id,role" });
    } else {
      await context.supabase
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
    }
    return { ok: true };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: profiles } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, created_at")
      .order("created_at", { ascending: false });
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("role", "admin");
    const adminIds = new Set((roles ?? []).map((r) => r.user_id));
    return (profiles ?? []).map((p) => ({ ...p, isAdmin: adminIds.has(p.id) }));
  });
