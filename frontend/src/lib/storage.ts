import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  geminiKey: "kn:gemini_api_key",
  kitchenName: "kn:kitchen_name",
  orderNumber: "kn:order_number",
  printer: "kn:printer", // JSON: { id, name }
} as const;

export type SavedPrinter = { id: string; name: string };

export async function getGeminiKey() {
  return AsyncStorage.getItem(KEYS.geminiKey);
}
export async function setGeminiKey(v: string) {
  return AsyncStorage.setItem(KEYS.geminiKey, v);
}

export async function getKitchenName() {
  return AsyncStorage.getItem(KEYS.kitchenName);
}
export async function setKitchenName(v: string) {
  return AsyncStorage.setItem(KEYS.kitchenName, v);
}

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

export async function clearAll() {
  await AsyncStorage.multiRemove(Object.values(KEYS));
}

export { KEYS };
