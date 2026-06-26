import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { theme } from "@/src/lib/theme";
import { generateQuote } from "@/src/lib/api";
import {
  getGeminiKey,
  getKitchenName,
  getPrinter,
  setOrderNumber as saveOrderNumber,
  getOrderNumber,
  SavedPrinter,
} from "@/src/lib/storage";
import {
  isPrinterConnected,
  printReceipt,
  isNativePrinterAvailable,
} from "@/src/lib/printer";
import { tap, medium, success, error as errHaptic } from "@/src/lib/haptics";

type ToneTag = "warm" | "funny" | "motivational";

const TONE_LABEL: Record<ToneTag, string> = {
  warm: "Warm note",
  funny: "Cheeky one-liner",
  motivational: "Pep talk",
};

export default function PreviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ customer_name?: string; order_number?: string }>();
  const customerName = (params.customer_name || "").toString();
  const orderNumber = parseInt((params.order_number || "1").toString(), 10) || 1;

  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState<string>("");
  const [tone, setTone] = useState<ToneTag>("warm");
  const [err, setErr] = useState<string | null>(null);
  const [printer, setPrinterState] = useState<SavedPrinter | null>(null);
  const [printing, setPrinting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const kitchenRef = useRef<string>("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const fetchQuote = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const [key, kitchen, p] = await Promise.all([
        getGeminiKey(),
        getKitchenName(),
        getPrinter(),
      ]);
      setPrinterState(p);
      kitchenRef.current = kitchen || "Kitchen";
      if (!key || !kitchen) {
        throw new Error("Missing setup. Please complete setup first.");
      }
      const res = await generateQuote({
        customer_name: customerName,
        order_number: orderNumber,
        kitchen_name: kitchen,
        gemini_api_key: key,
      });
      setQuote(res.quote);
      setTone((res.tone as ToneTag) || "warm");
      success();
    } catch (e: any) {
      setErr(e?.message || "Failed to generate quote");
      errHaptic();
    } finally {
      setLoading(false);
    }
  }, [customerName, orderNumber]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const onRegenerate = () => {
    tap();
    fetchQuote();
  };

  const onPrint = async () => {
    medium();
    setPrinting(true);
    try {
      // Make sure printer connection is still alive.
      const ok = await isPrinterConnected(printer);
      if (!printer || !ok) {
        showToast("No printer connected. Opening printer setup...");
        setTimeout(() => router.push("/printer-setup"), 600);
        return;
      }
      const result = await printReceipt({
        kitchenName: kitchenRef.current,
        customerName,
        orderNumber,
        quote,
      });
      // Auto-increment order number after a successful print
      const cur = await getOrderNumber();
      await saveOrderNumber(Math.max(cur, orderNumber) + 1);
      success();
      showToast(
        result.simulated
          ? "Printed (simulated). Build APK for real BT printing."
          : "Printed successfully!"
      );
    } catch (e: any) {
      setErr(e?.message || "Print failed");
      errHaptic();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="preview-back"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Ionicons name="chevron-back" size={22} color={theme.color.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Sticky Note</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.toneRow}>
          <View style={styles.toneChip} testID="preview-tone">
            <View style={styles.dot} />
            <Text style={styles.toneChipText}>{TONE_LABEL[tone] || "Note"}</Text>
          </View>
          <Text style={styles.orderTag} testID="preview-order">
            Order #{orderNumber}
          </Text>
        </View>

        <View style={styles.noteShadow}>
          <View style={styles.note} testID="sticky-note">
            <View style={styles.tape} />
            {loading ? (
              <View style={styles.noteLoading}>
                <ActivityIndicator size="large" color={theme.color.onBrandTertiary} />
                <Text style={styles.scribble}>scribbling...</Text>
              </View>
            ) : err ? (
              <Text style={styles.noteError} testID="preview-error">
                {err}
              </Text>
            ) : (
              <>
                <Text style={styles.noteCustomer} testID="preview-customer">
                  Dear {customerName.split(" ")[0]},
                </Text>
                <Text style={styles.noteQuote} testID="preview-quote">
                  {quote}
                </Text>
                <Text style={styles.noteSignoff}>
                  — {kitchenRef.current}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.printerHint} testID="preview-printer-hint">
          <Ionicons
            name={printer ? "checkmark-circle" : "alert-circle-outline"}
            size={16}
            color={printer ? theme.color.success : theme.color.warning}
          />
          <Text style={styles.printerHintText} numberOfLines={1}>
            {printer ? printer.name : "No printer connected — tap Print to set up"}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          testID="regenerate-button"
          disabled={loading}
          onPress={onRegenerate}
          style={({ pressed }) => [
            styles.regenBtn,
            (pressed || loading) && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="refresh" size={18} color={theme.color.onBrandSecondary} />
          <Text style={styles.regenBtnText}>Regenerate</Text>
        </Pressable>
        <Pressable
          testID="print-button"
          disabled={loading || printing}
          onPress={onPrint}
          style={({ pressed }) => [
            styles.printBtn,
            (pressed || loading || printing) && { opacity: 0.85 },
          ]}
        >
          {printing ? (
            <ActivityIndicator color={theme.color.onBrandPrimary} />
          ) : (
            <Ionicons name="print" size={18} color={theme.color.onBrandPrimary} />
          )}
          <Text style={styles.printBtnText}>Print to 58mm</Text>
        </Pressable>
      </View>

      {toast ? (
        <View style={styles.toast} testID="preview-toast" pointerEvents="none">
          <Ionicons
            name={isNativePrinterAvailable ? "checkmark-circle" : "information-circle"}
            size={16}
            color={theme.color.onSurfaceInverse}
          />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
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
  scroll: {
    padding: theme.spacing.xl,
    paddingBottom: 160,
    alignItems: "center",
  },
  toneRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.lg,
  },
  toneChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: theme.color.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.color.brandSecondary,
  },
  toneChipText: {
    color: theme.color.onSurfaceSecondary,
    fontFamily: theme.font.text,
    fontWeight: "700",
    fontSize: theme.scale.sm,
  },
  orderTag: {
    color: theme.color.muted,
    fontFamily: theme.font.text,
    fontWeight: "700",
    fontSize: theme.scale.sm,
  },
  noteShadow: {
    width: "100%",
    aspectRatio: 1,
    maxWidth: 360,
    transform: [{ rotate: "-2deg" }],
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 10,
  },
  note: {
    flex: 1,
    backgroundColor: theme.color.brandTertiary,
    padding: theme.spacing.xl,
    borderRadius: 4,
    justifyContent: "center",
  },
  tape: {
    position: "absolute",
    top: -14,
    alignSelf: "center",
    width: 80,
    height: 22,
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 2,
    transform: [{ rotate: "3deg" }],
  },
  noteLoading: { alignItems: "center", gap: theme.spacing.md },
  scribble: {
    fontFamily: theme.font.hand,
    fontSize: 22,
    color: theme.color.onBrandTertiary,
  },
  noteError: {
    fontFamily: theme.font.text,
    color: theme.color.error,
    textAlign: "center",
  },
  noteCustomer: {
    fontFamily: theme.font.hand,
    fontSize: 28,
    color: theme.color.onBrandTertiary,
    marginBottom: theme.spacing.md,
  },
  noteQuote: {
    fontFamily: theme.font.hand,
    fontSize: 30,
    lineHeight: 38,
    color: theme.color.onBrandTertiary,
  },
  noteSignoff: {
    marginTop: theme.spacing.lg,
    alignSelf: "flex-end",
    fontFamily: theme.font.hand,
    fontSize: 22,
    color: theme.color.onBrandTertiary,
    opacity: 0.85,
  },
  printerHint: {
    marginTop: theme.spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.color.surfaceSecondary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.border,
    maxWidth: "100%",
  },
  printerHintText: {
    color: theme.color.onSurfaceSecondary,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.color.surface,
    borderTopWidth: 1,
    borderTopColor: theme.color.divider,
  },
  regenBtn: {
    flex: 1,
    backgroundColor: theme.color.brandSecondary,
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  regenBtnText: {
    color: theme.color.onBrandSecondary,
    fontFamily: theme.font.text,
    fontSize: theme.scale.lg,
    fontWeight: "800",
  },
  printBtn: {
    flex: 1.3,
    backgroundColor: theme.color.brandPrimary,
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
  },
  printBtnText: {
    color: theme.color.onBrandPrimary,
    fontFamily: theme.font.text,
    fontSize: theme.scale.lg,
    fontWeight: "800",
  },
  toast: {
    position: "absolute",
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    bottom: 100,
    backgroundColor: theme.color.surfaceInverse,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  toastText: {
    flex: 1,
    color: theme.color.onSurfaceInverse,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
  },
});
