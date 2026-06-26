// Quote API endpoint. Read from env (set in frontend/.env as
// EXPO_PUBLIC_QUOTE_API_URL) so it can be swapped per environment / deploy.
const QUOTE_ENDPOINT = process.env.EXPO_PUBLIC_QUOTE_API_URL;

if (!QUOTE_ENDPOINT) {
  // Fail fast at module load so a missing env var is obvious in dev/build.
  // eslint-disable-next-line no-console
  console.error(
    "[api] EXPO_PUBLIC_QUOTE_API_URL is not set. Set it in frontend/.env."
  );
}

export type GenerateQuoteResponse = {
  quote: string;
  customer_name: string;
  order_number: number;
  kitchen_name: string;
};

export async function generateQuote(input: {
  customer_name: string;
  order_number: number;
  kitchen_name: string;
}): Promise<GenerateQuoteResponse> {
  if (!QUOTE_ENDPOINT) {
    throw new Error("Quote API URL not configured (EXPO_PUBLIC_QUOTE_API_URL).");
  }
  const res = await fetch(QUOTE_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      kitchen_name: input.kitchen_name,
      customer_name: input.customer_name,
      order_number: input.order_number,
    }),
  });
  const txt = await res.text();
  let data: any;
  try {
    data = JSON.parse(txt);
  } catch {
    throw new Error(`Server error (${res.status}): ${txt.slice(0, 200)}`);
  }
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || data?.error || `Server error (${res.status})`);
  }
  const quote = (data?.quote ?? data?.data?.quote ?? "").toString().trim();
  if (!quote) throw new Error("Empty quote from server");
  return {
    quote,
    customer_name: input.customer_name,
    order_number: input.order_number,
    kitchen_name: input.kitchen_name,
  };
}
