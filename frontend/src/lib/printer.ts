// Bluetooth thermal printer adapter for 58mm ESC/POS printers.
//
// Uses `react-native-bluetooth-escpos-printer` (Januslo) — installed as a
// project dependency. It is a NATIVE MODULE and ONLY links in custom
// dev-client / production APK / IPA builds. It will NOT load in Expo Go.
//
// We lazy-require it so the JS bundle still runs in Expo Go (the require
// throws → caught → falls back to a clearly-labelled SIMULATED scan + print).
// In a Publish-built APK the require succeeds and real Bluetooth printing
// takes over automatically.

import { PermissionsAndroid, Platform } from "react-native";

import type { SavedPrinter } from "./storage";

type Device = { id: string; name: string };

type NativeModule = {
  scan: () => Promise<Device[]>;
  connect: (id: string) => Promise<void>;
  isConnected: () => Promise<boolean>;
  printText: (text: string) => Promise<void>;
  disconnect: () => Promise<void>;
};

function loadNative(): NativeModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-bluetooth-escpos-printer");
    const BluetoothManager = mod.BluetoothManager || mod.default?.BluetoothManager;
    const BluetoothEscposPrinter = mod.BluetoothEscposPrinter || mod.default?.BluetoothEscposPrinter;
    if (!BluetoothManager || !BluetoothEscposPrinter) return null;

    return {
      scan: async () => {
        // Android 12+ runtime permissions
        if (Platform.OS === "android") {
          try {
            const required: string[] = [];
            if (Platform.Version >= 31) {
              required.push("android.permission.BLUETOOTH_SCAN");
              required.push("android.permission.BLUETOOTH_CONNECT");
            }
            required.push("android.permission.ACCESS_FINE_LOCATION");
            await PermissionsAndroid.requestMultiple(required as any);
          } catch {
            /* ignore */
          }
        }
        try {
          const enabled = await BluetoothManager.isBluetoothEnabled();
          if (!enabled) await BluetoothManager.enableBluetooth();
        } catch {
          /* ignore */
        }
        const res = await BluetoothManager.scanDevices();
        const parsed = typeof res === "string" ? JSON.parse(res) : res;
        const paired: any[] = parsed?.paired || [];
        const found: any[] = parsed?.found || [];
        const all = [...paired, ...found].map((d: any) => ({
          id: d.address || d.id,
          name: d.name || d.address || "Unknown printer",
        }));
        const seen = new Set<string>();
        return all.filter((d) => (d.id && !seen.has(d.id) ? (seen.add(d.id), true) : false));
      },
      connect: async (id: string) => {
        await BluetoothManager.connect(id);
      },
      isConnected: async () => {
        try {
          if (typeof BluetoothManager.isDeviceConnected === "function") {
            const s = await BluetoothManager.isDeviceConnected();
            return !!s;
          }
        } catch {
          /* ignore */
        }
        // Library doesn't always expose a status check — assume connected once paired.
        return true;
      },
      printText: async (text: string) => {
        try {
          await BluetoothEscposPrinter.printerInit?.();
        } catch {
          /* ignore */
        }
        try {
          await BluetoothEscposPrinter.printerAlign?.(BluetoothEscposPrinter.ALIGN.LEFT);
        } catch {
          /* ignore */
        }
        await BluetoothEscposPrinter.printText(text, {});
      },
      disconnect: async () => {
        try {
          await BluetoothManager.disconnect?.();
        } catch {
          /* ignore */
        }
      },
    };
  } catch {
    return null;
  }
}

let native: NativeModule | null = null;
let nativeChecked = false;
function getNative(): NativeModule | null {
  if (!nativeChecked) {
    nativeChecked = true;
    native = loadNative();
  }
  return native;
}

export function isNativePrinterAvailable(): boolean {
  return getNative() !== null;
}

// --- Simulated fallback (Expo Go only) ---
let simulatedConnectedId: string | null = null;
const simulatedScan = async () => {
  await new Promise((r) => setTimeout(r, 800));
  return [
    { id: "DEMO-58-01", name: "Thermal 58mm Printer (Demo)" },
    { id: "DEMO-POS-58", name: "POS-58 Bluetooth (Demo)" },
  ];
};

export async function scanPrinters(): Promise<Device[]> {
  const n = getNative();
  if (n) return n.scan();
  return simulatedScan();
}

export async function connectPrinter(id: string): Promise<void> {
  const n = getNative();
  if (n) return n.connect(id);
  await new Promise((r) => setTimeout(r, 500));
  simulatedConnectedId = id;
}

export async function isPrinterConnected(p: SavedPrinter | null): Promise<boolean> {
  if (!p) return false;
  const n = getNative();
  if (n) return n.isConnected();
  return simulatedConnectedId === p.id;
}

export async function disconnectPrinter(): Promise<void> {
  const n = getNative();
  if (n) return n.disconnect();
  simulatedConnectedId = null;
}

/**
 * Build the formatted receipt text for a 58mm printer (32 chars / line).
 */
export function buildReceiptText(opts: {
  kitchenName: string;
  customerName: string;
  orderNumber: number;
  quote: string;
}) {
  const W = 32;
  const center = (s: string) => {
    const t = s.length > W ? s.slice(0, W) : s;
    const pad = Math.max(0, Math.floor((W - t.length) / 2));
    return " ".repeat(pad) + t;
  };
  const line = "-".repeat(W);
  const wrap = (s: string) => {
    return s
      .split("\n")
      .map((para) => {
        const words = para.split(/\s+/);
        const lines: string[] = [];
        let cur = "";
        for (const w of words) {
          if ((cur + " " + w).trim().length > W) {
            if (cur) lines.push(cur);
            cur = w;
          } else {
            cur = (cur + " " + w).trim();
          }
        }
        if (cur) lines.push(cur);
        return lines.join("\n");
      })
      .join("\n");
  };
  const date = new Date();
  const stamp = `${date.toLocaleDateString()}  ${date.toLocaleTimeString()}`;
  return (
    `\n` +
    center(opts.kitchenName.toUpperCase()) +
    `\n` +
    center("Good Food, Happy Mood") +
    `\n` +
    line +
    `\n` +
    `Order #${opts.orderNumber}\n` +
    `For: ${opts.customerName}\n` +
    `${stamp}\n` +
    line +
    `\n` +
    wrap(opts.quote) +
    `\n` +
    line +
    `\n` +
    center("Thank you!") +
    `\n\n\n`
  );
}

export async function printReceipt(opts: {
  kitchenName: string;
  customerName: string;
  orderNumber: number;
  quote: string;
}): Promise<{ ok: true; simulated: boolean }> {
  const text = buildReceiptText(opts);
  const n = getNative();
  if (n) {
    await n.printText(text);
    return { ok: true, simulated: false };
  }
  // eslint-disable-next-line no-console
  console.log("[SFJ][SIMULATED PRINT]\n" + text);
  await new Promise((r) => setTimeout(r, 700));
  return { ok: true, simulated: true };
}
