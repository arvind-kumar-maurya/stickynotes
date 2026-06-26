// Bluetooth thermal printer adapter for 58mm ESC/POS printers.
//
// IMPORTANT: Real Bluetooth printing requires a native module
// (e.g. `react-native-bluetooth-escpos-printer` or
// `react-native-thermal-receipt-printer-image-qr`). Native modules
// CANNOT run in Expo Go — they require a custom dev client or a
// production build (APK/IPA via Emergent's Publish flow).
//
// This module:
//   • Tries to lazy-load the native module at runtime.
//   • If unavailable (Expo Go / preview), falls back to a SIMULATED
//     scan returning mock devices and a simulated print that resolves
//     successfully so the UI flow is fully testable.
//   • Once the user builds an APK with the native module installed,
//     real BT discovery + printing will kick in automatically.

import type { SavedPrinter } from "./storage";

type EscPosModule = {
  scan: () => Promise<{ id: string; name: string }[]>;
  connect: (id: string) => Promise<void>;
  isConnected: (id: string) => Promise<boolean>;
  printText: (text: string, opts?: Record<string, unknown>) => Promise<void>;
  printRaw: (bytes: number[]) => Promise<void>;
  disconnect: () => Promise<void>;
};

function loadNative(): EscPosModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-bluetooth-escpos-printer");
    if (mod?.BluetoothManager && mod?.BluetoothEscposPrinter) {
      return wrapNative(mod);
    }
  } catch {
    /* not installed yet — that's fine in Expo Go */
  }
  return null;
}

function wrapNative(mod: any): EscPosModule {
  const { BluetoothManager, BluetoothEscposPrinter } = mod;
  return {
    scan: async () => {
      const enabled = await BluetoothManager.isBluetoothEnabled();
      if (!enabled) await BluetoothManager.enableBluetooth();
      const res = await BluetoothManager.scanDevices();
      const parsed = typeof res === "string" ? JSON.parse(res) : res;
      const paired = (parsed?.paired || []).map((d: any) => ({ id: d.address, name: d.name }));
      const found = (parsed?.found || []).map((d: any) => ({ id: d.address, name: d.name }));
      const all = [...paired, ...found];
      const seen = new Set<string>();
      return all.filter((d) => (d.id && !seen.has(d.id) ? (seen.add(d.id), true) : false));
    },
    connect: async (id: string) => {
      await BluetoothManager.connect(id);
    },
    isConnected: async () => {
      try {
        const s = await BluetoothManager.isDeviceConnected?.();
        return !!s;
      } catch {
        return false;
      }
    },
    printText: async (text: string) => {
      await BluetoothEscposPrinter.printerInit?.();
      await BluetoothEscposPrinter.printerAlign?.(BluetoothEscposPrinter.ALIGN.CENTER);
      await BluetoothEscposPrinter.printText(text, {});
    },
    printRaw: async (bytes: number[]) => {
      await BluetoothEscposPrinter.printerInit?.();
      await BluetoothEscposPrinter.printRawData?.(Buffer.from(bytes).toString("base64"));
    },
    disconnect: async () => {
      try {
        await BluetoothManager.disconnect?.();
      } catch {
        /* ignore */
      }
    },
  };
}

const native = loadNative();
export const isNativePrinterAvailable = !!native;

// --- Simulated fallback for Expo Go / preview ---
let simulatedConnectedId: string | null = null;
const simulatedScan = async () => {
  await new Promise((r) => setTimeout(r, 800));
  return [
    { id: "DEMO-58-01", name: "Thermal 58mm Printer (Demo)" },
    { id: "DEMO-POS-58", name: "POS-58 Bluetooth (Demo)" },
    { id: "DEMO-RPP02", name: "RPP02 58mm (Demo)" },
  ];
};

export async function scanPrinters(): Promise<{ id: string; name: string }[]> {
  if (native) return native.scan();
  return simulatedScan();
}

export async function connectPrinter(id: string): Promise<void> {
  if (native) return native.connect(id);
  await new Promise((r) => setTimeout(r, 500));
  simulatedConnectedId = id;
}

export async function isPrinterConnected(p: SavedPrinter | null): Promise<boolean> {
  if (!p) return false;
  if (native) return native.isConnected(p.id);
  return simulatedConnectedId === p.id;
}

export async function disconnectPrinter(): Promise<void> {
  if (native) return native.disconnect();
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
  const W = 32; // chars per line for 58mm thermal
  const center = (s: string) => {
    const t = s.length > W ? s.slice(0, W) : s;
    const pad = Math.max(0, Math.floor((W - t.length) / 2));
    return " ".repeat(pad) + t;
  };
  const line = "-".repeat(W);
  const wrap = (s: string) => {
    const words = s.split(/\s+/);
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
  };
  const date = new Date();
  const stamp = `${date.toLocaleDateString()}  ${date.toLocaleTimeString()}`;
  return (
    `\n` +
    center(opts.kitchenName.toUpperCase()) +
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
  if (native) {
    await native.printText(text);
    return { ok: true, simulated: false };
  }
  // Simulated print — log so dev can see the formatted output.
  // Real printing engages once the app is built as an APK.
  // eslint-disable-next-line no-console
  console.log("[KitchenNotes][SIMULATED PRINT]\n" + text);
  await new Promise((r) => setTimeout(r, 700));
  return { ok: true, simulated: true };
}
