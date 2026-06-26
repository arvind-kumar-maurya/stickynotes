import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  orderNumber: "sfj:order_number",
  printer: "sfj:printer", // JSON: { id, name }
} as const;

export const KITCHEN_NAME = "Shree Food Junction";

export type SavedPrinter = { id: string; name: string };

export async function getOrderNumber(): Promise<number> {
  const v = await AsyncStorage.getItem(KEYS.orderNumber);
  const n = v ? parseInt(v, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? n : 1;
}
export async function setOrderNumber(n: number) {
  return AsyncStorage.setItem(KEYS.orderNumber, String(Math.max(1, Math.floor(n))));
}

export async function getPrinter(): Promise<SavedPrinter | null> {
  const v = await AsyncStorage.getItem(KEYS.printer);
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}
export async function setPrinter(p: SavedPrinter | null) {
  if (!p) return AsyncStorage.removeItem(KEYS.printer);
  return AsyncStorage.setItem(KEYS.printer, JSON.stringify(p));
}

export { KEYS };
