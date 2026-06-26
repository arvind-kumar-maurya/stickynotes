// Bluetooth thermal printer adapter for 58mm ESC/POS printers.
//
// Uses `react-native-bluetooth-classic` (modern, AndroidX, supports Expo SDK 54
// New Architecture, has a proper config plugin via `with-rn-bluetooth-classic`).
// The library is a NATIVE MODULE and only links in custom dev-client /
// production APK / IPA builds — it will NOT load in Expo Go.
//
// We lazy-require it so the JS bundle still runs in Expo Go (the require
// throws → caught → falls back to a clearly-labelled SIMULATED scan + print).
// In a Publish-built APK the require succeeds and real Bluetooth printing
// takes over automatically.

import { Buffer } from "buffer";
import { PermissionsAndroid, Platform } from "react-native";

import type { SavedPrinter } from "./storage";

type Device = { id: string; name: string };

type NativeAdapter = {
  scan: () => Promise<Device[]>;
  connect: (id: string) => Promise<void>;
  isConnected: (id: string) => Promise<boolean>;
  write: (bytes: number[]) => Promise<void>;
  disconnect: () => Promise<void>;
};

type BluetoothDeviceLike = {
  address: string;
  name?: string;
  connect: (options?: Record<string, unknown>) => Promise<boolean>;
  isConnected: () => Promise<boolean>;
  write: (data: any, encoding?: string) => Promise<boolean>;
  disconnect: () => Promise<boolean>;
};

function loadNative(): NativeAdapter | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("react-native-bluetooth-classic");
    const RNBluetoothClassic = mod.default || mod;
    if (!RNBluetoothClassic || typeof RNBluetoothClassic.getBondedDevices !== "function") {
      return null;
    }

    let activeDevice: BluetoothDeviceLike | null = null;

    const findDevice = async (id: string): Promise<BluetoothDeviceLike | null> => {
      try {
        const bonded: BluetoothDeviceLike[] = await RNBluetoothClassic.getBondedDevices();
        const hit = bonded.find((d) => d.address === id);
        if (hit) return hit;
      } catch {
        /* ignore */
      }
      return null;
    };

    return {
      scan: async () => {
        if (Platform.OS === "android") {
          try {
            const perms: string[] = [];
            if ((Platform.Version as number) >= 31) {
              perms.push("android.permission.BLUETOOTH_SCAN");
              perms.push("android.permission.BLUETOOTH_CONNECT");
            }
            perms.push("android.permission.ACCESS_FINE_LOCATION");
            await PermissionsAndroid.requestMultiple(perms as any);
          } catch {
            /* ignore */
          }
        }
        try {
          const enabled = await RNBluetoothClassic.isBluetoothEnabled();
          if (!enabled) {
            await RNBluetoothClassic.requestBluetoothEnabled();
          }
        } catch {
          /* ignore */
        }

        const bonded: BluetoothDeviceLike[] = await RNBluetoothClassic.getBondedDevices();
        const map = new Map<string, Device>();
        for (const d of bonded) {
          if (d?.address) map.set(d.address, { id: d.address, name: d.name || d.address });
        }

        // Also try a quick discovery for unpaired devices. Cap it.
        try {
          const discovered: BluetoothDeviceLike[] = await Promise.race([
            RNBluetoothClassic.startDiscovery(),
            new Promise<BluetoothDeviceLike[]>((resolve) =>
              setTimeout(() => resolve([]), 10000)
            ),
          ]);
          for (const d of discovered || []) {
            if (d?.address && !map.has(d.address)) {
              map.set(d.address, { id: d.address, name: d.name || d.address });
            }
          }
        } catch {
          /* discovery is best-effort */
        } finally {
          try {
            await RNBluetoothClassic.cancelDiscovery?.();
          } catch {
            /* ignore */
          }
        }

        return Array.from(map.values());
      },

      connect: async (id: string) => {
        // Prefer using the device wrapper if we can resolve it.
        let device = await findDevice(id);
        if (!device) {
          // Library also exposes a top-level connect that takes an address.
          try {
            device = (await RNBluetoothClassic.connectToDevice(id, {
              delimiter: "\n",
            })) as BluetoothDeviceLike;
          } catch (e) {
            throw e;
          }
        } else {
          await device.connect({ delimiter: "\n" });
        }
        activeDevice = device;
      },

      isConnected: async (id: string) => {
        if (activeDevice && activeDevice.address === id) {
          try {
            return await activeDevice.isConnected();
          } catch {
            return false;
          }
        }
        // Try recovering a device handle (after process restart we lose it,
        // but the OS-level pairing persists — treat as needs-reconnect).
        const dev = await findDevice(id);
        if (!dev) return false;
        try {
          const connected = await dev.isConnected();
          if (connected) activeDevice = dev;
          return connected;
        } catch {
          return false;
        }
      },

      write: async (bytes: number[]) => {
        if (!activeDevice) throw new Error("Printer not connected");
        const base64 = Buffer.from(bytes).toString("base64");
        // react-native-bluetooth-classic accepts a base64 string with "base64"
        // hint, or a raw Buffer. base64 string is the safest cross-platform.
        await activeDevice.write(base64, "base64");
      },

      disconnect: async () => {
        try {
          await activeDevice?.disconnect();
        } catch {
          /* ignore */
        }
        activeDevice = null;
      },
    };
  } catch {
    return null;
  }
}

