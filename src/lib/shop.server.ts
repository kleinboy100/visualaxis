export type CheckoutLine = { photoId: string; productType: "digital" | "print" };

export type YocoCheckout = { id: string; redirectUrl: string };

export async function createYocoCheckout(input: {
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
  failureUrl: string;
  metadata: Record<string, string>;
}): Promise<YocoCheckout> {
  const secret = process.env["YOCO_SECRET_KEY"];
  if (!secret) {
    throw new Error(
      "Payments are not configured on this deployment (missing YOCO_SECRET_KEY environment variable).",
    );
  }
  const res = await fetch("https://payments.yoco.com/api/checkouts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountCents,
      currency: "ZAR",
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      failureUrl: input.failureUrl,
      metadata: input.metadata,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error("Yoco checkout failed", res.status, body);
    throw new Error("Payment could not be started. Please try again.");
  }
  const json = (await res.json()) as { id: string; redirectUrl: string };
  return { id: json.id, redirectUrl: json.redirectUrl };
}

export async function fetchYocoCheckout(checkoutId: string) {
  const secret = process.env["YOCO_SECRET_KEY"];
  if (!secret) throw new Error("Yoco is not connected yet.");
  const res = await fetch(`https://payments.yoco.com/api/checkouts/${checkoutId}`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!res.ok) throw new Error("Could not verify payment status.");
  return (await res.json()) as { id: string; status: string };
}
