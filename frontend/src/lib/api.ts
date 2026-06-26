// Direct call to the Shree Food Junction quote API. No backend, no Gemini key.
const QUOTE_ENDPOINT = "https://expertdevelopers.in/generate-8858-quote-for-sfj";

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