let nativeAdapter: NativeAdapter | null = null;
let nativeChecked = false;
function getNative(): NativeAdapter | null {
  if (!nativeChecked) {
    nativeChecked = true;
    nativeAdapter = loadNative();
  }
  return nativeAdapter;
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
  if (n) return n.isConnected(p.id);
  return simulatedConnectedId === p.id;
}

export async function disconnectPrinter(): Promise<void> {
  const n = getNative();
  if (n) return n.disconnect();
  simulatedConnectedId = null;
}

// ---------- ESC/POS command builders ----------
// Generic 58mm ESC/POS printer commands. Width = 32 characters at default font.
const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

function encodeText(s: string): number[] {
  // CP437 / Latin-1 fits the Hinglish (Roman script) we generate.
  return Array.from(Buffer.from(s, "latin1"));
}

function commandInit(): number[] {
  return [ESC, 0x40]; // ESC @ – initialize
}
function commandAlign(mode: 0 | 1 | 2): number[] {
  // 0 = left, 1 = center, 2 = right
  return [ESC, 0x61, mode];
}
function commandBold(on: boolean): number[] {
  return [ESC, 0x45, on ? 1 : 0];
}
function commandFeed(lines: number): number[] {
  return [ESC, 0x64, Math.max(0, Math.min(255, lines))];
}
function commandCut(): number[] {
  // Many 58mm cheap printers don't actually have a cutter — this is harmless
  // when absent (printer ignores unknown commands).
  return [GS, 0x56, 0x00];
}

function buildEscPosBytes(opts: {
  kitchenName: string;
  customerName: string;
  orderNumber: number;
  quote: string;
}): number[] {
  const W = 32;
  const wrap = (s: string) =>
    s
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
  const date = new Date();
  const stamp = `${date.toLocaleDateString()}  ${date.toLocaleTimeString()}`;
  const line = "-".repeat(W);

  let bytes: number[] = [];
  bytes = bytes.concat(commandInit());

  // Header
  bytes = bytes.concat(commandAlign(1), commandBold(true));
  bytes = bytes.concat(encodeText(opts.kitchenName.toUpperCase()), [LF]);
  bytes = bytes.concat(commandBold(false));
  bytes = bytes.concat(encodeText("Good Food, Happy Mood"), [LF]);
  bytes = bytes.concat(encodeText(line), [LF]);

  // Order info
  bytes = bytes.concat(commandAlign(0));
  bytes = bytes.concat(encodeText(`Order #${opts.orderNumber}`), [LF]);
  bytes = bytes.concat(encodeText(`For: ${opts.customerName}`), [LF]);
  bytes = bytes.concat(encodeText(stamp), [LF]);
  bytes = bytes.concat(encodeText(line), [LF]);

  // Quote (the heart of the receipt)
  bytes = bytes.concat(encodeText(wrap(opts.quote)), [LF]);
  bytes = bytes.concat(encodeText(line), [LF]);

  // Footer
  bytes = bytes.concat(commandAlign(1));
  bytes = bytes.concat(encodeText("Thank you!"), [LF]);

  // Feed + cut
  bytes = bytes.concat(commandFeed(4));
  bytes = bytes.concat(commandCut());

  return bytes;
}

/**
 * Visual receipt text (used for in-app preview / logs).
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
    opts.quote +
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
  const n = getNative();
  if (n) {
    const bytes = buildEscPosBytes(opts);
    await n.write(bytes);
    return { ok: true, simulated: false };
  }
  // eslint-disable-next-line no-console
  console.log("[SFJ][SIMULATED PRINT]\n" + buildReceiptText(opts));
  await new Promise((r) => setTimeout(r, 700));
  return { ok: true, simulated: true };
}
