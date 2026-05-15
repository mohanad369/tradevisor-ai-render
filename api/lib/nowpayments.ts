import { createHmac, timingSafeEqual } from "node:crypto";

const NOWPAYMENTS_API_URL = "https://api.nowpayments.io/v1";

export type NowPaymentsInvoice = {
  id: string | number;
  order_id: string;
  invoice_url: string;
};

export function isNowPaymentsConfigured() {
  return Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET);
}

export async function createNowPaymentsInvoice(input: {
  orderId: string;
  planName: string;
  amount: string | number;
  customerEmail: string;
  siteOrigin: string;
}) {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error("NOWPayments API key is not configured");
  }

  const siteOrigin = input.siteOrigin.replace(/\/$/, "");
  const response = await fetch(`${NOWPAYMENTS_API_URL}/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      price_amount: Number(input.amount),
      price_currency: "usd",
      pay_currency: "usdttrc20",
      order_id: input.orderId,
      order_description: `${input.planName} - ${input.customerEmail}`,
      ipn_callback_url: `${siteOrigin}/api/payments/nowpayments/ipn`,
      success_url: `${siteOrigin}/#/vip?payment=success&order=${encodeURIComponent(input.orderId)}`,
      cancel_url: `${siteOrigin}/#/vip?payment=cancelled&order=${encodeURIComponent(input.orderId)}`,
      is_fixed_rate: false,
      is_fee_paid_by_user: true,
    }),
  });

  const data = await response.json().catch(() => null) as any;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "NOWPayments invoice creation failed");
  }
  if (!data?.invoice_url || !data?.id) {
    throw new Error("NOWPayments did not return a checkout URL");
  }

  return data as NowPaymentsInvoice;
}

export function verifyNowPaymentsIpn(rawBody: string, signature: string | null | undefined) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !signature) return false;

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return false;
  }

  const sortedJson = JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort());
  const expected = createHmac("sha512", secret).update(sortedJson).digest("hex");

  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");
  if (expectedBuffer.length !== receivedBuffer.length) return false;

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function isPaidNowPaymentsStatus(status: unknown) {
  return ["confirmed", "finished"].includes(String(status || "").toLowerCase());
}
