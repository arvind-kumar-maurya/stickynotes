import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/src/lib/theme";
import {
  scanPrinters,
  connectPrinter,
  isNativePrinterAvailable,
} from "@/src/lib/printer";
import { getPrinter, setPrinter } from "@/src/lib/storage";
import { tap, success, error as errHaptic } from "@/src/lib/haptics";

type Device = { id: string; name: string };

export default function PrinterSetupScreen() {
  const router = useRouter();
  const [devices, setDevices] = useState<Device[]>([]);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const doScan = useCallback(async () => {
    setErr(null);
    setScanning(true);
    setDevices([]);
    try {
      const list = await scanPrinters();
      setDevices(list);
    } catch (e: any) {
      setErr(e?.message || "Scan failed");
      errHaptic();
    } finally {
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    doScan();
  }, [doScan]);

  const onConnect = async (d: Device) => {
    tap();
    setConnectingId(d.id);
    setErr(null);
    try {
      await connectPrinter(d.id);
      await setPrinter({ id: d.id, name: d.name });
      success();
      router.replace("/home");
    } catch (e: any) {
      setErr(e?.message || "Could not connect to printer");
      errHaptic();
    } finally {
      setConnectingId(null);
    }
  };

  const onSkip = async () => {
    tap();
    // Clear any stale printer entry so the gate logic doesn't loop.
    const existing = await getPrinter();
    if (existing) await setPrinter(null);
    router.replace("/home");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="printer-back"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={theme.color.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Connect Printer</Text>
        <Pressable
          testID="printer-rescan"
          onPress={doScan}
          hitSlop={10}
          style={styles.iconBtn}
          disabled={scanning}
        >
          <Ionicons
            name="refresh"
            size={20}
            color={scanning ? theme.color.muted : theme.color.onSurface}
          />
        </Pressable>
      </View>

      <View style={styles.banner}>
        <Ionicons name="information-circle-outline" size={18} color={theme.color.onSurfaceSecondary} />
        <Text style={styles.bannerText}>
          {isNativePrinterAvailable()
            ? "Scanning nearby Bluetooth thermal printers (58mm)."
            : "Demo mode (Expo Go preview). Real Bluetooth printing activates in the built APK."}
        </Text>
      </View>

      {scanning ? (
        <View style={styles.center} testID="printer-scanning">
          <ActivityIndicator size="large" color={theme.color.brandPrimary} />
          <Text style={styles.scanningText}>Searching for nearby thermal printers...</Text>
        </View>
      ) : devices.length === 0 ? (
        <View style={styles.center} testID="printer-empty">
          <Ionicons name="print-outline" size={56} color={theme.color.borderStrong} />
          <Text style={styles.emptyTitle}>No printers found</Text>
          <Text style={styles.emptySub}>Is your printer powered on and in range?</Text>
          <Pressable
            testID="printer-retry"
            onPress={doScan}
            style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="refresh" size={16} color={theme.color.onBrandPrimary} />
            <Text style={styles.retryText}>Retry scan</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          testID="printer-list"
          data={devices}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          renderItem={({ item }) => {
            const busy = connectingId === item.id;
            return (
              <View style={styles.deviceCard} testID={`printer-card-${item.id}`}>
                <View style={styles.iconCircle}>
                  <Ionicons name="print" size={20} color={theme.color.onBrandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceName}>{item.name}</Text>
                  <Text style={styles.deviceId}>{item.id}</Text>
                </View>
                <Pressable
                  testID={`printer-connect-${item.id}`}
                  disabled={!!connectingId}
                  onPress={() => onConnect(item)}
                  style={({ pressed }) => [
                    styles.connectBtn,
                    pressed && { opacity: 0.85 },
                    !!connectingId && !busy && { opacity: 0.5 },
                  ]}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={theme.color.onBrandPrimary} />
                  ) : (
                    <Text style={styles.connectBtnText}>Connect</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}

      {err ? (
        <Text testID="printer-error" style={styles.errorText}>
          {err}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Pressable testID="printer-skip" onPress={onSkip} hitSlop={8}>
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  iconBtn: { padding: theme.spacing.sm },
  headerTitle: {
    fontFamily: theme.font.display,
    fontSize: theme.scale.xl,
    color: theme.color.onSurface,
    fontWeight: "700",
  },
  banner: {
    marginHorizontal: theme.spacing.xl,
    flexDirection: "row",
    gap: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  bannerText: {
    flex: 1,
    color: theme.color.onSurfaceSecondary,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
    lineHeight: 18,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: theme.spacing.xl },
  scanningText: {
    marginTop: theme.spacing.lg,
    color: theme.color.onSurfaceSecondary,
    fontFamily: theme.font.text,
  },
  emptyTitle: {
    marginTop: theme.spacing.lg,
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontSize: theme.scale.xl,
    fontWeight: "700",
  },
  emptySub: {
    marginTop: theme.spacing.sm,
    color: theme.color.muted,
    fontFamily: theme.font.text,
    fontSize: theme.scale.base,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: theme.spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.pill,
  },
  retryText: {
    color: theme.color.onBrandPrimary,
    fontFamily: theme.font.text,
    fontWeight: "700",
  },
  listContent: {
    padding: theme.spacing.xl,
  },
  deviceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.spacing.lg,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.color.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: {
    color: theme.color.onSurface,
    fontFamily: theme.font.text,
    fontSize: theme.scale.lg,
    fontWeight: "700",
  },
  deviceId: {
    color: theme.color.muted,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
    marginTop: 2,
  },
  connectBtn: {
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    minWidth: 92,
    alignItems: "center",
  },
  connectBtnText: {
    color: theme.color.onBrandPrimary,
    fontFamily: theme.font.text,
    fontWeight: "700",
  },
  errorText: {
    marginHorizontal: theme.spacing.xl,
    color: theme.color.error,
    fontFamily: theme.font.text,
    fontSize: theme.scale.base,
  },
  footer: {
    alignItems: "center",
    paddingVertical: theme.spacing.lg,
  },
  skipText: {
    color: theme.color.muted,
    fontFamily: theme.font.text,
    fontSize: theme.scale.base,
    textDecorationLine: "underline",
  },
});
