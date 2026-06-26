const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export type GenerateQuoteResponse = {
  id: string;
  quote: string;
  tone: string;
  customer_name: string;
  order_number: number;
  kitchen_name: string;
  created_at: string;
};

export async function generateQuote(input: {
  customer_name: string;
  order_number: number;
  kitchen_name: string;
  gemini_api_key: string;
}): Promise<GenerateQuoteResponse> {
  if (!BACKEND_URL) throw new Error("Backend URL missing");
  const res = await fetch(`${BACKEND_URL}/api/generate-quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const txt = await res.text();
  let data: any;
  try {
    data = JSON.parse(txt);
  } catch {
    throw new Error(`Server error (${res.status}): ${txt.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(data?.detail || `Server error (${res.status})`);
  }
  return data;
}
